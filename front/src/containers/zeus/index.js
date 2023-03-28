import React, {
  useState,
} from 'react';
import styled from 'styled-components';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';

import {
  UserProvider,
} from '@Components/reducers/user';
import {
  MessageProvider,
} from '@Components/reducers/message';
import {
  Message,
} from '@Common';

import {
  GlobalStyle,
} from './style.js';
import {
  AphroditeApp,
} from '../aphrodite';
import {
  AthenaApp,
} from '../athena';
import {
  AntevortaApp,
} from '../antevorta';
import {
  MetisApp,
} from '../metis';
import {
  ThemisApp,
} from '../themis';
import {
  Home,
} from '../hestia';

import {
  Header,
} from './components/header';
import {
  SideMenu,
} from './components/sidemenu';

const AppWrapper = styled.div`
  font-family: "Open Sans";
  color: var(--default-text-color);
  background-color: var(--default-background-color);
`;

const PageWrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

export const App = (props) => {
  const [
    showMenu,
    toggleMenu,
  ] = useState(false);

  return (
    <Router>
      <GlobalStyle />
      <AppWrapper>
        <MessageProvider>
          <UserProvider>
            <Header
              showMenu={ showMenu }
              toggleMenu={ toggleMenu } />
            <SideMenu
              toggleMenu={ toggleMenu }
              showMenu={ showMenu } />
            <Message />
            <PageWrapper>
              <Routes>
                <Route
                  exact
                  path="/"
                  element={ <Home /> } />
                <Route
                  path="/exposureanalysis"
                  element={ <AthenaApp /> } />
                <Route
                  path="/incomesim"
                  element={ <AntevortaApp /> } />
                <Route
                  path="/backtest"
                  element={ <AphroditeApp /> } />
                <Route
                  path="/user"
                  element={ <ThemisApp /> } />
                <Route
                  path="/plancreator"
                  element={ <MetisApp /> } />
              </Routes>
            </PageWrapper>
          </UserProvider>
        </MessageProvider>
      </AppWrapper>
    </Router>
  );
};
