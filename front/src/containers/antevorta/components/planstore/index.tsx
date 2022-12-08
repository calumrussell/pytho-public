import React from 'react';
import styled from 'styled-components';
import {
  Link,
} from 'react-router-dom';

import {
  CancelIcon,
  DefaultHorizontalSpacer,
  ClickableText,
  Text,
  ComponentWrapper,
} from '@Common/index';

import {
  usePlanStore,
} from '@Components/reducers/planstore';

interface PlanProps {
  name: string,
  pos: number
  key: number,
  selected: boolean,
  removeFunc: (pos: number) => void,
  selectFunc: (pos: number) => void,
}

interface PlanWrapperProps {
  selected: boolean,
}

const PlanWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${({
    selected,
  }: PlanWrapperProps) => selected ?
  'var(--alt-background-color)':
    'transparent'
};
  padding: 0.5rem 1rem; 
  margin: 0.5rem 0;
`;

const PlanWrapperLeft = styled.div`
  display: flex;
  align-items: center;
  > * {
    &:first-child {
      padding-right: 0.5rem;
    }
    &:nth-child(2) {
      padding-right: 0.25rem;
    }
  }
`;

const Plan = ({
  name, pos, removeFunc, selectFunc, selected,
}: PlanProps) => {
  return (
    <PlanWrapper
      selected={ selected }>
      <PlanWrapperLeft>
        <CancelIcon
          onClick={ () => removeFunc(pos) } />
        <Text
          light>
          {pos}
        </Text>
        <Text>
          {name}
        </Text>
      </PlanWrapperLeft>
      <ClickableText
        onClick={ () => selectFunc(pos) }>
        Select
      </ClickableText>
    </PlanWrapper>
  );
};

const PlanStoreWrapper = styled.div`
  a {
    text-decoration: none;
    color: inherit;
  }
`;


interface PlanStoreProps {
  selectPlanFunc: (pos: number) => void,
  selectedPlan: number,
}

export const PlanStore = ({selectPlanFunc, selectedPlan}: PlanStoreProps) => {
  const plan = usePlanStore();
  if (plan) {
    const {
      state,
      removePlan,
    } = plan;

    const plans = state.plans.map((plan, i) => {
      return (
        <Plan
          { ...plan }
          key={ i }
          pos={ i }
          removeFunc={ removePlan }
          selectFunc={ selectPlanFunc }
          selected={ selectedPlan===i } />
      );
    });

    return (
      <ComponentWrapper>
        <PlanStoreWrapper>
          <Text
            focus>
            Saved Plans
          </Text>
          <DefaultHorizontalSpacer>
            { plans }
            {
              state.plans.length === 0 && (
                <Text
                  italic>
                  No saved plans
                </Text>
              )
            }
          </DefaultHorizontalSpacer>
          <Link
            to={ '/plancreator' }>
            <ClickableText>
              Create Plan
            </ClickableText>
          </Link>
        </PlanStoreWrapper>
      </ComponentWrapper>
    );
  }
  return null;
};
