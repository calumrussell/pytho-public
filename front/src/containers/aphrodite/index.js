import React from 'react';

import {
  LoaderProvider,
} from '@Components/reducers/loader';
import {
  PortfolioBuilder,
  PortfolioProvider,
  PortfolioLoader,
  usePortfolio,
} from '@Components/portfolio';
import {
  SectionWrapper, ComponentWrapper,
} from '@Common';

import {
  Results,
} from './components/results';
import {
  BacktestProvider,
} from './reducers/backtest';

const Aphrodite = (props) => {
  const {
    displayPortfolio,
  } = usePortfolio();

  const PortfolioDisplay = displayPortfolio();

  return (
    <>
      <SectionWrapper
        data-testid="app">
        <ComponentWrapper>
          <PortfolioBuilder />
          <PortfolioDisplay />
          <PortfolioLoader />
        </ComponentWrapper>
      </SectionWrapper>
      <SectionWrapper>
        <Results />
      </SectionWrapper>
    </>
  );
};

export const AphroditeApp = (props) => {
  return (
    <PortfolioProvider>
      <BacktestProvider>
        <LoaderProvider>
          <Aphrodite
            { ...props } />
        </LoaderProvider>
      </BacktestProvider>
    </PortfolioProvider>
  );
};
