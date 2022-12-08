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
        issuer: 'Random Issuer',
        currency: 'GBP',
        ticker: null,
        security_type: 'fund',
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
      {
        id: 14653,
        country_name: 'united kingdom',
        name: 'Random Name 2',
        issuer: 'Random Issuer',
        currency: 'GBP',
        ticker: null,
        security_type: 'fund',
      },
    ],
  },
};

const attributionResponse = {
  'regression': {
    'intercept': 0.06163120754054625,
    'coefficients': [
      {
        'asset': 14651,
        'coef': 0.043669512767151614,
        'error': -1,
      },
      {
        'asset': 14652,
        'coef': 0.043669512767151614,
        'error': -1,
      },
    ],
  },
  'avgs': [
    {
      'asset': 14653,
      'avg': 0.05815491559086397,
    },
    {
      'asset': 14652,
      'avg': 0.064170804369414,
    },
    {
      'asset': 14651,
      'avg': 0.064170804369414,
    },
  ],
  'min_date': 1504742400,
  'max_date': 1634860800,
};

const rollingAttributionResponse = {
  'regressions': [
    {
      'intercept': 0.08807134600022838,
      'coefficients': [
        {
          'asset': 14651,
          'coef': 0.0018892282843539971,
          'error': -1,
        },
        {
          'asset': 14652,
          'coef': 0.0018892282843539971,
          'error': -1,
        },
        {
          'asset': 14652,
          'coef': 0.0018892282843539971,
          'error': -1,
        },
        {
          'asset': 14652,
          'coef': 0.0018892282843539971,
          'error': -1,
        },
        {
          'asset': 14652,
          'coef': 0.0018892282843539971,
          'error': -1,
        },
      ],
    },
  ],
  'averages': [
    [
      {
        'asset': 14653,
        'avg': 0.14455555555555558,
      },
      {
        'asset': 14651,
        'avg': 0.08834444444444446,
      },
      {
        'asset': 14652,
        'avg': 0.08834444444444446,
      },
    ],
    [
      {
        'asset': 14653,
        'avg': 0.14455555555555558,
      },
      {
        'asset': 14651,
        'avg': 0.08834444444444446,
      },
      {
        'asset': 14652,
        'avg': 0.08834444444444446,
      },
    ],
    [
      {
        'asset': 14653,
        'avg': 0.14455555555555558,
      },
      {
        'asset': 14651,
        'avg': 0.08834444444444446,
      },
      {
        'asset': 14652,
        'avg': 0.08834444444444446,
      },
    ],
    [
      {
        'asset': 14653,
        'avg': 0.14455555555555558,
      },
      {
        'asset': 14651,
        'avg': 0.08834444444444446,
      },
      {
        'asset': 14652,
        'avg': 0.08834444444444446,
      },
    ],
    [
      {
        'asset': 14653,
        'avg': 0.14455555555555558,
      },
      {
        'asset': 14651,
        'avg': 0.08834444444444446,
      },
      {
        'asset': 14652,
        'avg': 0.08834444444444446,
      },
    ],
  ],
  'min_date': 1516579200,
  'max_date': 1634860800,
  'dates': [
    1516579200,
    1516665600,
    1516752000,
    1516838400,
    1516924800,
  ],
};

const bootstrapAttributionResponse = {
  'intercept': {
    'asset': 14653,
    'lower': 0.06677430106368215,
    'upper': 0.07719520261692232,
  },
  'coefficients': [
    {
      'asset': 14651,
      'lower': 0.008057180129875741,
      'upper': 0.02192814568990405,
    },
    {
      'asset': 14652,
      'lower': 0.008057180129875741,
      'upper': 0.02192814568990405,
    },
  ],
};

const errorResponse = {
  'response': {
    'data': {
      'status': 'false',
      'message': 'Error Message',
    },
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
  it('can add dependent', async () => {
    axios.get.mockReturnValue(Promise.resolve(securitySearchResponse));

    const app = render(<AppWithMessage />);
    await addAssetProcess(app, 'Random Name', 'Add Dependent');

    expect(app.getByText('Random Name')).toBeTruthy();
  });

  it('can add independent', async () => {
    axios.get.mockReturnValue(Promise.resolve(securitySearchResponse));

    const app = render(<AppWithMessage />);
    await addAssetProcess(app, 'Random Name', 'Add Independent');

    expect(app.getByText('Random Name')).toBeTruthy();
  });

  it('can add multiple assets & security search input will clear', async () => {
    axios.get.mockReturnValue(Promise.resolve(securitySearchResponse));

    const app = render(<AppWithMessage />);
    const initialValue = app.getByPlaceholderText('Search Security').value;
    expect(initialValue).toBeFalsy();

    await addAssetProcess(app, 'Random Name', 'Add Independent');
    await addAssetProcess(app, 'Random Name', 'Add Independent');

    const searchTextValue = app.getByPlaceholderText('Search Security').value;
    expect(searchTextValue).toBeFalsy();
  });

  it('can run the core model and display the results', async () => {
    axios.get.mockReturnValue(Promise.resolve(securitySearchResponse));

    const app = render(<AppWithMessage />);
    await addAssetProcess(app, 'Random Name', 'Add Independent');
    await addAssetProcess(app, 'Random Name 1', 'Add Independent');
    await addAssetProcess(app, 'Random Name 2', 'Add Dependent');

    const riskResponse = {
      data: {
        core: attributionResponse,
        rolling: rollingAttributionResponse,
        bootstrap: bootstrapAttributionResponse,
      },
    };

    axios.get.mockReturnValue(Promise.resolve(riskResponse));
    await userEvent.click(app.getByText('Run Core'));
    await waitFor(() => app.getByTestId('riskattribution-modelresults'));
  });

  it('can run the core model and display errors', async () => {
    axios.get.mockReturnValue(Promise.resolve(securitySearchResponse));

    const app = render(<AppWithMessage />);
    await addAssetProcess(app, 'Random Name', 'Add Independent');
    await addAssetProcess(app, 'Random Name 1', 'Add Independent');
    await addAssetProcess(app, 'Random Name 2', 'Add Dependent');

    axios.get.mockReturnValue(Promise.reject(errorResponse));
    await userEvent.click(app.getByText('Run Core'));
    await waitFor(() => app.getByText('Error Message'));
  });
});
