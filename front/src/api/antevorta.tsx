import { AxiosError } from 'axios';

import { AntevortaTypes } from '@Common/index';

import { request } from './request';

export interface AntevortaRequestInput {
  runs: number,
  sim_config: AntevortaTypes.FinancialPlan,
  sim_length: number,
  assets: Array<number>,
  weights: Array<number>
  inflation_mu: number,
  inflation_var: number,
}

export interface AntevortaRequestOutput {
  runs: number,
  values: Array<number>,
}

// Before we send this to server, we perform some error-checking. This is
// partially replicated on the server but we perform part of the same checks.
// Values are controlled through form attributes, so we are checking for logic
// internal to the simulation.
const errorChecker = (state: AntevortaRequestInput): Promise<boolean> => {

  const isInvestmentAccount = (stack_type: AntevortaTypes.StackType) =>
    stack_type == 'Isa' || stack_type == 'Gia' || stack_type == 'Sipp';

  const investmentAccountCount = state.sim_config.stacks.filter((stack: AntevortaTypes.Stack) =>
    isInvestmentAccount(stack.stack_type)).length;

  // If we have all three, and no other stacks then it is 3-0=3
  // If we have two, and no other stacks then it is 2-0=2
  // If we have all three, and one other stack then it is 4-1=3
  // If we have two, and one other stack then it is 3-1=2
  // We can have more than one of each type of investment account too, so we
  // need to test for 3 or more
  if (investmentAccountCount < 2) {
    return Promise.reject('Must have at least one ISA, GIA, and SIPP');
  }
  return Promise.resolve(true);
};

export const antevortaRequest = (input: AntevortaRequestInput, successFunc: (res: AntevortaRequestOutput) => void, errFunc: (err: AxiosError) => void, finallyFunc: () => void) => {
  errorChecker(input)
    .then(() => {
      //convert sim_config property to string
      let sim_config_str = JSON.stringify(input.sim_config);

      request(`/incomesim`)
        .post({ ...input, sim_config: sim_config_str })
        .then((res) => res.data)
        .then((res) => successFunc({runs: input.runs, ...res.data}))
        .catch(errFunc)
        .finally(finallyFunc);
    })
    .catch(errFunc)
};