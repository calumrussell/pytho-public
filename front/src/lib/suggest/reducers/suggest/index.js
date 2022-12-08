import React from 'react';
import axios from 'axios';

import { request } from '@Common';

const initialStateSearch = {
  value: undefined,
  hasSelected: false,
  input: '',
  options: [
  ],
};

const actionTypesSearch = {
  selectValue: 'SELECT',
  clearInput: 'CLEAR_IN',
  clearOptions: 'CLEAR_OPT',
  updateInput: 'UPDATE_IN',
  updateOptions: 'UPDATE_OPT',
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

    default:
      new Error('Unknown action type');
  }
};

const initialStateRequest = {
  controller: undefined,
};

const actionTypesRequest = {
  requestStart: 'SRT',
  requestClear: 'CLR',
};

const requestReducer = (state, action) => {
  switch (action.type) {
    case actionTypesRequest.requestStart: {
      return {
        ...state,
        requestController: action.controller,
      };
    }

    case actionTypesRequest.requestClear: {
      return {
        ...state,
        requestController: undefined,
      };
    }

    default:
      new Error('Unknown action type');
  }
};

const SuggestContext = React.createContext();

export const useSuggest = () => {
  const context = React.useContext(SuggestContext);

  const {
    searchState, searchDispatch, requestState, requestDispatch,
  } = context;

  const updateInput = (input) => {
    if (requestState.controller) {
      // If request is running when user inputs new value
      // we cancel running request
      requestState.controller.abort();
      requestDispatch({
        type: 'CLR',
      });
    }

    searchDispatch({
      type: 'UPDATE_IN',
      input: input,
    });
  };

  const clearOptions = () =>
    searchDispatch({
      type: 'CLEAR_OPT',
    });

  const clearInput = () =>
    searchDispatch({
      type: 'CLEAR_IN',
    });

  const updateOptions = (coverage, value) =>
    searchDispatch({
      type: 'UPDATE_OPT',
      options: coverage,
      input: value,
    });

  const getOptions = ({
    value, reason, url,
  }) => {
    const controller = new AbortController();

    requestDispatch({
      type: 'SRT',
      controller,
    });

    request(url)
      .get(controller)
      .then((res) => res.data)
      .then((res) => updateOptions(res.data, value));
  };

  const selectValue = (value) =>
    searchDispatch({
      type: 'SELECT',
      value,
    });

  return {
    searchState,
    updateInput,
    clearInput,
    clearOptions,
    getOptions,
    selectValue,
  };
};

export const SuggestProvider = (props) => {
  const [
    searchState,
    searchDispatch,
  ] = React.useReducer(searchReducer, initialStateSearch);
  const [
    requestState,
    requestDispatch,
  ] = React.useReducer(requestReducer, initialStateRequest);

  return <SuggestContext.Provider
    value={
      {
        searchState,
        searchDispatch,
        requestState,
        requestDispatch,
      }
    }
    { ...props } />;
};
