import React from 'react';

import {
  Text,
  NumberWithTitle,
  strConverterMult,
  annualiseMonthlyRet,
  DefaultHorizontalSpacer,
  PanelWrapper,
  AthenaTypes,
} from '@Common/index';
import {
  LineChart,
} from '@Components/charts';

interface DependentProps {
  results: AthenaTypes.ModelResults,
  dependent: AthenaTypes.Security
}

export const Dependent = ({ results, dependent }: DependentProps) => {
  const {
    core,
    rolling,
  } = results;

  const annualisedAvgRet = annualiseMonthlyRet(core.avgs[0]);
  const annualisedAlpha = annualiseMonthlyRet(core.regression.coefs[0]);

  const dates = rolling.dates;
  const yValues = [rolling.regressions.coefs.map(v => annualiseMonthlyRet(v[0]))];
  const rootId = 'chart-container-exposure-alpha';
  return (
    <PanelWrapper>
      <Text
        light>
        {dependent.name}
      </Text>
      <DefaultHorizontalSpacer
        style={
          {
            display: 'flex',
          }
        }>
        <NumberWithTitle
          hasPercentage
          title={ 'Alpha' }
          number={ strConverterMult(annualisedAlpha) } />
        <NumberWithTitle
          hasPercentage
          title={ 'Avg Ret' }
          number={ strConverterMult(annualisedAvgRet) } />
      </DefaultHorizontalSpacer>
      <LineChart
        rootId={ rootId }
        labels={
          [
            'Alpha',
          ]
        }
        xValues={ dates }
        yValues={ yValues } />
    </PanelWrapper>
  );
};
