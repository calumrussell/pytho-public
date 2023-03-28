import axios, { AxiosError } from "axios";

import { AthenaTypes } from "@Common/index";

import { request } from './request';

export interface AthenaRequestInput {
  independents: AthenaTypes.Independents,
  dependent: AthenaTypes.Security,
}

export interface AthenaRequestOutput {}

export const athenaCoreRequest = (input: AthenaRequestInput, successFunc: (res: AthenaRequestOutput) => void, errFunc: (err: AxiosError) => void, finallyFunc: () => void ) => {
  const {
    independents, dependent,
  } = input;

  const indString = Object.keys(independents).map((v) => `ind=${v}`);
  const riskAttrQs = indString.join('&') + `&dep=${dependent.id}`;

  request(`/riskattribution?${riskAttrQs}`)
    .get()
    .then((res) => res.data)
    .then((res) => successFunc(res))
    .catch(errFunc)
    .finally(finallyFunc);
};
