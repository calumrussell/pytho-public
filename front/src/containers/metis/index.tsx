import React from 'react';

import {
  SectionWrapper,
} from '@Common/index';
import {
  FPlanProvider,
} from '@Components/reducers/fplan';

import {
  PlanState,
} from './components/planstate';

export const MetisApp = () => {

  return (
    <FPlanProvider>
      <SectionWrapper>
        <PlanState />
      </SectionWrapper>
    </FPlanProvider>
  );
};

