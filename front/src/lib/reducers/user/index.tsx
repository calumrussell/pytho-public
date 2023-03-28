import React, { createContext, useContext, useReducer } from 'react';

import { AntevortaTypes, PortfolioTypes } from '@Common/index';

type ACTIONTYPE =
  | { type: 'LOGIN', userKey: string }
  | { type: 'LOGOUT' }
  | { type: 'ADD_PLAN'; plan: AntevortaTypes.FinancialPlan, name: string }
  | { type: 'RMV_PLAN'; pos: number }
  | { type: 'ADD_PORTFOLIO'; asset: PortfolioTypes.Security, weight: number}
  | { type: 'RMV_PORTFOLIO'; idx: number }

interface FinancialPlanWrapper {
  name: string,
  plan: AntevortaTypes.FinancialPlan,
}

interface userState {
  isLoggedIn: boolean,
  user: string,
  plans: Array<FinancialPlanWrapper>,
  portfolio: PortfolioTypes.Portfolio,
}

const initialState: userState = {
  isLoggedIn: false,
  user: "",
  plans: [],
  portfolio: {
    assets: [],
    weights: [],
    isEmpty: true,
  }
}

const UserContext = createContext<userState>(initialState);
const UserDispatchContext = createContext<React.Dispatch<ACTIONTYPE>>(() => {});

const userReducer = (state: typeof initialState, action: ACTIONTYPE): typeof initialState => {
  switch(action.type) {
    case 'LOGIN':
      localStorage.setItem('userKey', action.userKey);
      return {
        ...state,
        isLoggedIn: true,
        user: action.userKey,
      }
    case 'LOGOUT':
      localStorage.removeItem('userKey');
      return {
        ...state,
        isLoggedIn: false,
        user: "",
      }
    case 'ADD_PLAN': {
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
    case 'RMV_PLAN': {
      const currPlans = [
        ...state.plans,
      ];
      currPlans.splice(action.pos, 1);

      return {
        ...state,
        plans: currPlans,
      };
    }
    case 'ADD_PORTFOLIO': {
      const newAssets = [
        action.asset,
        ...state.portfolio.assets,
      ];
      const newWeights = [
        action.weight,
        ...state.portfolio.weights,
      ];

      return {
        ...state,
        portfolio: {
          assets: newAssets, 
          weights: newWeights,
          isEmpty: false,
        },
      };
    }
    case 'RMV_PORTFOLIO':
      const copyAssets = [
        ...state.portfolio.assets,
      ];
      const copyWeights = [
        ...state.portfolio.weights,
      ];
      copyAssets.splice(action.idx, 1);
      copyWeights.splice(action.idx, 1);
      const isEmpty = copyAssets.length === 0;

      return {
        ...state,
        portfolio: {
          assets: copyAssets, 
          weights: copyWeights,
          isEmpty,
        },
      };
  }
}

interface UserProviderProps {
  children?: React.ReactNode,
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [results, dispatch] = useReducer(
    userReducer,
    initialState,
  )

  return (
    <UserContext.Provider value={results}>
      <UserDispatchContext.Provider value={dispatch}>
        {children}
      </UserDispatchContext.Provider>
    </UserContext.Provider>
  )
};

export const useUser = () => {
  return useContext(UserContext);
}

export const useUserDispatch = () => {
  return useContext(UserDispatchContext);
}