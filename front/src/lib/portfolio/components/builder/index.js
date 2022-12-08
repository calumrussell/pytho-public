import React, {
  useState,
} from 'react';

import {
  usePortfolio,
} from '@Components/portfolio';
import {
  SuggestProvider,
} from '@Components/suggest';

import {
  PortfolioSaver,
} from './components/saver';
import {
  BuilderForm,
} from './components/form';

export const PortfolioBuilder = (props) => {
  const [
    showSaver,
    setShowSaver,
  ] = useState(false);
  const {
    state,
  } = usePortfolio();

  const {
    isEmpty,
  } = state;

  return (
    <SuggestProvider>
      <>
        <BuilderForm
          isEmpty={ isEmpty }
          onClickSave={ () => setShowSaver(!showSaver) }
        />
      </>
      <PortfolioSaver
        setShowSaver={ setShowSaver }
        showSaver={ showSaver } />
    </SuggestProvider>
  );
};
