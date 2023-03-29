import React from 'react';
import zip from 'lodash.zip';

import {
  useLoader,
} from '@Components/reducers/loader';
import {
  DefaultHorizontalSpacer,
  ComponentWrapper,
  Text,
  Operations,
} from '@Common';
import {
  HistogramChart,
  StackedBarChart,
} from '@Components/charts';

import {
  useAntevorta,
} from '../../context';
import { YearlyTable } from './components/yearlytable';
import { InfoHeader } from './components/infoheader';

export const ModelResults = (props) => {
  const state = useAntevorta();

  const {
    renderLoader,
  } = useLoader();

  const Loader = renderLoader();

  if (state.results) {
    const {
      runs,
      results,
    } = state.results;

    const gross_income = new Array();
    const net_income = new Array();
    const tax_paid = new Array();
    const contribution = new Array();
    const expense = new Array();
    const total_end_value = new Array();
    const returns = new Array();
    const investment_dates = results[0].returns_dates;
    const investment_values = new Array();

    results.map(result => {
      gross_income.push(result.gross_income);
      net_income.push(result.net_income);
      tax_paid.push(result.tax_paid);
      contribution.push(result.sipp_contributions);
      expense.push(result.expense);
      total_end_value.push(result.values[result.values.length-1] + result.cash[result.cash.length-1]);
      investment_values.push(result.values);

      //shallow
      let rets_copy = [...result.returns];
      rets_copy.unshift(0);
      returns.push(rets_copy);
    })

    const calc_avg = values => Operations.transpose(values).map(Operations.average);

    const gross_income_avg = calc_avg(gross_income);
    const tax_paid_avg = calc_avg(tax_paid);
    const contribution_avg = calc_avg(contribution);
    const expense_avg = calc_avg(expense);

    const years = Array.from(Array(gross_income_avg.length).keys())
    const after_tax_avg = zip(gross_income_avg, tax_paid_avg, contribution_avg, expense_avg)
      .map(v => v[0] - v[1] - v[2] - v[3]);
    const data = years.map(i => 
      ({net_income: after_tax_avg[i], taxes_paid: tax_paid_avg[i], contributions: contribution_avg[i], expenses: expense_avg[i] }));

    return (
      <ComponentWrapper>
        <InfoHeader
          runs={runs}
          results={results}
          total_end_value={total_end_value} />
        <YearlyTable
          runs={runs}
          years={years}
          gross_income={gross_income}
          net_income={net_income}
          expense={expense}
          tax_paid={tax_paid}
          contribution={contribution} 
          returns={returns} 
          values={investment_values} 
          dates={investment_dates} />
        <DefaultHorizontalSpacer>
          <Text light>Distribution of monthly returns across all simulations</Text>
          <HistogramChart
            runs={ 50 }
            rootId={ 'chart-container-histogram' }
            values={ returns.flat() } />
        </DefaultHorizontalSpacer>
        <DefaultHorizontalSpacer>
          <Text light>Distribution of total value at simulation end</Text>
          <HistogramChart
            runs={ runs }
            rootId={ 'all-returns-container-histogram' }
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
