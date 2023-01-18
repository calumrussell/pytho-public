import React, {
  useReducer, createRef, useEffect,
} from 'react';
import PropTypes from 'prop-types';
import {
  timeParse,
} from 'd3-time-format';
import {
  select,
} from 'd3-selection';
import {
  stack
} from 'd3-shape';

import {
  writeGraph, reducer, init,
} from './components/reducers/line';
import {
  writeGraph as writeTimeGraph, reducer as timeReducer, init as timeInit,
} from './components/reducers/time';
import {
  writeGraph as writeHistGraph, reducer as histReducer, init as histInit,
} from './components/reducers/histogram';
import {
  writeGraph as writeBarGraph, reducer as barReducer, init as barInit,
} from './components/reducers/bar';
import {
  writeGraph as writeStackedBarGraph, reducer as stackedBarReducer, init as stackedBarInit,
} from './components/reducers/stackedbar';
import {
  TimeButtons,
} from './components/timebuttons';
import {
  LogButton,
} from './components/logbutton';
import {
  ButtonRow,
} from './style';

export const LineChart = ({
  xValues, yValues, labels, rootId,
}) => {
  const tParser = timeParse('%s');
  const initState = {
    ref: createRef(),
    rootId,
    data: {
      x: xValues,
      y: yValues,
      xGetter: (d) => tParser(d),
      yGetter: (d) => d,
      labels,
    },
  };

  const [
    state,
    dispatch,
  ] = useReducer(
      reducer, initState, init,
  );

  const {
    size: {
      width,
      height,
      margin,
    },
    ref,
    root,
    rootWrapper,
  } = state.invariants;

  useEffect(() => {
    select(ref.current)
        .append('svg')
        .attr('id', root)
        .attr('viewBox', [
          0,
          0,
          width+margin.left+margin.right,
          height+margin.top+margin.bottom,
        ])
        .append('g')
        .attr('id', rootWrapper)
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    writeGraph(state, dispatch);
  }, [
  ]);

  return (
    <>
      <div
        ref={ ref } />
    </>
  );
};

LineChart.propTypes = {
  xValues: PropTypes.array.isRequired,
  yValues: PropTypes.array.isRequired,
  labels: PropTypes.arrayOf(PropTypes.string),
  rootId: PropTypes.string.isRequired,
};

export const LineChartWithTimeButtons = ({
  xValues,
  yValues,
  labels,
  rootId,
}) => {
  const tParser = timeParse('%s');
  const initState = {
    ref: createRef(),
    rootId,
    data: {
      x: xValues,
      y: yValues,
      xGetter: (d) => tParser(d),
      yGetter: (d) => d,
      labels,
    },
  };

  const [
    state,
    dispatch,
  ] = useReducer(
      timeReducer, initState, timeInit,
  );

  const {
    ref,
    size: {
      width,
      height,
      margin,
    },
    root,
    rootWrapper,
  } = state.invariants;

  useEffect(() => {
    select(ref.current)
        .append('svg')
        .attr('id', `${root}`)
        .attr('viewBox', [
          0,
          0,
          width+margin.left+margin.right,
          height+margin.top+margin.bottom,
        ])
        .append('g')
        .attr('id', `${rootWrapper}`)
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    writeTimeGraph(state, dispatch);
  }, [
  ]);

  return (
    <>
      <ButtonRow>
        <LogButton />
      </ButtonRow>
      <ButtonRow>
        <TimeButtons />
      </ButtonRow>
      <div
        ref={ ref } />
    </>
  );
};

LineChartWithTimeButtons.propTypes = {
  xValues: PropTypes.array.isRequired,
  yValues: PropTypes.array.isRequired,
  labels: PropTypes.arrayOf(PropTypes.string),
  rootId: PropTypes.string.isRequired,
};

export const HistogramChart = ({
  values, rootId, runs,
}) => {
  const initState = {
    ref: createRef(),
    rootId,
    data: {
      runs,
      x: values,
      xGetter: (d) => d,
    },
  };

  const [
    state,
    dispatch,
  ] = useReducer(
      histReducer, initState, histInit,
  );

  const {
    ref,
    size: {
      width,
      height,
      margin,
    },
    root,
    rootWrapper,
  } = state.invariants;

  useEffect(() => {
    select(ref.current)
        .append('svg')
        .attr('id', `${root}`)
        .attr('viewBox', [
          0,
          0,
          width+margin.left+margin.right,
          height+margin.top+margin.bottom,
        ])
        .append('g')
        .attr('id', `${rootWrapper}`)
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    writeHistGraph(state, dispatch);
  }, [
  ]);

  return (
    <>
      <div
        ref={ ref } />
    </>
  );
};

HistogramChart.propTypes = {
  values: PropTypes.array.isRequired,
  rootId: PropTypes.string.isRequired,
  runs: PropTypes.number.isRequired,
};


export const BarChart = ({
  values, labels, rootId,
}) => {
  const initState = {
    ref: createRef(),
    rootId,
    data: {
      x: labels,
      y: values,
      xGetter: (d) => d,
      yGetter: (d) => d,
    },
  };

  const [
    state,
    dispatch,
  ] = useReducer(
      barReducer, initState, barInit,
  );

  const {
    ref,
    size: {
      width,
      height,
      margin,
    },
    root,
    rootWrapper,
  } = state.invariants;

  useEffect(() => {
    select(ref.current)
        .append('svg')
        .attr('id', `${root}`)
        .attr('viewBox', [
          0,
          0,
          width+margin.left+margin.right,
          height+margin.top+margin.bottom,
        ])
        .append('g')
        .attr('id', `${rootWrapper}`)
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    writeBarGraph(state, dispatch);
  }, [
  ]);

  return (
    <>
      <div
        ref={ ref } />
    </>
  );
};

BarChart.propTypes = {
  values: PropTypes.array.isRequired,
  labels: PropTypes.array.isRequired,
  rootId: PropTypes.string.isRequired,
};


export const StackedBarChart = ({
  xValues, yValues, labels, rootId,
}) => {

  const stackFunc = stack()
    .keys(labels);
  const series = stackFunc(yValues);

  const initState = {
    ref: createRef(),
    rootId,
    data: {
      labels: labels,
      x: xValues,
      y: series,
      xGetter: (d) => d,
      yGetter: (d) => d,
    },
  };

  const [
    state,
    dispatch,
  ] = useReducer(
      stackedBarReducer, initState, stackedBarInit,
  );

  const {
    ref,
    size: {
      width,
      height,
      margin,
    },
    root,
    rootWrapper,
  } = state.invariants;

  useEffect(() => {
    select(ref.current)
        .append('svg')
        .attr('id', `${root}`)
        .attr('viewBox', [
          0,
          0,
          width+margin.left+margin.right,
          height+margin.top+margin.bottom,
        ])
        .append('g')
        .attr('id', `${rootWrapper}`)
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    writeStackedBarGraph(state, dispatch);
  }, [
  ]);

  return (
    <>
      <div
        ref={ ref } />
    </>
  );
};

StackedBarChart.propTypes = {
  yValues: PropTypes.array.isRequired,
  xValues: PropTypes.array.isRequired,
  labels: PropTypes.array.isRequired,
  rootId: PropTypes.string.isRequired,
};
