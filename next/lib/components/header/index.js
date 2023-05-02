import React from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import Link from "next/link";

import { Text, ClickableText } from "@Common/index";

import { MenuIcon } from "./components/menuicon";

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
  }
`;

const PageHeaderInnerStyle = styled.div`
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

const UserKey = ({ isLoggedIn, user }) => {
  if (isLoggedIn) {
    const fmtUserKey = user.slice(0, 5) + "...";
    return <Text style={{ paddingRight: "0.5rem" }}>{fmtUserKey}</Text>;
  }
  return null;
};

export const Header = ({ showMenu, toggleMenu, userKey }) => {
  return (
    <HeaderWrapper>
      <PageHeaderInnerStyle>
        <PageHeaderTitleStyle>
          <Link href="/">
            <span>Pytho</span>
          </Link>
        </PageHeaderTitleStyle>
        <HeaderItemsStyle>
          <Link href="/user">
            <ClickableText>User</ClickableText>
          </Link>
          <Link href="/blog">
            <ClickableText>Blog</ClickableText>
          </Link>
          <UserKey isLoggedIn={userKey != null} user={userKey} />
          <MenuIcon showMenu={showMenu} toggleMenu={toggleMenu} />
        </HeaderItemsStyle>
      </PageHeaderInnerStyle>
    </HeaderWrapper>
  );
};

Header.propTypes = {
  showMenu: PropTypes.bool.isRequired,
  toggleMenu: PropTypes.func.isRequired,
  userKey: PropTypes.string,
};
