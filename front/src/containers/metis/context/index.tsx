import React, { createContext, useContext, useReducer } from 'react';

import { AntevortaTypes } from '@Common/index';

const initialState: AntevortaTypes.FinancialPlan = {
  flows: [
  ] as AntevortaTypes.Flow[],
  stacks: [
    {
      stack_type: AntevortaTypes.StackType.Gia,
      value: 0,
    },
    {
      stack_type: AntevortaTypes.StackType.Isa,
      value: 0,
    },
    {
      stack_type: AntevortaTypes.StackType.Sipp,
      value: 0,
    }
  ] as AntevortaTypes.Stack[],
  nic: AntevortaTypes.NicGroups.A,
  contribution_pct: 0.05,
  emergency_cash_min: 1000.0,
  starting_cash: 5000.0,
  lifetime_pension_contributions: 0.0,
};

type ACTIONTYPE =
  | { type: 'updateFlow'; flow: AntevortaTypes.Flow }
  | { type: 'updateStack'; stack: AntevortaTypes.Stack }
  | { type: 'updateVar'; name: string, value: number}
  | { type: 'removeFlow'; pos: number }
  | { type: 'removeStack'; pos: number }
  | { type: 'clearPlan'; }

const MetisContext = createContext<AntevortaTypes.FinancialPlan>(initialState);
const MetisDispatchContext = createContext<React.Dispatch<ACTIONTYPE>>(() => {});

const metisReducer = (
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
      const pos = AntevortaTypes.isPlanStackEqualType(state.stacks, action.stack);
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
        contribution_pct = "contribution_pct",
        lifetime_pension_contributions = "lifetime_pension_contributions",
        starting_cash = "starting_cash",
        emergency_cash_min = "emergency_cash_min",
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

interface MetisProviderProps {
  children?: React.ReactNode,
}

export const MetisProvider = ({ children }: MetisProviderProps) => {
  const [results, dispatch] = useReducer(
    metisReducer,
    initialState,
  )

  return (
    <MetisContext.Provider value={results}>
      <MetisDispatchContext.Provider value={dispatch}>
        {children}
      </MetisDispatchContext.Provider>
    </MetisContext.Provider>
  )
};

export const useMetis = () => {
  return useContext(MetisContext);
}

export const useMetisDispatch = () => {
  return useContext(MetisDispatchContext);
}
