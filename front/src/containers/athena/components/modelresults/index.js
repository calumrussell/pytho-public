import React from 'react';

import {
  PanelWrapper,
  SectionWrapper,
} from '@Common';

import {
  Dependent,
} from './components/dependent';
import {
  IndependentsC,
} from './components/independent';

import {
  useModel,
} from '../../reducers/riskattribution';

export const ModelResults = (props) => {
  const {
    state,
  } = useModel();
  const {
    results,
    independent,
    dependent,
  } = state;

  const {
    core, rolling,
  } = results;

  if (core != undefined && rolling != undefined) {
    return (
      <SectionWrapper
        data-testid="riskattribution-modelresults">
        <PanelWrapper>
          <Dependent
            results={ results }
            independent={ independent }
            dependent={ dependent } />
          <IndependentsC
            results={ results }
            independent={ independent }
            dependent={ dependent } />
        </PanelWrapper>
      </SectionWrapper>
    );
  } 
  return null;
};
