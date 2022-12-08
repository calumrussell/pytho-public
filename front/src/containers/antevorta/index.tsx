import React, { useState, useEffect } from 'react';

import {
  LoaderProvider,
} from '@Components/reducers/loader';
import {
  useMessage,
} from '@Components/reducers/message';
import {
  PageWrapper,
  SectionWrapper,
  Button,
} from '@Common/index';
import {
  PortfolioProvider,
} from '@Components/portfolio';

import {
  AntevortaProvider,
} from './reducers/antevorta/';
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
        <PortfolioProvider>
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
        </PortfolioProvider>
      </AntevortaProvider>
    </PageWrapper>
  )
}
