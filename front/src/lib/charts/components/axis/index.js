import {
  select,
} from 'd3-selection';
import {
  scaleLinear, scaleTime, scaleBand,
} from 'd3-scale';
import {
  axisBottom, axisLeft,
} from 'd3-axis';
import {
  extent, max, min,
} from 'd3-array';

export const writeAxis = ( chartState, axis ) => {
  const [
    x,
    y,
  ] = axis;
  const {
    invariants: {
      rootWrapper,
      hasY,
      axisName,
      yAxisMarginAdj,
      size: {
        height,
        width,
        margin,
      },
    },
  } = chartState;

  const bottomMargin = yAxisMarginAdj ?
    height - margin.bottom :
    height;

  select(`#${rootWrapper}`)
      .append('g')
      .attr('class', `${axisName}-xaxis`)
      .attr('transform', `translate(0, ${bottomMargin})`)
      .call(axisBottom(x).tickSize(-height));

  select(`#${rootWrapper}`)
      .select(`.${axisName}-xaxis`)
      .select(`.domain`)
      .attr('opacity', '0.1');

  select(`#${rootWrapper}`)
      .select(`.${axisName}-xaxis`)
      .selectAll(`.tick`)
      .select(`line`)
      .attr('opacity', '0.1');

  if (hasY) {
    select(`#${rootWrapper}`)
        .append('g')
        .attr('class', `${axisName}-yaxis`)
        .call(axisLeft(y).tickSize(-width));

    select(`#${rootWrapper}`)
        .select(`.${axisName}-yaxis`)
        .select(`.domain`)
        .attr('opacity', '0.1');

    select(`#${rootWrapper}`)
        .select(`.${axisName}-yaxis`)
        .selectAll(`.tick`)
        .select(`line`)
        .attr('opacity', '0.1');
  }
};

export const updateAxis = (chartState, xValues, yValues) => {
  const [
    x,
    y,
  ] = chartState.axis;
  const {
    invariants: {
      rootWrapper,
      axisName,
      hasY,
      size: {
        height,
        width,
      },
    },
    data: {
      xGetter,
      yGetter,
    },
  } = chartState;

  x.domain(extent(xValues, xGetter));

  const minYVal = min(yValues, (d)=> min(d.map(yGetter)));
  const maxYVal = max(yValues, (d) => max(d.map(yGetter)));
  y.domain([
    minYVal,
    maxYVal,
  ]);

  select(`#${rootWrapper}`)
      .select(`.${axisName}-xaxis`)
      .call(axisBottom(x).tickSize(-height));

  select(`#${rootWrapper}`)
      .select(`.${axisName}-xaxis`)
      .select(`.domain`)
      .attr('opacity', '0.1');

  select(`#${rootWrapper}`)
      .select(`.${axisName}-xaxis`)
      .selectAll(`.tick`)
      .select(`line`)
      .attr('opacity', '0.1');

  if (hasY) {
    select(`#${rootWrapper}`)
        .select(`.${axisName}-yaxis`)
        .call(axisLeft(y).tickSize(-width));

    select(`#${rootWrapper}`)
        .select(`.${axisName}-yaxis`)
        .select(`.domain`)
        .attr('opacity', '0.1');

    select(`#${rootWrapper}`)
        .select(`.${axisName}-yaxis`)
        .selectAll(`.tick`)
        .select(`line`)
        .attr('opacity', '0.1');
  }
};

export const axisPointBuilder = (chartState) => {
  // Only works with one-dimensional data
  const {
    data: {
      x,
      y,
      yGetter,
    },
    invariants: {
      size: {
        height,
        width,
      },
    },
  } = chartState;

  const xAxis = scaleBand()
      .domain(x)
      .range([
        0,
        width,
      ])
      .paddingOuter(0.1)
      .paddingInner(0.1);

  const minYVal = min(y, (d) => yGetter(d))*0.75;
  const maxYVal = max(y, (d) => yGetter(d))*1.1;

  const yAxis = scaleLinear()
      .domain([
        minYVal,
        maxYVal,
      ])
      .range([
        height,
        0,
      ]);
  return [
    xAxis,
    yAxis,
  ];
};

/*
* Takes the sum of all values in the yaxis to calculate the high point of the yaxis.
* Is always bounded by zero at the bottom
*/
export const axisStackBuilder = (chartState) => {
  const {
    data: {
      x,
      y,
      xGetter,
      yGetter,
    },
    invariants: {
      size: {
        height,
        width,
        margin,
      },
      yAxisMarginAdj,
    },
  } = chartState;

  const bottomMargin = yAxisMarginAdj ?
  height - margin.bottom :
  height;

  const xAxis = scaleBand()
      .domain(x)
      .range([
        0,
        width,
      ])
      .paddingOuter(0.1)
      .paddingInner(0.1);

  const sum = (arr) => arr.reduce((curr, val) => curr + val, 0);
  const maxYVal = max(y, (d) => sum(yGetter(d)));

  const yAxis = scaleLinear()
      .domain([
        0,
        maxYVal,
      ])
      .range([
        bottomMargin,
        0,
      ]);

  return [
    xAxis,
    yAxis,
  ];
};

export const axisBuilder = (chartState) => {
  const {
    data: {
      x,
      y,
      xGetter,
      yGetter,
    },
    invariants: {
      size: {
        height,
        width,
        margin,
      },
      yAxisMarginAdj,
    },
  } = chartState;

  const bottomMargin = yAxisMarginAdj ?
  height - margin.bottom :
  height;

  const xAxis = scaleTime()
      .domain(extent(x, xGetter))
      .range([
        0,
        width,
      ]);

  const minYVal = min(y, (d)=> min(d.map(yGetter)));
  const maxYVal = max(y, (d) => max(d.map(yGetter)));

  const yAxis = scaleLinear()
      .domain([
        minYVal,
        maxYVal,
      ])
      .range([
        bottomMargin,
        0,
      ]);
  return [
    xAxis,
    yAxis,
  ];
};

/*
 * Breaks up the axis build stage by creating an x axis and returning a
 * function which can be used to create a y axis
 */
export const stagedAxisBuilder = (chartState) => {
  const {
    data: {
      x,
      xGetter,
    },
    invariants: {
      size: {
        width,
      },
    },
  } = chartState;

  const xAxis = scaleLinear()
      .domain(extent(x, xGetter))
      .range([
        0,
        width,
      ]);

  const yAxisBuilder = (chartState, yValues, yGetter, setMin = 0) => {
    const {
      invariants: {
        size: {
          height,
          margin,
        },
        yAxisMarginAdj,
      },
    } = chartState;

    const bottomMargin = yAxisMarginAdj ?
      height - margin.bottom :
      height;

    const maxYVal = max(yValues, (d)=> yGetter(d));
    return scaleLinear()
        .domain([
          0,
          maxYVal,
        ])
        .range([
          bottomMargin,
          0,
        ]);
  };
  return [
    xAxis,
    yAxisBuilder,
  ];
};
