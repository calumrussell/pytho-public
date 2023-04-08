import React from 'react';

import {
  LoaderProvider,
} from '@Components/reducers/loader';
import {
  PortfolioBuilder,
  PortfolioDisplay,
  PortfolioSaver,
  PortfolioState,
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

  return (
    <>
      <SectionWrapper
        data-testid="app">
        <ComponentWrapper>
          <PortfolioBuilder />
          <PortfolioDisplay />
          <PortfolioSaver />
          <PortfolioState />
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
    <BacktestProvider>
      <LoaderProvider>
        <Aphrodite
          { ...props } />
      </LoaderProvider>
    </BacktestProvider>
  );
};
