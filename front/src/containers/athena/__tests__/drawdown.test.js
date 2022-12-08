import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';

import {
  AthenaApp as App,
} from '../index.js';
import {
  Message,
} from '@Components/common';
import {
  MessageProvider,
} from '@Components/reducers/message';

jest.mock('axios');

const securitySearchResponse = {
  data: {
    coverage: [
      {
        id: 14651,
        country_name: 'united kingdom',
        name: 'Random Name',
        issuer: null,
        currency: null,
        ticker: null,
        security_type: 'factor',
      },
      {
        id: 14652,
        country_name: 'united kingdom',
        name: 'Random Name 1',
        issuer: 'Random Issuer',
        currency: 'GBP',
        ticker: null,
        security_type: 'fund',
      },
    ],
  },
};

const drawdownResponse = {
  'data': {
    'regressions': {
      'intercept': -0.0057701036360144784,
      'coefficients': [
        {
          'asset': 14651,
          'coef': 0.9913676620350585,
          'error': 0.0012590927535879857,
        },
      ],
    },
    'drawdowns': [
      {
        'start': '1931-05-09 00:00:00',
        'end': '1931-06-26 00:00:00',
        'mean': -0.1973080307454303,
        'stdev': 0.00023523221848118783,
        'count': 500,
      },
      {
        'start': '1931-06-29 00:00:00',
        'end': '1935-09-10 00:00:00',
        'mean': -0.6752459276304429,
        'stdev': 0.0005197034189404239,
        'count': 500,
      },
      {
        'start': '1937-11-03 00:00:00',
        'end': '1938-01-08 00:00:00',
        'mean': -0.13593655507234076,
        'stdev': 0.00017316010331398722,
        'count': 500,
      },
      {
        'start': '1938-01-17 00:00:00',
        'end': '1938-06-28 00:00:00',
        'mean': -0.2745270332872076,
        'stdev': 0.00031608592523858797,
        'count': 500,
      },
      {
        'start': '1938-08-26 00:00:00',
        'end': '1938-10-04 00:00:00',
        'mean': -0.11685646888344414,
        'stdev': 0.0001509581524577692,
        'count': 500,
      },
      {
        'start': '1939-01-05 00:00:00',
        'end': '1939-03-09 00:00:00',
        'mean': -0.11053841880086608,
        'stdev': 0.00013940538117378334,
        'count': 500,
      },
      {
        'start': '1939-03-11 00:00:00',
        'end': '1939-09-07 00:00:00',
        'mean': -0.20439844938466484,
        'stdev': 0.0002447193707280391,
        'count': 500,
      },
      {
        'start': '1940-04-09 00:00:00',
        'end': '1943-01-30 00:00:00',
        'mean': -0.3097464935439497,
        'stdev': 0.00036358712791332995,
        'count': 500,
      },
    ],
  },
};

const AppWithMessage = (props) => {
  return (
    <MessageProvider>
      <Message />
      <App />
    </MessageProvider>
  );
};

const errorResponse = {
  'response': {
    'data': {
      'status': 'false',
      'message': 'Error Message',
    },
  },
};

const addAssetProcess = async (app, assetName, click) => {
  const dropId = 'portfoliosearch-securitytype-dropdown';

  fireEvent.change(app.getByTestId(dropId), {
    target: {
      value: 'index',
    },
  });
  const securityInput = app.getByPlaceholderText('Search Security');
  userEvent.type(securityInput, 'Random Name');
  await waitFor(() => app.findAllByText('Random Name'));

  await userEvent.click(app.getAllByText(assetName)[0]);
  await userEvent.click(app.getByText(click));
};

describe('Testing the functionality of the main app', () => {
  it('can run the drawdown estimator', async () => {
    axios.get.mockReturnValue(Promise.resolve(securitySearchResponse));

    const app = render(<AppWithMessage />);
    await addAssetProcess(app, 'Random Name', 'Add Independent');
    await addAssetProcess(app, 'Random Name 1', 'Add Dependent');

    axios.get.mockReturnValue(Promise.resolve(drawdownResponse));
    await userEvent.click(app.getByText('Run Drawdown'));
    await waitFor(() => app.getByTestId('riskattribution-modelresults'));
  });

  it('it can display errors', async () => {
    axios.get.mockReturnValue(Promise.resolve(securitySearchResponse));

    const app = render(<AppWithMessage />);
    await addAssetProcess(app, 'Random Name', 'Add Independent');
    await addAssetProcess(app, 'Random Name 1', 'Add Dependent');

    axios.get.mockReturnValue(Promise.reject(errorResponse));
    await userEvent.click(app.getByText('Run Drawdown'));
    await waitFor(() => app.getByText('Error Message'));
  });
});

