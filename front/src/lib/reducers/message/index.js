import React from 'react';

const initialState = {
  message: '',
  messageType: '',
};

const actionTypes = {
  show: 'SHOW',
  clear: 'CLEAR',
};

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.show:
      return {
        message: action.message,
        messageType: action.messageType,
      };

    case actionTypes.clear:
      return {
        message: '',
        messageType: '',
      };

    default:
      new Error('Unknown action type');
  }
};

const MessageContext = React.createContext();

export const useMessage = () => {
  const context = React.useContext(MessageContext);
  const {
    state, dispatch,
  } = context;

  const clearMessage = () => dispatch({
    type: 'CLEAR',
  });

  const successMessage = (message) => {
    dispatch({
      type: 'SHOW',
      message,
      messageType: 'SUCCESS',
    });
    setTimeout(clearMessage, 4000);
  };
  const errorMessage = (message) => {
    dispatch({
      type: 'SHOW',
      message,
      messageType: 'ERROR',
    });
    setTimeout(clearMessage, 4000);
  };

  return {
    state,
    successMessage,
    errorMessage,
    clearMessage,
  };
};

export const MessageProvider = (props) => {
  const [
    state,
    dispatch,
  ] = React.useReducer(reducer, initialState);
  return <MessageContext.Provider
    value={
      {
        state,
        dispatch,
      }
    }
    { ...props } />;
};
