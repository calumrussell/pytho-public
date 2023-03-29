import { AxiosError } from 'axios';

import { request } from './request';

export interface AphroditeRequestInput {
  assets: Array<number>,
  weights: Array<number>,
}

export interface AphroditeRequestOutput {
  cagr: number,
  dates: Array<number>,
  mdd: number,
  ret: number,
  sharpe: number,
  values: Array<number>,
  vol: number,
}

export const aphroditeRequest = (input: AphroditeRequestInput, successFunc: (res: AphroditeRequestOutput) => void, errFunc: (err: AxiosError) => void, finallyFunc: () => void) => {
  request(`/backtest`)
    .post({...input})
    .then((res) => res.data)
    .then((res) => successFunc(res))
    .catch(errFunc)
    .finally(finallyFunc);
};