import React from 'react';

import {
  Button,
  SectionWrapper,
} from '@Common';
import {
  usePortfolio,
} from '@Components/portfolio';
import {
  useLoader,
} from '@Components/reducers/loader';

import {
  useBacktest,
} from '../../reducers/backtest';

export const Results = (props) => {
  const {
    state: btState,
    runBacktest,
    renderResults,
  } = useBacktest();

  const {
    state: loadingState,
    toggleLoader,
    renderLoader,
  } = useLoader();

  const {
    state: portfolioState,
    jsonPortfolio,
  } = usePortfolio();

  const clickLogic = () => {
    const loader = toggleLoader();
    const portJson = jsonPortfolio();
    runBacktest(portJson, loader);
  };

  const Loader = renderLoader();
  return (
    <SectionWrapper>
      <Button
        disabled={ loadingState.isLoading || portfolioState.isEmpty }
        onClick={ clickLogic }>
        Run Backtest
      </Button>
      {!btState.results || renderResults()}
      <div>
        <Loader />
      </div>
    </SectionWrapper>
  );
};
