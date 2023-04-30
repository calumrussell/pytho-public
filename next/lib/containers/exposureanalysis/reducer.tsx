import { PortfolioTypes } from "@Common/index";

export interface RiskAnalysisState {
  independents: PortfolioTypes.Security[];
  dependent: PortfolioTypes.Security | null;
  searchInput: string | null;
}

export const initialState: RiskAnalysisState = {
  independents: [],
  dependent: null,
  searchInput: null,
};

export type ACTIONTYPE =
  | { type: "ADD_DEP"; security: PortfolioTypes.Security }
  | { type: "ADD_IND"; security: PortfolioTypes.Security }
  | { type: "DEL_DEP" }
  | { type: "DEL_IND"; idx: number };

export const reducer = (
  state: typeof initialState,
  action: ACTIONTYPE
): typeof initialState => {
  switch (action.type) {
    case "ADD_DEP": {
      return {
        ...state,
        dependent: action.security,
        searchInput: null,
      };
    }

    case "ADD_IND": {
      const copyInds = [action.security, ...state.independents];
      return {
        ...state,
        independents: copyInds,
        searchInput: null,
      };
    }

    case "DEL_DEP": {
      return {
        ...state,
        dependent: null,
      };
    }

    case "DEL_IND": {
      const copyInds = [...state.independents];
      copyInds.splice(action.idx, 1);
      return {
        ...state,
        independents: copyInds,
      };
    }

    default:
      new Error("Unknown action type");
      return state;
  }
};
