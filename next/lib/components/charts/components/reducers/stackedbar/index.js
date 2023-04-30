import { axisStackBuilder, writeAxis } from "../../axis";
import { writeStackedRect } from "../../element";
import { writeLegend } from "../../legend";

export const init = ({ data, ref, rootId }) => {
  return {
    data,
    axis: undefined,
    invariants: {
      ref,
      colours: [
        "#4e79a7",
        "#f28e2c",
        "#e15759",
        "#76b7b2",
        "#59a14f",
        "#edc949",
        "#af7aa1",
        "#ff9da7",
        "#9c755f",
        "#bab0ab",
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
      axisName: "bar-axis",
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
  writeLegend(state);

  // Save primitives
  dispatch({
    type: "init",
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
    case "init":
      return {
        ...state,
        axis: action.axis,
      };

    default:
      throw new Error("Unknown action");
  }
};
