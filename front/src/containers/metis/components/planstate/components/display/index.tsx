import React from "react";
import styled from "styled-components";

import {
  CancelIcon,
  Text,
} from '@Common/index';
import {
  AntevortaTypes
} from '@Common/index';

const RowWrapper = styled.div`
  display: flex;
  align-items: center;
  
  > * {
    &:first-child {
      padding-right: 0.5rem;
    }
    &:nth-child(2) {
      padding-right: 0.5rem;
    }
  }
`;

interface FlowProps {
  pos: number;
  flow: AntevortaTypes.Flow;
  removeFunc: (pos: number) => void;
}

export const FlowDisplay = ({
  pos, flow, removeFunc,
}: FlowProps) => {
  const clickCancelIcon = () => {
    removeFunc(pos);
  };

  return (
    <RowWrapper>
      <CancelIcon
        height={ `1rem` }
        width={ `1rem` }
        onClick={ clickCancelIcon } />
      <Text
        small
        light>
        {`${pos}`}
      </Text>
      <Text>
        {flow.flow_type}
      </Text>
    </RowWrapper>
  );
};

interface StackProps {
  pos: number;
  stack: AntevortaTypes.Stack;
  removeFunc: (pos: number) => void;
}

export const StackDisplay = ({
  pos, stack, removeFunc,
}: StackProps) => {
  const clickCancelIcon = () => {
    removeFunc(pos);
  };

  return (
    <RowWrapper>
      <CancelIcon
        height={ `1rem` }
        width={ `1rem` }
        onClick={ clickCancelIcon } />
      <Text
        small
        light>
        {`${pos}`}
      </Text>
      <Text>
        {stack.stack_type}
      </Text>
    </RowWrapper>
  );
};
