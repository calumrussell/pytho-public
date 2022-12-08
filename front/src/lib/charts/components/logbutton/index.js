import React from 'react';

import {
  selectAll,
} from 'd3-selection';

import {
  LogButton as LogButtonInner,
} from './style';

export const addButtonHook = (dispatch) => {
  selectAll('.chart-logbutton-element')
      .on('click', (e) => dispatch({
        type: 'logButtonPress',
      }));
};

export const LogButton = (props) => {
  return (
    <>
      <LogButtonInner
        className="chart-logbutton-element">
        Log
      </LogButtonInner>
    </>
  );
};
