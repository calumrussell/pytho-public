import React from 'react';
import styled from 'styled-components';
import zip from 'lodash.zip';

import {
  useAntevorta,
} from '../../reducers/antevorta';
import {
  useLoader,
} from '@Components/reducers/loader';
import {
  strConverter,
  ComponentWrapper,
  NumberWithTitle,
  Text,
} from '@Common';
import {
  HistogramChart,
  StackedBarChart,
} from '@Components/charts';
import { DefaultHorizontalSpacer } from '@Common/index';

const RowWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  margin: 1rem 0;
`;

export const ModelResults = (props) => {
  const {
    state,
  } = useAntevorta();

  const {
    renderLoader,
  } = useLoader();

  const Loader = renderLoader();

  if (state.results) {
    const {
      runs,
      gross_income_avg,
      tax_paid_avg,
      total_end_value,
    } = state.results;

    const avg = total_end_value.reduce((acc, curr) => acc+curr, 0) / total_end_value.length;

    const years = Array.from(Array(gross_income_avg.length).keys())
    const after_tax_avg = zip(gross_income_avg, tax_paid_avg)
      .map(v => v[0] - v[1]);
    const data = years.map(i => ({income_after_tax: after_tax_avg[i], tax_paid: tax_paid_avg[i] }));

    return (
      <ComponentWrapper>
        <RowWrapper>
          <NumberWithTitle
            title={ 'Avg Value' }
            number={ strConverter(avg) } />
        </RowWrapper>
        <DefaultHorizontalSpacer>
          <Text light>Distribution of total value at simulation end</Text>
          <HistogramChart
            runs={ runs }
            rootId={ 'chart-container-histogram' }
            values={ total_end_value } />
        </DefaultHorizontalSpacer>
        <DefaultHorizontalSpacer>
          <Text light>Income allocation each simulation year</Text>
          <StackedBarChart
            labels={ ['income_after_tax', 'tax_paid'] }
            xValues={ years }
            rootId={ 'chart-container-gross-income' }
            yValues={ data } />
        </DefaultHorizontalSpacer>
      </ComponentWrapper>
    );
  } else {
    return (
      <ComponentWrapper>
        <Loader />
      </ComponentWrapper>
    );
  }
};
