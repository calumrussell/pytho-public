import { bin } from "d3-array";

export const histogram = (chartState, xAxis) => {
  const { xGetter, runs } = chartState.data;

  return bin()
    .value(xGetter)
    .domain(xAxis.domain())
    .thresholds(xAxis.ticks(runs));
};
