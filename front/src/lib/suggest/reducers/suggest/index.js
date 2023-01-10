import React from 'react';

import { request } from '@Common';

const initialStateSearch = {
  value: undefined,
  hasSelected: false,
  input: '',
  options: [
  ],
  requestController: undefined,
};

const actionTypesSearch = {
  selectValue: 'SELECT',
  clearInput: 'CLEAR_IN',
  clearOptions: 'CLEAR_OPT',
  updateInput: 'UPDATE_IN',
  updateOptions: 'UPDATE_OPT',
  clearRequest: 'CLEAR_REQUEST',
  startRequest: 'START_REQUEST',
};

const searchReducer = (state, action) => {
  switch (action.type) {
    case actionTypesSearch.clearOptions: {
      return {
        ...state,
        options: [
        ],
      };
    }

    case actionTypesSearch.updateOptions: {
      // Only update if the results are for the input
      // that is currently
      if (action.input == state.input) {
        return {
          ...state,
          options: action.options,
        };
      } else {
        return {
          ...state,
        };
      }
    }

    case actionTypesSearch.updateInput: {
      return {
        ...state,
        input: action.input,
      };
    }

    case actionTypesSearch.clearInput: {
      return {
        ...state,
        input: '',
        hasSelected: false,
        value: undefined,
      };
    }

    case actionTypesSearch.selectValue: {
      return {
        ...state,
        hasSelected: true,
        value: action.value,
      };
    }

    case actionTypesSearch.clearRequest: {
      return {
        ...state,
        controller: undefined,
      }
    }

    case actionTypesSearch.startRequest: {
      return {
        ...state,
        controller: action.controller,
      }
    }

    default:
      new Error('Unknown action type');
  }
};

const SuggestContext = React.createContext();

export const useSuggest = () => {
  const context = React.useContext(SuggestContext);

  const {
    state, dispatch,
  } = context;

  const updateInput = (input) => {
    dispatch({
      type: 'UPDATE_IN',
      input: input,
    });
  };

  const clearOptions = () =>
    dispatch({
      type: 'CLEAR_OPT',
    });

  const clearInput = () =>
    dispatch({
      type: 'CLEAR_IN',
    });

  const updateOptions = (coverage, value) =>
    dispatch({
      type: 'UPDATE_OPT',
      options: coverage,
      input: value,
    });

  const getOptions = ({
    value, reason, url,
  }) => {
    //If request is already in progress, then we cancel it
    if (state.controller) {
      // If request is running when user inputs new value
      // we cancel running request
      state.controller.abort();
      dispatch({
        type: 'CLEAR_REQUEST',
      });
    }

    const controller = new AbortController();
    dispatch({
      type: 'START_REQUEST',
      controller,
    });

    request(url)
      .get(controller)
      .then((res) => res.data)
      .then((res) => updateOptions(res.data, value))
      //We don't do anything here because this request can be aborted
      .catch((_err) => null);
  };

  const selectValue = (value) =>
    dispatch({
      type: 'SELECT',
      value,
    });

  return {
    state,
    updateInput,
    clearInput,
    clearOptions,
    getOptions,
    selectValue,
  };
};

export const SuggestProvider = (props) => {
  const [
    state,
    dispatch,
  ] = React.useReducer(searchReducer, initialStateSearch);

  return <SuggestContext.Provider
    value={
      {
        state,
        dispatch,
      }
    }
    { ...props } />;
};
