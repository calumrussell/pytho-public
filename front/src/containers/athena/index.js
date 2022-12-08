import React from 'react';

import {
  LoaderProvider,
} from '@Components/reducers/loader';
import {
  SuggestProvider,
} from '@Components/suggest';

import {
  ModelResults,
} from './components/modelresults';
import {
  Builder,
} from './components/builder';
import {
  ModelProvider,
} from './reducers/riskattribution';

export const AthenaApp = (props) => (
  <ModelProvider
    id="riskattribution-main">
    <LoaderProvider>
      <SuggestProvider>
        <Builder />
      </SuggestProvider>
      <ModelResults />
    </LoaderProvider>
  </ModelProvider>
);
