import zip from "lodash.zip";

import { AntevortaTypes, Operations } from "@Common/index";

// Every update of the state is error-checked, if the update will move
// the state into an invalid position, then we fail and return an error.
// These checks are not repeated on the front-end but are repeated on the
// back-end. We also have value controls through form attrs, so we are checking
// for logic internal to the simulation.
const errorChecker = (state: IncomeSimState): void => {
  const isInvestmentAccount = (stack_type: AntevortaTypes.StackType) =>
    stack_type == "Isa" || stack_type == "Gia" || stack_type == "Sipp";

  if (state.simConfig === null) {
    // This is unusual error condition, simConfig starts as null but is initialized once the user
    // selects a financial plan. Once this happens, the user can only switch to another existing
    // financial plan, there is no way to move back to null but we have to check for this condition
    // for completeness and the possibility that this option is introduced later.
    throw Error("Must select financial plan");
  }

  const investmentAccountCount = state.simConfig.stacks.filter(
    (stack: AntevortaTypes.Stack) => isInvestmentAccount(stack.stack_type)
  ).length;

  // If we have all three, and no other stacks then it is 3-0=3
  // If we have two, and no other stacks then it is 2-0=2
  // If we have all three, and one other stack then it is 4-1=3
  // If we have two, and one other stack then it is 3-1=2
  // We can have more than one of each type of investment account too, so we
  // need to test for 3 or more
  if (investmentAccountCount < 2) {
    throw Error("Must have at least one ISA, GIA, and SIPP");
  }
};

export const convertStateToSnakeCase = (state: IncomeSimState) => () => ({
  sim_config: JSON.stringify(state.simConfig),
  runs: state.runs,
  sim_length: state.simLength,
  inflation_mu: state.inflationMu / 100.0,
  inflation_var: state.inflationVar / 100.0,
  start_date: new Date(state.startDate).getTime() / 1000,
});

interface Results {
  gross_income: number[][];
  net_income: number[][];
  tax_paid: number[][];
  contribution: number[][];
  expense: number[][];
  total_end_value: Array<number>;
  returns: number[][];
  investment_dates: Array<number>;
  investment_values: number[][];
  years: Array<number>;
  averages: Array<{
    net_income: number;
    taxes_paid: number;
    contributions: number;
    expenses: number;
  }>;
  after_tax_avg: Array<number>;
  antevorta: AntevortaTypes.AntevortaRequestOutput;
}

export const parseAntevortaResults =
  (state: IncomeSimState) =>
  (antevorta: AntevortaTypes.AntevortaRequestOutput): Results => {
    const { results } = antevorta;

    const gross_income = new Array();
    const net_income = new Array();
    const tax_paid = new Array();
    const contribution = new Array();
    const expense = new Array();
    const total_end_value = new Array();
    const returns = new Array();
    const investment_dates = results[0].returns_dates;
    const investment_values = new Array();

    results.map((result) => {
      gross_income.push(result.gross_income);
      net_income.push(result.net_income);
      tax_paid.push(result.tax_paid);
      contribution.push(result.sipp_contributions);
      expense.push(result.expense);
      total_end_value.push(
        result.values[result.values.length - 1] +
          result.cash[result.cash.length - 1]
      );
      investment_values.push(result.values);

      //shallow
      let rets_copy = [...result.returns];
      rets_copy.unshift(0);
      returns.push(rets_copy);
    });

    const calc_avg = (values: Array<Array<number>>) =>
      Operations.transpose(values).map(Operations.average);

    const gross_income_avg = calc_avg(gross_income);
    const tax_paid_avg = calc_avg(tax_paid);
    const contribution_avg = calc_avg(contribution);
    const expense_avg = calc_avg(expense);

    const years = Array.from(Array(gross_income_avg.length).keys());

    const after_tax_avg = zip(
      gross_income_avg,
      tax_paid_avg,
      contribution_avg,
      expense_avg
    ).map((v: any) => v[0] - v[1] - v[2] - v[3]);

    const averages = years.map((i) => ({
      net_income: after_tax_avg[i],
      taxes_paid: tax_paid_avg[i],
      contributions: contribution_avg[i],
      expenses: expense_avg[i],
    }));

    return {
      gross_income,
      net_income,
      tax_paid,
      contribution,
      expense,
      total_end_value,
      investment_values,
      investment_dates,
      years,
      averages,
      after_tax_avg,
      returns,
      antevorta,
    };
  };

export interface IncomeSimState {
  simConfig: AntevortaTypes.FinancialPlan | null;
  runs: number;
  simLength: number;
  inflationMu: number;
  inflationVar: number;
  disabledState: boolean;
  startDate: string;
  results: Results | null;
  [idx: string]: any;
}

export const initialState: IncomeSimState = {
  runs: 5,
  simLength: 5,
  inflationMu: 2,
  inflationVar: 2,
  disabledState: false,
  startDate: new Date().toISOString().split("T")[0],
  results: null,
  simConfig: null,
};

export type ACTIONTYPE =
  | { type: "UPDATE"; name: string; value: any }
  | { type: "CLR_RESULTS" }
  | { type: "ADD_RESULTS"; results: AntevortaTypes.AntevortaRequestOutput }
  | { type: "CLR_CONFIG" };

export const reducer = (
  state: typeof initialState,
  action: ACTIONTYPE
): typeof initialState => {
  switch (action.type) {
    case "UPDATE": {
      const copy = { ...state };
      copy[action.name] = action.value;

      try {
        errorChecker(copy);
        return {
          ...copy,
        };
      } catch (e) {
        return {
          ...state,
        };
      }
    }
    case "CLR_RESULTS": {
      return {
        ...state,
        results: null,
      };
    }
    case "ADD_RESULTS": {
      const results = parseAntevortaResults(state)(action.results);
      return {
        ...state,
        results,
      };
    }
    case "CLR_CONFIG": {
      return {
        ...state,
        simConfig: null,
      };
    }
  }
};
