import React from 'react';
import styled from 'styled-components';

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
} from '@Common';
import {
  HistogramChart,
} from '@Components/charts';

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
      values,
    } = state.results;

    const avg = values.reduce((acc, curr) => acc+curr, 0) / values.length;

    return (
      <ComponentWrapper>
        <HistogramChart
          runs={ runs }
          rootId={ 'chart-container-histogram' }
          values={ values } />
        <RowWrapper>
          <NumberWithTitle
            title={ 'Avg Value' }
            number={ strConverter(avg) } />
        </RowWrapper>
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
