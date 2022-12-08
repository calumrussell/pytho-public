import React, {
  useState,
} from 'react';
import styled from 'styled-components';

import {
  useFPlan,
} from '@Components/reducers/fplan';
import {
  usePlanStore,
} from '@Components/reducers/planstore';
import {
  useMessage,
} from '@Components/reducers/message';
import {
  ComponentWrapper,
  DefaultHorizontalSpacer,
  Text,
  Button,
  MultiSelect,
} from '@Common/index';
import {
  FormWrapper,
  FormInput,
  FormLabel,
} from '@Components/form';

import {
  Flow
} from './components/flow/';
import {
  Stack
} from './components/stack/';
import {
  FlowDisplay,
  StackDisplay,
} from './components/display';

const StackFlowBuilder = styled.div`
  margin: 0.5rem 0rem;
`;

const StackFlowState = styled.div`
  padding-top: 0.5rem;
  padding-bottom: 1rem;
`;

export const PlanState = () => {
  const plan = useFPlan();
  const store = usePlanStore();
  if (plan != undefined && store != undefined) {
    const {
      state,
      removeFlow,
      removeStack,
      updateVar,
      clearPlan,
    } = plan;

    const {
      addPlan,
    } = store;

    const {
      successMessage,
    } = useMessage();

    const [
      planName,
      setPlanName,
    ] = useState('');

    const stacks = state.stacks.map((stack, i) => <StackDisplay
      key={ i }
      pos={ i }
      stack={ stack }
      removeFunc={ removeStack } />);

    const flows = state.flows.map((flow, i) => <FlowDisplay
      key={ i }
      pos={ i }
      flow={ flow }
      removeFunc={ removeFlow } />);

    const changeHandler =
      (ev: React.ChangeEvent<HTMLInputElement>, name: string) => {
        ev.preventDefault();
        updateVar(name, Number(ev.target.value));
      };

    const submitHandler =
      (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault();

        successMessage(`Created ${planName} plan`);
        addPlan(planName, state);
        clearPlan();
        setPlanName('');
      };

    const titles = [
      'Flow',
      'Stack',
    ];

    return (
      <ComponentWrapper>
        <FormWrapper>
          <FormLabel
            htmlFor="metis-plan-name">
            <Text
              light>
              Plan Name
            </Text>
          </FormLabel>
          <FormInput
            id="metis-plan-name"
            type="text"
            value={ planName }
            onChange={
              (ev: React.ChangeEvent<HTMLInputElement>) =>
                setPlanName(ev.target.value)
            } />
          <FormLabel
            htmlFor="metis-state-contribution">
            <Text
              light>
              Contribution Pct
            </Text>
          </FormLabel>
          <FormInput
            id="metis-state-contribution"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={ state.contribution_pct }
            onChange={
              (ev: React.ChangeEvent<HTMLInputElement>) =>
                changeHandler(ev, 'contributionPct')
            } />
          <FormLabel
            htmlFor="metis-state-emergencycash">
            <Text
              light>
              Emergency Cash Min
            </Text>
          </FormLabel>
          <FormInput
            id="metis-state-emergencycash"
            type="number"
            min="0"
            step="1000"
            value={ state.emergency_cash_min }
            onChange={
              (ev: React.ChangeEvent<HTMLInputElement>) =>
                changeHandler(ev, 'emergencyCashMin')
            } />
          <FormLabel
            htmlFor="metis-state-lifetimepensionconts">
            <Text
              light>
              Lifetime Pension Contributions To-date
            </Text>
          </FormLabel>
          <FormInput
            id="metis-state-lifetimepensionconts"
            type="number"
            min="0"
            step="1000"
            value={ state.lifetime_pension_contributions }
            onChange={
              (ev: React.ChangeEvent<HTMLInputElement>) =>
                changeHandler(ev, 'lifetimePensionContributions')
            } />
          <FormLabel
            htmlFor="metis-state-startingcash">
            <Text
              light>
              Starting Cash
            </Text>
          </FormLabel>
          <FormInput
            id="metis-state-startingcash"
            type="number"
            min="0"
            step="1000"
            value={ state.starting_cash }
            onChange={
              (ev: React.ChangeEvent<HTMLInputElement>) =>
                changeHandler(ev, 'startingCash')
            } />

        </FormWrapper>
        <StackFlowBuilder>
          <Text light>Stack/Flow Builder</Text>
          <DefaultHorizontalSpacer>
            <StackFlowState>
              <Text light>
                Stacks:
              </Text>
              <DefaultHorizontalSpacer>
                {stacks.length > 0 ? stacks: <Text italic>No Stacks</Text>}
              </DefaultHorizontalSpacer>
              <Text light>
                Flows:
              </Text>
              <DefaultHorizontalSpacer>
                {flows.length > 0 ? flows : <Text italic>No Flows</Text>}
              </DefaultHorizontalSpacer>
            </StackFlowState>
          </DefaultHorizontalSpacer>
          <DefaultHorizontalSpacer>
              <MultiSelect
                height={ '22rem' }
                titles={ titles }>
              <Flow />
              <Stack />
          </MultiSelect>
          </DefaultHorizontalSpacer>
        </StackFlowBuilder>
        <Button
          onClick={ submitHandler }>
          Add Plan
        </Button>
      </ComponentWrapper>
    );
  }
  return null;
};
