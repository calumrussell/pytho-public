import {
  select,
} from 'd3-selection';
import {
  line,
} from 'd3-shape';
import zip from 'lodash.zip';

export const writeLine = (chartState, line) => {
  const {
    invariants: {
      rootWrapper,
      colours,
    },
    data: {
      y,
    },
  } = chartState;

  select(`#${rootWrapper}`)
      .append('g')
      .attr('class', 'chart-lines')
      .selectAll('path')
      .data(y)
      .join('path')
      .attr('class', 'chart-line')
      .attr('fill', 'none')
      .attr('stroke', (d, i) => colours[i%colours.length])
      .attr('stroke-width', 1.5)
      .attr('d', line);
};

export const updateLine = (chartState, xValues, yValues) => {
  const {
    invariants: {
      rootWrapper,
    },
    data: {
      xGetter,
      yGetter,
    },
    axis,
  } = chartState;

  const [
    x,
    y,
  ] = axis;

  const newLine = line()
      .x((d, i)=> x(xGetter(xValues[i])))
      .y((d) => y(yGetter(d)));

  select(`#${rootWrapper}`)
      .selectAll('.chart-line')
      .data(yValues)
      .attr('d', newLine);

  return newLine;
};

export const lineBuilder = (chartState, axis) => {
  const {
    xGetter,
    yGetter,
    x: xValues,
  } = chartState.data;
  const [
    x,
    y,
  ] = axis;

  return line()
      .x((d, i)=> x(xGetter(xValues[i])))
      .y((d) => y(yGetter(d)));
};

export const writeRect = (chartState, axis) => {
  // Only works with one-dimensional data
  const [
    x,
    y,
  ] = axis;

  const {
    invariants: {
      rootWrapper,
      size: {
        height,
      },
    },
    data: {
      xGetter,
      yGetter,
      x: xValues,
      y: yValues,
    },
  } = chartState;

  const translateFunc = (d) =>
    `translate(0, -2)`;

  select(`#${rootWrapper}`)
      .append('g')
      .attr('class', 'chart-bars')
      .selectAll('rect')
      .data(yValues)
      .enter()
      .append('rect')
      .attr('class', 'chart-bar')
      .attr('transform', translateFunc)
      .attr('x', (d, i) => x(xGetter(xValues[i])))
      .attr('y', (d) => y(yGetter(d)))
      .attr('fill', 'var(--off-background-color)')
      .attr('width', x.bandwidth())
      .attr('height', (d) => height - y(yGetter(d)));
};

export const writeRectHist = (chartState, axis, bins, yGetter) => {
  const [
    x,
    y,
  ] = axis;

  const {
    invariants: {
      rootWrapper,
      size: {
        height,
      },
    },
  } = chartState;

  const translateFunc = (d) =>
    'translate(' + x(d.x0) + ',' + y(yGetter(d)) + ')';

  select(`#${rootWrapper}`)
      .append('g')
      .attr('class', 'chart-bars')
      .selectAll('rect')
      .data(bins)
      .enter()
      .append('rect')
      .attr('class', 'chart-bar')
      .attr('x', 1)
      .attr('transform', translateFunc)
      .attr('fill', 'var(--off-background-color)')
      .attr('stroke', (d, i) => 'var(--default-background-color)')
      .attr('width', (d) => x(d.x1) - x(d.x0) - 1 )
      .attr('height', (d) => height - y(yGetter(d)));
};

export const writeStackedRect = (chartState, axis) => {
  // Only works with one-dimensional data
  const [
    x,
    y,
  ] = axis;

  const {
    invariants: {
      rootWrapper,
      size: {
        height,
      },
    },
    data: {
      xGetter,
      yGetter,
      x: xValues,
      y: yValues,
    },
  } = chartState;

  const translateFunc = (d) =>
    `translate(0, -2)`;

  select(`#${rootWrapper}`)
      .append('g')
      .attr('class', 'chart-bars')
      .selectAll('rect')
      .data(yValues)
      .enter()
      .append('rect')
      .attr('class', 'chart-bar')
      .attr('transform', translateFunc)
      .attr('x', (d, i) => x(xGetter(xValues[i])))
      .attr('y', (d) => y(yGetter(d)))
      .attr('fill', 'var(--off-background-color)')
      .attr('width', x.bandwidth())
      .attr('height', (d) => height - y(yGetter(d)));
};

