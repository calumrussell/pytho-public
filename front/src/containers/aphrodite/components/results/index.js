import React from 'react';

import {
  Button,
  SectionWrapper,
} from '@Common';
import {
  useLoader,
} from '@Components/reducers/loader';
import {
  useUser
} from '@Components/reducers/user';

import {
  useBacktest,
} from '../../reducers/backtest';

const jsonPortfolio = (portfolio) => ({
  'assets': portfolio.assets.map((i) => i.id),
  'weights': portfolio.weights.map((i) => i/100),
});

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
    portfolio
  } = useUser();

  const clickLogic = () => {
    const loader = toggleLoader();
    const portJson = jsonPortfolio(portfolio);
    runBacktest(portJson, loader);
  };

  const Loader = renderLoader();
  return (
    <SectionWrapper>
      <Button
        disabled={ loadingState.isLoading || portfolio.isEmpty }
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
