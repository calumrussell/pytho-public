import React from 'react';

import {
  Text,
  NumberWithTitle,
  strConverter,
  strConverterMult,
  annualiseMonthlyRet,
  DefaultHorizontalSpacer,
  PanelWrapper,
} from '@Common/index';
import {
  LineChart,
} from '@Components/charts';

import {
  Security,
  ModelResults,
  Independents,
} from '../../types';

type IndependentProps = {
  results: ModelResults,
  independent: Security,
  pos: number,
}

const Independent = ({
  results, independent, pos,
} : IndependentProps) => {
  const {
    core,
  } = results;

  const annualisedRet = annualiseMonthlyRet(core.avgs[pos]);
  const coef = core.regression.coefs[pos];
  return (
    <PanelWrapper>
      <Text
        light>
        {independent.name}
      </Text>
      <DefaultHorizontalSpacer
        style={
          {
            display: 'flex',
          }
        }>
        <NumberWithTitle
          title={ 'Coef' }
          number={ strConverter(coef) } />
        <NumberWithTitle
          hasPercentage
          title={ 'Avg Ret' }
          number={ strConverterMult(annualisedRet) } />
      </DefaultHorizontalSpacer>
    </PanelWrapper>
  );
};

interface IndependentCProps {
  results: ModelResults,
  independent: Independents,
}

export const IndependentsC = ({results, independent}: IndependentCProps) => {
  const {
    rolling,
  } = results;

  const assetIds = Object.keys(independent).map((key) => Number(key));
  const assetNames = assetIds.map((id) => independent[id].name);

  const transpose = (matrix: Array<Array<number>>) => {
    return matrix[0].map((col, i) => matrix.map(row => row[i]));
  }

  const yValues = transpose(rolling.regressions.coefs.map(coef => {
    const [_first, ...last] = coef;
    return last;
  }));
  const dates = rolling.dates;
  const rootId = 'chart-container-exposure-coefs';
  return (
    <>
      <div
        style={
          {
            margin: '0.5rem 0 0 0',
          }
        }>
        {
          assetIds.map((assetId, i) => <Independent
            key={ assetId }
            results={ results }
            pos={i+1}
            independent={ independent[assetId] } />)
        }
        <LineChart
          rootId={ rootId }
          labels={ assetNames }
          xValues={ dates }
          yValues={ yValues } />
      </div>
    </>
  );
};

