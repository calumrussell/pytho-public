import React from 'react';
import styled from 'styled-components';
import zip from 'lodash.zip';

import {
  useAntevorta,
} from '../../context';
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
    results,
  } = useAntevorta();

  const {
    renderLoader,
  } = useLoader();

  const Loader = renderLoader();

  if (results) {
    const {
      runs,
      gross_income_avg,
      tax_paid_avg,
      contribution_avg,
      expense_avg,
      total_end_value,
    } = results;

    const avg = total_end_value.reduce((acc, curr) => acc+curr, 0) / total_end_value.length;

    const years = Array.from(Array(gross_income_avg.length).keys())
    const after_tax_avg = zip(gross_income_avg, tax_paid_avg, contribution_avg, expense_avg)
      .map(v => v[0] - v[1] - v[2] - v[3]);
    const data = years.map(i => 
      ({net_income: after_tax_avg[i], taxes_paid: tax_paid_avg[i], contributions: contribution_avg[i], expenses: expense_avg[i] }));

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
          <Text light>Gross income compositions per simulation year</Text>
          <StackedBarChart
            labels={ ['net_income', 'taxes_paid', 'contributions', 'expenses'] }
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
