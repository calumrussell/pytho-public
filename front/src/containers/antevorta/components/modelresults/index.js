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

    const stacked = zip(after_tax_avg, tax_paid_avg);
    return (
      <ComponentWrapper>
        <RowWrapper>
          <NumberWithTitle
            title={ 'Avg Value' }
            number={ strConverter(avg) } />
        </RowWrapper>
        <DefaultHorizontalSpacer>
          <Text light>Distribution of ending total value</Text>
          <HistogramChart
            runs={ runs }
            rootId={ 'chart-container-histogram' }
            values={ total_end_value } />
        </DefaultHorizontalSpacer>
        <DefaultHorizontalSpacer>
          <Text light>Test</Text>
          <StackedBarChart
            labels={ ['Test', 'Test1'] }
            xValues={ years }
            rootId={ 'chart-container-gross-income' }
            yValues={ stacked } />
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
