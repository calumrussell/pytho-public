import React from 'react';

import {
  request
} from '@Common/index';
import { FinancialPlan, PlanStack, StackType } from '@Components/reducers/fplan';
import { AxiosError } from 'axios';

export interface SimRequestInput {
  runs: number,
  sim_config: FinancialPlan,
  sim_length: number,
  assets: Array<number>,
  weights: Array<number>
}

// Before we send this to server, we perform some error-checking. This is
// partially replicated on the server but we perform part of the same checks.
// Values are controlled through form attributes, so we are checking for logic
// internal to the simulation.
const errorChecker = (state: SimRequestInput): Promise<boolean> => {

  const isInvestmentAccount = (stack_type: StackType) =>
    stack_type == 'Isa' || stack_type == 'Gia' || stack_type == 'Sipp';

  const investmentAccountCount = state.sim_config.stacks.filter((stack: PlanStack) =>
    isInvestmentAccount(stack.stack_type)).length;

  // If we have all three, and no other stacks then it is 3-0=3
  // If we have two, and no other stacks then it is 2-0=2
  // If we have all three, and one other stack then it is 4-1=3
  // If we have two, and one other stack then it is 3-1=2
  // We can have more than one of each type of investment account too, so we
  // need to test for 3 or more
  if (investmentAccountCount < 2) {
    return Promise.reject('Must have at least one ISA, GIA, and SIPP');
  }
  return Promise.resolve(true);
};

interface AntevortaResultsOutput {
  runs: number,
  values: Array<number>,
}

interface AntevortaState {
  results: AntevortaResultsOutput | null,
}

const initialState: AntevortaState = {
  results: null,
};

type ACTIONTYPE =
  | { type: 'addResults'; results: AntevortaResultsOutput }
  | { type: 'clearResults'; }

const reducer = (
    state: typeof initialState, action: ACTIONTYPE): typeof initialState => {
  switch (action.type) {
    case 'clearResults': {
      return initialState;
    }
    case 'addResults': {
      return {
        results: action.results,
      }
    }
  }
};

export interface AntevortaContextInterface {
  state: AntevortaState;
  dispatch: React.Dispatch<React.SetStateAction<ACTIONTYPE>>;
}

const AntevortaContext = React.createContext<AntevortaContextInterface| null>(null);

export const useAntevorta = () => {
  const context = React.useContext(AntevortaContext);
  if (context != null) {
    const {
      state, dispatch,
    } = context;
 
    //Assumes that input is correct
    const simRequest = (input: SimRequestInput, runs: number, errFunc: (err: AxiosError) => void, finallyFunc: () => void) => {
      errorChecker(input)
        .then(() => {
          if (state.results != null) {
            //Clear results if they already exist
            dispatch({type: "clearResults"});
          }

          //convert sim_config property to string
          let sim_config_str = JSON.stringify(input.sim_config);

          request(`/incomesim`).post({ ...input, sim_config: sim_config_str })
            .then((res) => res.data)
            .then((res) => {
              const formattedResults = {
                runs,
                values: res.data.values,
              };
              dispatch({type: 'addResults', results: formattedResults});
            })
            .catch(errFunc)
            .finally(finallyFunc);
        })
        .catch((err) => errFunc(err))
    };

    return {
      state,
      simRequest,
    };
  }
};

export const AntevortaProvider = (props: any) => {
  const [
    state,
    dispatch,
  ] = React.useReducer(reducer, initialState);

  return <AntevortaContext.Provider
    value={
      {
        state,
        dispatch,
      }
    }
    { ...props } />;
};
