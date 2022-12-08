import {
  select,
} from 'd3-selection';

const returnCalculator = (data, yGetter) => {
  const result = (yGetter(data[data.length - 1]) / yGetter(data[0])) - 1;
  return parseFloat(result*100).toFixed(2);
};

const tempHardcodedHeight = 20;

export const writeReturn = (chartState) => {
  const {
    data: {
      yGetter,
      y,
    },
    invariants: {
      colours,
      rootWrapper,
    },
  } = chartState;

  const periodReturns = y.map((y) => returnCalculator(y, yGetter));

  const startpoint = 15;

  select(`#${rootWrapper}`)
      .append('g')
      .attr('class', 'chart-periodperf')
      .selectAll('text')
      .data(periodReturns)
      .join('text')
      .attr('class', 'chart-periodperf-text')
      .attr('x', 30)
      .attr('y', (d, i) => (i * tempHardcodedHeight) + startpoint + 3)
      .attr('fill', 'var(--default-text-color)')
      .attr('font-family', 'var(--default-font)')
      .attr('font-size', '0.8rem')
      .attr('dy', '.15em')
      .text((d) => ` ${d}%`);

  select(`#${rootWrapper}`)
      .select('.chart-periodperf')
      .selectAll('circle')
      .data(periodReturns)
      .join('circle')
      .attr('cx', 20)
      .attr('cy', (d, i) => startpoint + (i*tempHardcodedHeight))
      .attr('r', 5)
      .style('fill', (d, i) => colours[i%colours.length]);
};

export const updateReturn = (chartState, yValues) => {
  const {
    data: {
      yGetter,
    },
    invariants: {
      rootWrapper,
    },
  } = chartState;

  const periodReturns = yValues.map((y) => returnCalculator(y, yGetter));

  select(`#${rootWrapper}`)
      .selectAll('.chart-periodperf-text')
      .data(periodReturns)
      .text((d) => ` ${d}%`);
};

