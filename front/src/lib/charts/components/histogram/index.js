import {
  bin,
} from 'd3-array';

export const histogram = (chartState, xAxis) => {
  const {
    xGetter,
    runs,
  } = chartState.data;

  const sturgeRule = (n) => Math.round(1 + (3.322 * Math.log10(n)));
  return bin()
      .value(xGetter)
      .domain(xAxis.domain())
      .thresholds(xAxis.ticks(sturgeRule(runs)));
};
