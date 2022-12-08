import React from 'react';
import axios from 'axios';

import { request } from '@Common';

import {
  PortfolioPerformance,
} from '@Components/portfolio';
import {
  useMessage,
} from '@Components/reducers/message';

const initialState = {
  results: null,
};

const actionTypes = {
  addResults: 'ADD_RES',
  clearResults: 'CLEAR_RES',
};

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.addResults:
      return {
        ...state,
        results: action.results,
      };
    case actionTypes.clearResults:
      return {
        ...state,
        results: null,
      };
    default:
      throw Error('Action type not supported');
  }
};

const BacktestContext = React.createContext();

export const useBacktest = () => {
  const context = React.useContext(BacktestContext);
  const {
    state, dispatch,
  } = context;

  const {
    errorMessage,
  } = useMessage();

  const runBacktest = (portJson, finallyFunc) => {
    if (state.results) {
      dispatch({
        type: 'CLEAR_RES',
      });
    }

    return request(`/backtest`)
      .post({...portJson})
      .then((res) => res.data)
      .then((results) => dispatch({
        type: 'ADD_RES',
        results: results.data,
      }))
      .catch((err) => {
        if (err.response) {
          errorMessage(err.response.data.message);
        }
      })
      .finally(finallyFunc);
  };

  const renderResults = () => {
    return (
      <div>
        <PortfolioPerformance
          results={ state.results } />
      </div>
    );
  };

  return {
    state,
    runBacktest,
    renderResults,
  };
};

export const BacktestProvider = (props) => {
  const [
    state,
    dispatch,
  ] = React.useReducer(reducer, initialState);
  return <BacktestContext.Provider
    value={
      {
        state,
        dispatch,
      }
    }
    { ...props } />;
};
