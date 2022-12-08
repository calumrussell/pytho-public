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
  useUser,
} from '@Components/reducers/user';

export const LoginForm = (props) => {
  const [
    userKey,
    setUserKey,
  ] = useState('');

  const updateFormInput = (ev) => {
    ev.preventDefault();
    setUserKey(ev.target.value);
  };

  const {
    loginUser,
  } = useUser();

  const onFormSubmit = (ev) => {
    ev.preventDefault();
    loginUser(userKey);
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

