import React from 'react';
import styled from 'styled-components';
import zip from 'lodash.zip';

import {
  CancelIcon,
  Text,
  DefaultHorizontalSpacer,
} from '@Common';

const initialState = {
  assets: [
  ],
  weights: [
  ],
  isEmpty: true,
};

const actionTypes = {
  addToPortfolio: 'ADD',
  removeFromPortfolio: 'REMOVE',
  loadPortfolio: 'LOAD',
};

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.addToPortfolio: {
      const newAssets = [
        action.asset,
        ...state.assets,
      ];
      const newWeights = [
        action.weight,
        ...state.weights,
      ];

      return {
        ...state,
        assets: newAssets,
        weights: newWeights,
        isEmpty: false,
      };
    }
    case actionTypes.removeFromPortfolio:
      const copyAssets = [
        ...state.assets,
      ];
      const copyWeights = [
        ...state.weights,
      ];
      copyAssets.splice(action.index, 1);
      copyWeights.splice(action.index, 1);
      const isEmpty = copyAssets.length === 0;

      return {
        ...state,
        assets: copyAssets,
        weights: copyWeights,
        isEmpty,
      };
    case actionTypes.loadPortfolio:
      return {
        ...state,
        assets: action.assets,
        weights: action.weights,
        portfolio: newPortCopy,
        isEmpty: action.assets.length === 0,
      };
    default:
      new Error('Unknown action type');
  }
};

const PortfolioContext = React.createContext();

const RowSpacer = styled(DefaultHorizontalSpacer)`
  display: flex;
  align-items: center;

  > * {
    &:first-child {
      padding-right: 0.5rem;
      cursor: pointer;
    }
    &:nth-child(2) {
      padding-right: 0.5rem;
    }
  }
`;

export const usePortfolio = () => {
  const context = React.useContext(PortfolioContext);
  const {
    state, dispatch,
  } = context;

  const addToPortfolio = (asset, weight) => dispatch({
    type: 'ADD',
    asset,
    weight,
  });

  const removeFromPortfolio = (index) => dispatch({
    type: 'REMOVE',
    index,
  });

  const loadPortfolioFromUser = (assets, weights) => dispatch({
    type: 'LOAD_PORTFOLIO',
    assets,
    weights,
  });

  const displayPortfolio = () => {
    const PortfolioDisplay = (props) => {
      if (!state.isEmpty) {
        const zipped = zip(state.assets, state.weights);
        return (
          <>
            {
              zipped.map((data, idx) => {
                const removeFunc = (ev) => {
                  ev.preventDefault();
                  removeFromPortfolio(idx);
                };
                return (
                  <React.Fragment
                    key={ data[0].id }>
                    <RowSpacer>
                      <CancelIcon
                        data-testid="backtest-removeassetbutton"
                        onClick={ removeFunc } />
                      <Text
                        small>
                        {`${data[1]} %`}
                      </Text>
                      <Text>
                        {data[0].name}
                      </Text>
                    </RowSpacer>
                  </React.Fragment>
                );
              })
            }
          </>
        );
      } else {
        return <></>;
      }
    };
    return PortfolioDisplay;
  };

  const jsonPortfolio = () => ({
    'assets': state.assets.map((i) => parseInt(i.id)),
    'weights': state.weights.map((i) => parseInt(i)/100),
  });

  return {
    state,
    displayPortfolio,
    loadPortfolioFromUser,
    addToPortfolio,
    removeFromPortfolio,
    jsonPortfolio,
  };
};

export const PortfolioProvider = (props) => {
  const [
    state,
    dispatch,
  ] = React.useReducer(reducer, initialState);
  return <PortfolioContext.Provider
    value={
      {
        state,
        dispatch,
      }
    }
    { ...props } />;
};

