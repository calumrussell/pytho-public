import React from 'react';

import {
  SectionWrapper,
} from '@Common/index';

import {
  MetisProvider,
} from './context';
import {
  PlanState,
} from './components/planstate';

export const MetisApp = () => {

  return (
    <MetisProvider>
      <SectionWrapper>
        <PlanState />
      </SectionWrapper>
    </MetisProvider>
  );
};

