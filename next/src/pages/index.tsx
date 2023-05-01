import Head from "next/head";
import Link from "next/link";
import React from "react";
import styled from "styled-components";

import {
  DoubleHorizontalSpacer,
  ComponentWrapper,
  SectionWrapper,
  Text,
} from "@Common/index";
import { Main } from "@Components/main";
import { withSessionSsr } from "@Root/lib/session";

const HomeLinkWrapperStyle = styled.div`
  border: 1px solid var(--alt-background-color);
  padding: 0.5rem 0.5rem;
  cursor: pointer;
`;

const ComponentWrapperAddedVertical = styled(ComponentWrapper)`
  margin: 1rem 0.5rem;
  a {
    text-decoration: none;
    color: inherit;
  }
  div:hover:first-child,
  div:active:first-child {
    background-color: var(--alt-background-color);
  }
`;

const PageOpener = styled.div`
  display: flex;
  flex-direction: horizontal;
  justify-content: space-between;
  align-items: center;
`;

const DoubleHorizontalSpacerWithVertical = styled(DoubleHorizontalSpacer)`
  padding: 0.5rem 1rem;
`;

const HomeSectionWrapper = styled(SectionWrapper)`
  max-width: 900px;
  margin: 0 auto;
  z-index: 99;
  position: relative;
`;

export default function Home({ userKey }: { userKey: string }) {
  return (
    <>
      <Head>
        <title>Pytho</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Main userKey={userKey}>
        <HomeSectionWrapper>
          <ComponentWrapperAddedVertical>
            <Text light focus>
              Creating tools for financial decisions
            </Text>
          </ComponentWrapperAddedVertical>
          <ComponentWrapperAddedVertical>
            <HomeLinkWrapperStyle>
              <Link href="/backtest">
                <PageOpener>
                  <Text focus>Portfolio Backtest</Text>
                  <Text italic light>
                    Click to open
                  </Text>
                </PageOpener>
              </Link>
            </HomeLinkWrapperStyle>
            <DoubleHorizontalSpacerWithVertical>
              <Text>How did a portfolio perform historically?</Text>
            </DoubleHorizontalSpacerWithVertical>
          </ComponentWrapperAddedVertical>
          <ComponentWrapperAddedVertical>
            <Link href="/exposureanalysis">
              <HomeLinkWrapperStyle>
                <PageOpener>
                  <Text focus>Exposure Analysis</Text>
                  <Text italic light>
                    Click to open
                  </Text>
                </PageOpener>
              </HomeLinkWrapperStyle>
            </Link>
            <DoubleHorizontalSpacerWithVertical>
              <Text>
                What % of fund X&apos;s returns are due to market exposure?
              </Text>
              <Text>What exposure does fund X have to asset class Y?</Text>
            </DoubleHorizontalSpacerWithVertical>
          </ComponentWrapperAddedVertical>
          <ComponentWrapperAddedVertical>
            <HomeLinkWrapperStyle>
              <Link href="/incomesim">
                <PageOpener>
                  <Text focus>Lifetime simulation</Text>
                  <Text italic light>
                    Click to open
                  </Text>
                </PageOpener>
              </Link>
            </HomeLinkWrapperStyle>
            <DoubleHorizontalSpacerWithVertical>
              <Text>
                How much will you retire with a certain
                income/expense/portfolio?
              </Text>
              <Text>
                What is the worst outcome you can expect investing for X years
                in Y fund?
              </Text>
            </DoubleHorizontalSpacerWithVertical>
          </ComponentWrapperAddedVertical>
        </HomeSectionWrapper>
      </Main>
    </>
  );
}

export const getServerSideProps = withSessionSsr(
  async function getServerSideProps({ req }) {
    let userKey = null;
    if (req.session.user) {
      if (req.session.user.userKey) {
        userKey = req.session.user.userKey;
      }
    }

    return {
      props: {
        userKey,
      },
    };
  }
);
