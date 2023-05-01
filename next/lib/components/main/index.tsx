import React, { useState } from "react";
import styled from "styled-components";
import Head from "next/head";

import { MessageProvider } from "@Components/reducers/message";
import { Header } from "@Components/header";
import { SideMenu } from "@Components/sidemenu";
import { Message } from "@Common/index";

const AppWrapper = styled.div`
  font-family: "Open Sans";
  color: var(--default-text-color);
  background-color: var(--default-background-color);
  max-width: 900px;
  margin: 0 auto;
`;

interface MainProps {
  children: React.ReactNode;
  userKey: string | null;
  id?: string;
}

export const Main = ({ children, userKey }: MainProps) => {
  const [showMenu, toggleMenu] = useState(false);

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          type="text/css"
          href="//fonts.googleapis.com/css?family=Open+Sans"
        />
      </Head>
      <AppWrapper>
        <MessageProvider>
          <Message />
          <Header
            showMenu={showMenu}
            toggleMenu={toggleMenu}
            userKey={userKey}
          />
          <SideMenu toggleMenu={toggleMenu} showMenu={showMenu} />
          {children}
        </MessageProvider>
      </AppWrapper>
    </>
  );
};
