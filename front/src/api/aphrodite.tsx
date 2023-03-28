import { AxiosError } from 'axios';

import { PortfolioTypes } from '@Common/index';

import { request } from './request';

export interface AphroditeRequestInput {
  portfolio: PortfolioTypes.Portfolio,
}

export interface AphroditeRequestOutput {}

export const aphroditeRequest = (input: AphroditeRequestInput, successFunc: (res: AphroditeRequestOutput) => void, errFunc: (err: AxiosError) => void, finallyFunc: () => void) => {
  request(`/backtest`)
    .post({...input})
    .then((res) => res.data)
    .then((res) => successFunc(res))
    .catch(errFunc)
    .finally(finallyFunc);
};