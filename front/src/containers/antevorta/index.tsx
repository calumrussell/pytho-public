import React, { useState } from 'react';

import {
  LoaderProvider,
} from '@Components/reducers/loader';
import {
  PageWrapper,
  SectionWrapper,
} from '@Common/index';

import {
  AntevortaProvider,
} from './context/';
import {
  PlanStore,
} from './components/planstore';
import {
  ModelRunner,
} from './components/modelrunner';
import {
  ModelResults,
} from './components/modelresults';

export const AntevortaApp = () => {
  //selectedPlan cannot be negative, so -1 is used as null value
  const [selectedPlan, setSelectedPlan] = useState<number>(-1);

  return (
    <PageWrapper
      id="antevorta-main">
      <AntevortaProvider>
        <LoaderProvider>
          <SectionWrapper>
            <PlanStore 
              selectedPlan={selectedPlan}
              selectPlanFunc={setSelectedPlan} />
          </SectionWrapper>
          <SectionWrapper>
            <ModelRunner 
              selectedPlanPos={selectedPlan}/>
          </SectionWrapper>
          <SectionWrapper>
            <ModelResults />
          </SectionWrapper>
        </LoaderProvider>
      </AntevortaProvider>
    </PageWrapper>
  )
}
