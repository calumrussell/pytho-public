import React, { useReducer, useState } from "react";
import type { api_userportfolio } from "@prisma/client";

import { LoaderProvider, useLoader } from "@Components/reducers/loader";
import {
  PortfolioBuild,
  PortfolioPerformance,
  initialState,
  portfolioStateToJson,
  reducer,
} from "@Components/portfolio";
import {
  SectionWrapper,
  ComponentWrapper,
  Button,
  Request,
} from "@Common/index";
import { withSessionSsr } from "@Root/lib/session";
import prisma from "@Root/lib/prisma";
import { Main } from "@Components/main";

import { useMessage } from "@Components/reducers/message";

const Inner = (props: BacktestProps) => {
  const [portfolioState, portfolioDispatch] = useReducer(reducer, initialState);
  const [results, setResults] = useState(null);

  const { state: loadingState, toggleLoader, renderLoader } = useLoader();
  const { errorMessage } = useMessage();

  const isEmpty = portfolioState.assets.length === 0;

  const clickLogic = () => {
    const loader = toggleLoader();

    if (results) {
      setResults(null);
    }

    const jsonPortfolio = portfolioStateToJson(portfolioState)();
    Request.post("/api/backtest", { ...jsonPortfolio })
      .then((res) => res.json())
      .then((res) => setResults(res.data))
      .catch((err) => {
        if (err.response) {
          errorMessage(err.response.data.message);
        }
      })
      .finally(loader);
  };

  const Loader = renderLoader();

  return (
    <>
      <SectionWrapper data-testid="app">
        <ComponentWrapper>
          <PortfolioBuild
            portfolios={props.portfolios}
            state={portfolioState}
            dispatch={portfolioDispatch}
          />
        </ComponentWrapper>
      </SectionWrapper>
      <SectionWrapper>
        <Button
          disabled={loadingState.isLoading || isEmpty}
          onClick={clickLogic}
        >
          Run Backtest
        </Button>
        {!results || <PortfolioPerformance results={results} />}
        <div>
          <Loader />
        </div>
      </SectionWrapper>
    </>
  );
};

interface BacktestProps {
  userKey: string | null;
  portfolios: Array<api_userportfolio>;
}

export default function Backtest(props: BacktestProps) {
  return (
    <Main userKey={props.userKey}>
      <LoaderProvider>
        <Inner {...props} />
      </LoaderProvider>
    </Main>
  );
}

export const getServerSideProps = withSessionSsr(
  async function getServerSideProps({ req }) {
    const portfolios = [];
    let userKey = null;
    if (req.session.user) {
      if (req.session.user.userKey) {
        userKey = req.session.user.userKey;

        let userPortfolios = await prisma.api_userportfolio.findMany({
          where: {
            user_key: {
              equals: req.session.user.userKey,
            },
          },
        });
        portfolios.push(...userPortfolios);
      }
    }

    return {
      props: {
        userKey,
        portfolios,
      },
    };
  }
);
