import {
  select,
} from 'd3-selection';

const tempHardcodedHeight = 20;

export const writeLegend = (chartState) => {
  const {
    data: {
      labels,
    },
    invariants: {
      root,
      rootWrapper,
      colours,
      size: {
        width,
        height,
        margin,
      },
    },
  } = chartState;

  const startpoint = height+margin.top+margin.bottom+10;
  const labelCount = labels.length;
  const legendHeight = labelCount * tempHardcodedHeight;

  select(`#${root}`)
      .attr('viewBox', [
        0,
        0,
        width+margin.left+margin.right,
        height+margin.top+margin.bottom+legendHeight+20,
      ]);

  select(`#${rootWrapper}`)
      .append('g')
      .attr('class', 'chart-legend')
      .selectAll('circle')
      .data(labels)
      .join('circle')
      .attr('cx', 0)
      .attr('cy', (d, i) => startpoint + (i*tempHardcodedHeight))
      .attr('r', 7)
      .style('fill', (d, i) =>
        colours[i%colours.length]);

  select(`#${rootWrapper}`)
      .select('.chart-legend')
      .selectAll('text')
      .data(labels)
      .join('text')
      .attr('x', 15)
      .attr('y', (d, i) => startpoint + (i*tempHardcodedHeight) + 4)
      .text((d) => d)
      .attr('fill', 'var(--default-text-color)')
      .attr('font-family', 'var(--default-font)')
      .attr('font-size', '0.8rem')
      .attr('text-anchor', 'left');
};
