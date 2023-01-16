import {
  axisStackBuilder, writeAxis,
} from '../../axis';
import {
  writeStackedRect,
} from '../../element';

export const init = ({
  data, ref, rootId,
}) => {
  return {
    data,
    axis: undefined,
    invariants: {
      ref,
      colours: [
        '#90E39A',
      ],
      root: rootId,
      rootWrapper: `${rootId}-bar-wrapper`,
      size: {
        margin: {
          top: 10,
          right: 30,
          bottom: 20,
          left: 60,
        },
        width: 800,
        height: 430,
      },
      axisName: 'bar-axis',
      hasY: true,
    },
  };
};

export const writeGraph = (state, dispatch) => {
  // Build d3 primitives in memory
  // Binning function requires an x axis to calculate a yaxis but axisBuilder
  // requires both at the same stage
  // So we have to build x and y axis sequentially running binner inbetween.
  const axis = axisStackBuilder(state);

  // Write to UI
  writeAxis(state, axis);
  // No build stage for rectangles
  writeStackedRect(state, axis);

  // Save primitives
  dispatch({
    type: 'init',
    axis,
  });
};


/*
Because d3 has dependencies in the build step, we need to break
up the initialization into creating the graph in memory, and then
writing to the UI once we have all the pieces. Axis always has
to go first.
*/
export const reducer = (state, action) => {
  switch (action.type) {
    // Special case for histogram because we need to add the bins
    // data and the yGetter
    case 'init':
      return {
        ...state,
        axis: action.axis,
      };

    default:
      throw new Error('Unknown action');
  }
};
