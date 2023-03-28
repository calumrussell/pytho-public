import React from 'react';

import {
  SectionWrapper,
  ComponentWrapper,
  Button,
  Text,
  DoubleHorizontalSpacer,
  RenderIf,
} from '@Common';
import {
  useUser,
  useUserDispatch,
} from '@Components/reducers/user';
import {
  useMessage,
} from '@Components/reducers/message';
import {
  createUser,
  logoutUser,
} from '@Api';

import {
  LoginForm,
} from './components/login';

export const ThemisApp = (props) => {
  const userState = useUser();
  const dispatch = useUserDispatch();

  const {
    errorMessage
  } = useMessage();

  const createUserOnClick = () => {
    const successFunc = (res) => dispatch({
      type: 'LOGIN',
      userKey: res.userKey,
    })

    const errorFunc = (err) => {
      if (err.response.status == 401) {
        if (userState.isLoggedIn) {
          dispatch({ type: 'LOGOUT'})
        }
      }
      errorMessage(err.response.data.message);
    }
    createUser(successFunc, errorFunc);
  };

  const logoutUserOnClick = () => {
    const successFunc = () => dispatch({ type: 'LOGOUT' })
    const errorFunc = (err) => {
      if (err.response.status == 401) {
        if (userState.isLoggedIn) {
          dispatch({ type: 'LOGOUT'})
        }
      }
      errorMessage(err.response.data.message);
    }
    logoutUser(successFunc, errorFunc);
  };

  return (
    <SectionWrapper>
      <ComponentWrapper>
        <RenderIf cond={!userState.isLoggedIn}>
          <Button
            onClick={ () => createUserOnClick() }>
            Create User
          </Button>
        </RenderIf>
      </ComponentWrapper>
      <ComponentWrapper>
        <RenderIf cond={!userState.isLoggedIn}>
          <LoginForm />
        </RenderIf>
      </ComponentWrapper>
      <ComponentWrapper>
        <RenderIf cond={userState.isLoggedIn}>
          <Text>
            User key:
            {' '}
            <br />
            {userState.user}
          </Text>
        </RenderIf>
      </ComponentWrapper>
      <ComponentWrapper>
        <RenderIf cond={userState.isLoggedIn}>
          <Button
            onClick={ () => logoutUserOnClick() }>
            Logout User
          </Button>
        </RenderIf>
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
