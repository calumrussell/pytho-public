import {
  writeReturn, updateReturn,
} from '../../return';
import {
  addButtonHook, timeButtonUpdater,
} from '../../timebuttons';
import {
  addButtonHook as addLogButtonHook,
} from '../../logbutton';
import {
  axisBuilder, updateAxis, writeAxis,
} from '../../axis';
import {
  lineBuilder, updateLine, writeLine,
} from '../../element';

export const init = ({
  data, ref, rootId,
}) => {
  return {
    data,
    axis: undefined,
    line: undefined,
    isLog: false,
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
  // Build main chart d3 primitives in memory
  const axis = axisBuilder(state);
  const line = lineBuilder(state, axis);

  // Write main chart to UI
  writeAxis(state, axis);
  writeLine(state, line);
  if (state.invariants.hasReturnText) {
    writeReturn(state);
  }
  // Adding hook to time button press
  addButtonHook(dispatch);
  // Adding hook to log button press
  addLogButtonHook(dispatch);

  // Save primitives
  dispatch({
    type: 'init',
    line,
    axis,
  });
};

const findPositionsInValues = (xAxis, xValues, xGetter) => {
  return [
    xAxis.findIndex((d) =>
      xGetter(d).getTime() >= xValues[0].getTime()),
    xAxis.findIndex(
        (d) => xGetter(d).getTime() >= xValues[1].getTime()),
  ];
};

const filterValuesFromPositions = (xAxis, yAxis, positions) => {
  const [
    p0,
    p1,
  ] = positions;
  return [
    xAxis.slice(p0, p1),
    yAxis.map((row) => row.slice(p0, p1)),
  ];
};

const updateChart = (state, x, y) => {
  updateAxis(state, x, y);
  const line = updateLine(state, x, y);
  if (state.invariants.hasReturnText) {
    updateReturn(state, y);
  }
  return line;
};

const logFunc = (state, x, y) => {
  const newYValues = y.map((row) => row.map((v) => Math.log(v)));
  return [
    state,
    x,
    newYValues,
  ];
};

export const reducer = (state, action) => {
  switch (action.type) {
    case 'init': {
      return {
        ...state,
        line: action.line,
        axis: action.axis,
      };
    }
    case 'logButtonPress': {
      const {
        x, y,
      } = state.data;

      let newLine = undefined;
      if (!state.isLog) {
        const [
          ,
          logXValues,
          logYValues,
        ] = logFunc(state, x, y);
        newLine = updateChart(state, logXValues, logYValues);
      } else {
        newLine = updateChart(state, x, y);
      }
      return {
        ...state,
        line: newLine,
        isLog: !state.isLog,
      };
    }
    case 'timeButtonPress': {
      const {
        x, y,
      } = state.data;
      const {
        newSelection,
      } = timeButtonUpdater(action.period, x, y, state);

      const {
        xGetter,
      } = state.data;

      // There is no better way to do this but this binds us
      // to xValues that are dates
      const positions = findPositionsInValues(x, newSelection, xGetter);
      const [
        xValues,
        yValues,
      ] = filterValuesFromPositions(x, y, positions);

      let newLine = undefined;
      if (state.isLog) {
        const [
          ,
          logXValues,
          logYValues,
        ] = logFunc(state, xValues, yValues);
        newLine = updateChart(state, logXValues, logYValues);
      } else {
        newLine = updateChart(state, xValues, yValues);
      }

      return {
        ...state,
        line: newLine,
      };
    }
    default:
      throw new Error('Unknown action');
  }
};
