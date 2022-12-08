import React from 'react';

import {
  Loader,
} from '@Components/loader';

const initialState = {
  isLoading: false,
};

const actionTypes = {
  setLoader: 'SET_LOADER',
};

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.setLoader:
      return {
        ...state,
        isLoading: action.loading,
      };
    default:
      throw Error('Action type not supported');
  }
};

const LoaderContext = React.createContext();

export const useLoader = () => {
  const context = React.useContext(LoaderContext);
  const {
    state, dispatch,
  } = context;

  const toggleLoader = () => {
    dispatch({
      type: 'SET_LOADER',
      loading: true,
    });
    return () => dispatch({
      type: 'SET_LOADER',
      loading: false,
    });
  };

  const LoaderCondition = (props) => {
    return (
      state.isLoading ?
        <Loader /> :
        null
    );
  };

  const renderLoader = () => (props) => <LoaderCondition //eslint-disable-line
    { ...props } />;

  return {
    state,
    toggleLoader,
    renderLoader,
  };
};

export const LoaderProvider = (props) => {
  const [
    state,
    dispatch,
  ] = React.useReducer(reducer, initialState);
  return <LoaderContext.Provider
    value={
      {
        state,
        dispatch,
      }
    }
    { ...props } />;
};
