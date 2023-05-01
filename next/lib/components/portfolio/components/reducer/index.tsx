import { PortfolioTypes } from "@Common/index";

export interface PortfolioState {
  assets: Array<PortfolioTypes.Security>;
  weights: Array<number>;
}

export const initialState: PortfolioState = {
  assets: [],
  weights: [],
};

export const portfolioStateToJson = (state: typeof initialState) => () => ({
  assets: state.assets.map((i) => i.id),
  weights: state.weights.map((i) => i / 100),
});

export type ACTIONTYPE =
  | { type: "ADD_SECURITY"; asset: PortfolioTypes.Security; weight: number }
  | { type: "RMV_SECURITY"; pos: number }
  | { type: "CLR" };

export const reducer = (
  state: typeof initialState,
  action: ACTIONTYPE
): typeof initialState => {
  switch (action.type) {
    case "ADD_SECURITY": {
      const copyAssets = [...state.assets, action.asset];
      const copyWeights = [...state.weights, action.weight];
      return {
        ...state,
        assets: copyAssets,
        weights: copyWeights,
      };
    }
    case "RMV_SECURITY": {
      const copyAssets = [...state.assets];
      copyAssets.splice(action.pos, 1);

      const copyWeights = [...state.weights];
      copyWeights.splice(action.pos, 1);

      return {
        ...state,
        assets: copyAssets,
        weights: copyWeights,
      };
    }
    case "CLR": {
      return {
        ...state,
        assets: [],
        weights: [],
      };
    }
  }
};
