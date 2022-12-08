import React from 'react';

import {
  SectionWrapper,
  ComponentWrapper,
  Button,
  Text,
  DoubleHorizontalSpacer,
} from '@Common';
import {
  useUser,
} from '@Components/reducers/user';

import {
  LoginForm,
} from './components/login';

export const ThemisApp = (props) => {
  const {
    state,
    createUser,
    logoutUser,
    loggedOutHoc,
    loggedInHoc,
  } = useUser();

  const CreateUser = (props) => (
    <Button
      onClick={ () => createUser() }>
      Create User
    </Button>
  );
  const CreateUserShowWhenLoggedOut = loggedOutHoc(CreateUser);

  const LoginUserFormShowWhenLoggedOut = loggedOutHoc(LoginForm);

  const LogoutUser = (props) => (
    <Button
      onClick={ () => logoutUser() }>
      Logout User
    </Button>
  );
  const LogoutUserShowWhenLoggedIn = loggedInHoc(LogoutUser);

  const UserInfo = (props) => (
    <Text>
      User key:
      {' '}
      <br />
      {state.user}
    </Text>
  );
  const UserInfoShowWhenLoggedIn = loggedInHoc(UserInfo);

  return (
    <SectionWrapper>
      <ComponentWrapper>
        <CreateUserShowWhenLoggedOut />
      </ComponentWrapper>
      <ComponentWrapper>
        <LoginUserFormShowWhenLoggedOut />
      </ComponentWrapper>
      <ComponentWrapper>
        <UserInfoShowWhenLoggedIn />
      </ComponentWrapper>
      <ComponentWrapper>
        <LogoutUserShowWhenLoggedIn />
      </ComponentWrapper>
      <ComponentWrapper>
        <DoubleHorizontalSpacer>
          <Text>
            When you click create user, you will be given a randomly-generated
            key. This key is used to login.
          </Text>
          <Text>
            Pytho does not store usernames or passwords, only this key. Because
            we do not store any other information, you are not at risk in the
            event of a hack of our systems. We also store no other information
            about users.
          </Text>
          <Text>
            Your key should be stored in a text file or a password manager. If
            you lose your key, we have no way of recoving any data associated
            with that key. You can create as many keys as you want.
          </Text>
        </DoubleHorizontalSpacer>
      </ComponentWrapper>
    </SectionWrapper>
  );
};
