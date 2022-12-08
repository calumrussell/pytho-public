import {
  writeReturn,
} from '../../return';
import {
  axisBuilder, writeAxis,
} from '../../axis';
import {
  lineBuilder, writeLine,
} from '../../element';
import {
  writeLegend,
} from '../../legend';

export const init = ({
  data, ref, rootId,
}) => {
  return {
    data,
    axis: undefined,
    line: undefined,
    invariants: {
      ref,
      colours: [
        '#90E39A',
        '#F38D68',
        '#1B9AAA',
        '#a05195',
        '#662C91',
        '#F3CA40',
        '#E71D36',
        '#E56B70',
        '#F75C03',
        '#FC6DAB',
      ],
      root: rootId,
      rootWrapper: `${rootId}-chart-wrapper`,
      hasReturnText: true,
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
      axisName: 'chart-axis',
      hasY: true,
    },
  };
};

export const writeGraph = (state, dispatch) => {
  // Build d3 primitives in memory
  const axis = axisBuilder(state);
  const line = lineBuilder(state, axis);

  // Write to UI
  writeAxis(state, axis);
  writeLine(state, line);
  writeLegend(state);
  if (state.hasReturnText) {
    writeReturn(state);
  }

  // Save primitives
  dispatch({
    type: 'init',
    line,
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
    case 'init':
      return {
        ...state,
        axis: action.axis,
        line: action.line,
      };

    default:
      throw new Error('Unknown action');
  }
};
