import React from 'react';
import {
  render,
} from 'react-dom';

import {
  App,
} from './containers/zeus';

const appEl = document.getElementById('app');
render(<App />, appEl);
