import React, { createContext, useReducer, useContext } from "react";

import { AntevortaRequestOutput } from "@Api/index";

interface AntevortaState {
  results: AntevortaRequestOutput | null,
}

const initialState: AntevortaState = {
  results: null,
};

const antevortaReducer = (
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

const AntevortaContext = createContext<AntevortaState>(initialState);
const AntevortaDispatchContext = createContext<React.Dispatch<ACTIONTYPE>>(() => {});

type ACTIONTYPE =
  | { type: 'addResults'; results: AntevortaRequestOutput }
  | { type: 'clearResults'; }

interface AntevortaProviderProps {
  children?: React.ReactNode,
}

export const AntevortaProvider = ({ children }: AntevortaProviderProps) => {
  const [results, dispatch] = useReducer(
    antevortaReducer,
    initialState,
  )

  return (
    <AntevortaContext.Provider value={results}>
      <AntevortaDispatchContext.Provider value={dispatch}>
        {children}
      </AntevortaDispatchContext.Provider>
    </AntevortaContext.Provider>
  )
};

export const useAntevorta = () => {
  return useContext(AntevortaContext);
}

export const useAntevortaDispatch = () => {
  return useContext(AntevortaDispatchContext);
}
