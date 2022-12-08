import React from 'react';
import axios from 'axios';

import {
  useMessage,
} from '@Components/reducers/message';

const initialState = {
  isLoggedIn: false,
  // Should only have two states, undefined or a valid key
  user: undefined,
  // This was developed at different times so the portfolios state is not
  // shared with the server, only within the app, other state depends on server
  portfolios: {},
};

const actionTypes = {
  savePortfolio: 'SAVE_PORTFOLIO',
  loginUser: 'LOGIN_USER',
  logoutUser: 'LOGOUT_USER',
  expiredUser: 'EXP_USER',
};

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.loginUser: {
      localStorage.setItem('userKey', action.userKey);
      return {
        ...state,
        isLoggedIn: true,
        user: action.userKey,
      };
    }
    case actionTypes.logoutUser: {
      // When the user logs out, we need to remove the key altogether
      localStorage.removeItem('userKey');
      return {
        ...state,
        isLoggedIn: false,
        user: undefined,
      };
    }
    case actionTypes.savePortfolio: {
      const portCopy = action.portfolio.getCopy();
      const copy = {
        ...state.portfolios,
      };
      copy[action.name] = portCopy;
      return {
        ...state,
        portfolios: copy,
      };
    }
    default:
      new Error('Unknown action type');
  }
};

const UserContext = React.createContext();

export const useUser = () => {
  const context = React.useContext(UserContext);
  const {
    state, dispatch,
  } = context;
  const {
    errorMessage,
    successMessage,
  } = useMessage();

  const savePortfolio = (portfolio, name) => {
    if (name in state.portfolios) {
      successMessage('Overwriting portfolio');
    }
    dispatch({
      type: 'SAVE_PORTFOLIO',
      portfolio,
      name,
    });
  };

  const getPortfolioByName = (name) => state.portfolios[name];
  const getPortfolioNames = () => Object.keys(state.portfolios);
  const userHasPortfolios = () => getPortfolioNames().length > 0;

  const loginUserDispatcher = (userKey) => {
    dispatch({
      type: 'LOGIN_USER',
      userKey,
    });
  };

  const logoutUserDispatcher = () => {
    dispatch({
      type: 'LOGOUT_USER',
    });
  };

  const errorDispatcher = (err) => {
    if (err.response.status == 401) {
      if (state.isLoggedIn) {
        logoutUserDispatcher();
      }
    }
    errorMessage(err.response.data.message);
  };

  const checkUser = () => {
    const userKey = localStorage.getItem('userKey');
    // The user has a key saved in localStorage but isn't logged in, so we need
    // to see if the user has an active session on the server
    // This can happen if the user does a hard refresh and the state in the
    // reducer gets reset, whilst the browser state stays the same
    if (userKey != undefined && !state.isLoggedIn) {
      axios.get(process.env.API_URL + '/login')
          .then((res) => res.data)
          .then((res) => loginUserDispatcher(res.userKey))
          // Fail silently, and remove the bad key
          .catch((err) => localStorage.removeItem('userKey'));
    }
  };

  const createUser = () => {
    axios.get(process.env.API_URL + '/create')
        .then((res) => res.data)
        .then((res) => loginUserDispatcher(res.userKey))
        .catch((err) => errorDispatcher(err));
  };

  const loginUser = (userKey) => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const requestInput = {
      'userKey': userKey,
    };
    axios.post(process.env.API_URL + '/login', requestInput, {
      headers: headers,
    })
        .then((res) => res.data)
        .then((res) => loginUserDispatcher(userKey))
        .catch((err) => errorDispatcher(err));
  };

  const logoutUser = () => {
    axios.get(process.env.API_URL + '/logout')
        .then((res) => res.data)
        .then((res) => logoutUserDispatcher())
        .catch((err) => errorDispatcher(err));
  };

  const loggedInHoc = (Component) => {
    const Inner = (props) => {
      if (state.isLoggedIn) {
        return <Component
          { ...props } />;
      }
      return null;
    };
    Inner.displayName = 'LoggedInHoc';
    return Inner;
  };

  const loggedOutHoc = (Component) => {
    const Inner = (props) => {
      if (!state.isLoggedIn) {
        return <Component
          { ...props } />;
      }
      return null;
    };
    Inner.displayName = 'LoggedOutHoc';
    return Inner;
  };

  return {
    state,
    getPortfolioByName,
    getPortfolioNames,
    userHasPortfolios,
    savePortfolio,
    checkUser,
    createUser,
    loginUser,
    logoutUser,
    loggedInHoc,
    loggedOutHoc,
  };
};

export const UserProvider = (props) => {
  const [
    state,
    dispatch,
  ] = React.useReducer(reducer, initialState);
  return <UserContext.Provider
    value={
      {
        state,
        dispatch,
      }
    }
    { ...props } />;
};
