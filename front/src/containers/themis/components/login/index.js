import React, {
  useState,
} from 'react';

import {
  FormWrapper,
  FormLabel,
  FormInput,
} from '@Components/form';
import {
  Button,
} from '@Common';
import {
  useUserDispatch,
} from '@Components/reducers/user';
import {
  useMessage
} from '@Components/reducers/message';
import { loginUser } from '@Api/user';

export const LoginForm = (props) => {
  const [
    userKey,
    setUserKey,
  ] = useState('');

  const {
    errorMessage
  } = useMessage();

  const updateFormInput = (ev) => {
    ev.preventDefault();
    setUserKey(ev.target.value);
  };

  const dispatch = useUserDispatch();

  const onFormSubmit = (ev) => {
    ev.preventDefault();

    const successFunc = (res) => {
      dispatch({ type: "LOGIN", userKey})
    }

    const errorFunc = (err) => {
      errorMessage(err.response.data.message);
    }

    loginUser(userKey, successFunc, errorFunc);
  };

  return (
    <FormWrapper>
      <FormLabel
        htmlFor="themis-login-input">
        Login
      </FormLabel>
      <FormInput
        id="themis-login-input"
        type="text"
        onChange={ updateFormInput } />
      <Button
        onClick={ onFormSubmit }>
        Login
      </Button>
    </FormWrapper>
  );
};

