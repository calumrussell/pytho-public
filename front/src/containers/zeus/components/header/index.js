import React, {
  useEffect,
} from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import {
  Link,
} from 'react-router-dom';

import {
  useUser,
} from '@Components/reducers/user';
import {
  Text,
  ClickableText,
} from '@Common';

import {
  MenuIcon,
} from './components/menuicon';

const HeaderWrapper = styled.header`
  width: 100%;
  height: 10vh;

  a {
    text-decoration: none;
    color: inherit;
  }
`;

const HeaderItemsStyle = styled.div`
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  a {
    padding-right: 1rem;
  }http://192.168.100.118:9000
`;

const PageHeaderInnerStyle = styled.div`
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  align-items: center;
`;

const PageHeaderTitleStyle = styled.div`
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  height: 100%;
`;

export const Header = ({
  showMenu, toggleMenu,
}) => {
  const {
    state,
    checkUser,
  } = useUser();

  useEffect(() => {
    // We check on every change of state, but we only need do anything in the
    // specific case where the user has something in localStorage but the
    // reducer state doesn't match that
    checkUser();
  }, [
  ]);

  const UserKey = () => {
    if (state.isLoggedIn) {
      const fmtUserKey = state.user.slice(0, 5) + '...';
      return (
        <Text>
          {fmtUserKey}
        </Text>
      );
    }
    return null;
  };

  return (
    <HeaderWrapper>
      <PageHeaderInnerStyle>
        <PageHeaderTitleStyle>
          <Link
            to='/'>
            <span>
              Pytho
            </span>
          </Link>
        </PageHeaderTitleStyle>
        <HeaderItemsStyle>
          <Link
            to='/user'>
            <ClickableText>
              User
            </ClickableText>
          </Link>
          <a
            href='https://blog.pytho.uk'>
            <ClickableText>
              Blog
            </ClickableText>
          </a>
          <UserKey />
          <MenuIcon
            showMenu={ showMenu }
            toggleMenu={ toggleMenu } />
        </HeaderItemsStyle>
      </PageHeaderInnerStyle>
    </HeaderWrapper>
  );
};

Header.propTypes = {
  showMenu: PropTypes.bool.isRequired,
  toggleMenu: PropTypes.func.isRequired,
};

