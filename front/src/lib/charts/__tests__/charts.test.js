import React from 'react';
import {
  render,
} from '@testing-library/react';

import {
  LineChart,
} from '../';
import {
  xValues, yValues,
} from '../__mock__/data.js';

describe('Testing the functionality of the charts components', () => {
  it('can render without error', () => {
    const App = (props) => {
      return (
        <LineChart
          xValues={ xValues }
          yValues={ yValues }
          rootId='chart-container'
          labels={
            [
              'Test',
            ]
          } />
      );
    };

    const app = render(<App />);
    expect(app).toBeTruthy();
  });
});
