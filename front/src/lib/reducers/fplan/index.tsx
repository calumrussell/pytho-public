import React from 'react';

export enum ScheduleType {
  EndOfMonth = "EndOfMonth",
}

interface Schedule {
  schedule_type: ScheduleType;
}

export enum FlowType {
  Employment = 'Employment',
  EmploymentPAYE = 'EmploymentPAYE',
  EmploymentStaticGrowth = 'EmploymentStaticGrowth',
  EmploymentPAYEStaticGrowth = 'EmploymentPAYEStaticGrowth',
  Rental = 'Rental',
  Expense = 'Expense',
  PctOfIncomeExpense = 'PctOfIncomeExpense',
  InflationLinkedExpense = 'InflationLinkedExpense',
}

export interface PlanFlow {
  flow_type: FlowType;
  // Currently hardcoded to zero
  person: number;
  value?: number;
  static_growth?: number;
  pct?: number;
  // This is hardcoded to EndOfMonth
  schedule: Schedule;
}

export enum StackType {
  Isa = 'Isa',
  Sipp = 'Sipp',
  Gia = 'Gia',
  Mortgage = 'Mortgage',
}

export interface PlanStack {
  stack_type: StackType;
  person: number;
  value: number;
  rate?: number;
  term?: number;
  fix_length?: number;
}

const isPlanStackEqualType = (
    existing: Array<PlanStack>,
    cand: PlanStack,
): number => {
  let count = 0;
  for (const plan of existing) {
    if (plan.stack_type === cand.stack_type) {
      return count;
    }
    count++;
  }
  return -1;
};

// Only support A
enum NicGroups {
  A = "A",
}

// Use snake_case because this will go directly into Python
export interface FinancialPlan {
  flows: Array<PlanFlow>,
  stacks: Array<PlanStack>,
  nic: NicGroups,
  contribution_pct: number,
  emergency_cash_min: number,
  starting_cash: number,
  lifetime_pension_contributions: number,
}

const initialState: FinancialPlan = {
  flows: [
  ] as PlanFlow[],
  stacks: [
    {
      stack_type: StackType.Gia,
      value: 0,
    },
    {
      stack_type: StackType.Isa,
      value: 0,
    },
    {
      stack_type: StackType.Sipp,
      value: 0,
    }
  ] as PlanStack[],
  nic: NicGroups.A,
  contribution_pct: 0.05,
  emergency_cash_min: 1000.0,
  starting_cash: 5000.0,
  lifetime_pension_contributions: 0.0,
};

type ACTIONTYPE =
  | { type: 'updateFlow'; flow: PlanFlow }
  | { type: 'updateStack'; stack: PlanStack }
  | { type: 'updateVar'; name: string, value: number}
  | { type: 'removeFlow'; pos: number }
  | { type: 'removeStack'; pos: number }
  | { type: 'clearPlan'; }

const reducer = (
    state: typeof initialState, action: ACTIONTYPE): typeof initialState => {
  switch (action.type) {
    case 'updateFlow': {
      return {
        ...state,
        flows: [
          action.flow,
          ...state.flows,
        ],
      };
    }
    case 'updateStack': {
      // User cannot hold multiple accounts of the same type, this is enforced
      // on the server as well
      const pos = isPlanStackEqualType(state.stacks, action.stack);
      // If the stack is unique
      if (pos === -1) {
        return {
          ...state,
          stacks: [
            ...state.stacks,
            action.stack,
          ],
        };
      } else {
        const copy = [
          ...state.stacks,
        ];

        copy.splice(pos, 1);
        return {
          ...state,
          stacks: [
            ...copy,
            action.stack,
          ],
        };
      }
    }
    case 'updateVar': {
      enum validOptions {
        contribution_pct = 'contribution_pct',
        emergency_cash_min = 'emergency_cash_min',
        starting_cash = 'starting_cash',
        lifetime_pension_contributions = 'lifetime_pension_contributions',
      }

      if (action.name in validOptions) {
        const existingState = {
          ...state,
        };
        existingState[action.name as keyof typeof validOptions] = action.value;
        return existingState;
      }
      return state;
    }
    case 'removeFlow': {
      const copy = [
        ...state.flows,
      ];

      copy.splice(action.pos, 1);
      return {
        ...state,
        flows: copy,
      };
    }
    case 'removeStack': {
      const copy = [
        ...state.stacks,
      ];
      copy.splice(action.pos, 1);
      return {
        ...state,
        stacks: copy,
      };
    }
    case 'clearPlan': {
      return initialState;
    }
  }
};

export interface FPlanContextInterface {
  state: FinancialPlan;
  dispatch: React.Dispatch<React.SetStateAction<ACTIONTYPE>>;
}

const FPlanContext = React.createContext<FPlanContextInterface | null>(null);

export const useFPlan = () => {
  const context = React.useContext(FPlanContext);
  if (context != null) {
    const {
      state, dispatch,
    } = context;

    const updateFlow = (flow: PlanFlow) => dispatch({
      type: 'updateFlow',
      flow,
    });

    const updateStack = (stack: PlanStack) => dispatch({
      type: 'updateStack',
      stack,
    });

    const updateVar = (name: string, value: number) => dispatch({
      type: 'updateVar',
      name,
      value,
    });

    const removeFlow = (pos: number) => dispatch({
      type: 'removeFlow',
      pos,
    });

    const removeStack = (pos: number) => dispatch({
      type: 'removeStack',
      pos,
    });

    const clearPlan = () => dispatch({
      type: 'clearPlan',
    });

    return {
      state,
      updateFlow,
      updateStack,
      updateVar,
      removeFlow,
      removeStack,
      clearPlan,
    };
  }
};

export const FPlanProvider = (props: any) => {
  const [
    state,
    dispatch,
  ] = React.useReducer(reducer, initialState);

  return <FPlanContext.Provider
    value={
      {
        state,
        dispatch,
      }
    }
    { ...props } />;
};
