import React from 'react';

import {
  FinancialPlan,
} from '../fplan';

interface FinancialPlanWrapper {
  name: string,
  plan: FinancialPlan,
}

interface PlanStore {
  plans: Array<FinancialPlanWrapper>,
}

const initialState: PlanStore = {
  plans: [
  ],
};

type ACTIONTYPE =
  | { type: 'addPlan'; plan: FinancialPlan, name: string }
  | { type: 'removePlan'; pos: number}

const reducer = (
    state: typeof initialState, action: ACTIONTYPE): typeof initialState => {
  switch (action.type) {
    case 'addPlan': {
      const newPlan = {
        name: action.name,
        plan: action.plan,
      };

      const currPlans = [
        ...state.plans,
        newPlan,
      ];

      return {
        ...state,
        plans: currPlans,
      };
    }
    case 'removePlan': {
      const currPlans = [
        ...state.plans,
      ];
      currPlans.splice(action.pos, 1);

      return {
        ...state,
        plans: currPlans,
      };
    }
  }
};

export interface PlanStoreContextInterface {
  state: PlanStore;
  dispatch: React.Dispatch<React.SetStateAction<ACTIONTYPE>>;
}

const PlanStoreContext =
  React.createContext<PlanStoreContextInterface| null>(null);

export const usePlanStore = () => {
  const context = React.useContext(PlanStoreContext);
  if (context != null) {
    const {
      state, dispatch,
    } = context;

    const addPlan = (name: string, plan: FinancialPlan) => dispatch({
      type: 'addPlan',
      name,
      plan,
    });

    const removePlan = (pos: number) => dispatch({
      type: 'removePlan',
      pos,
    });

    return {
      state,
      addPlan,
      removePlan,
    };
  }
};

export const PlanStoreProvider = (props: any) => {
  const [
    state,
    dispatch,
  ] = React.useReducer(reducer, initialState);

  return <PlanStoreContext.Provider
    value={
      {
        state,
        dispatch,
      }
    }
    { ...props } />;
};
