import React, {
  useState, useEffect,
} from 'react';

import {
  useMessage,
} from '@Components/reducers/message';
import {
  FormSelect,
  FormLabel,
  FormWrapper,
  FormInput,
} from '@Components/form';
import {
  ComponentWrapper,
  Text,
  Button,
  AntevortaTypes,
} from '@Common/index';

import {
  useMetisDispatch,
} from '../../../../context';

export const Stack = () => {
  const dispatch = useMetisDispatch();

  const {
    errorMessage,
  } = useMessage();

  const stackTypes = [
    'Gia',
    'Isa',
    'Sipp',
  ];

  const [
    stackType,
    setStackType,
  ] = useState(stackTypes[0]);
  // Can't be used yet but included for completeness
  const [
    person,
    setPerson,
  ] = useState(0);
  const [
    value,
    setValue,
  ] = useState(0.0);

  const resetStackType = () => {
    setStackType(stackTypes[0]);
  };

  const resetOptions = () => {
    setPerson(0);
    setValue(0.0);
  };

  const selectTypeChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    ev.preventDefault();
    setStackType(ev.target.value);
  };

  const selectValueChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    ev.preventDefault();
    setValue(Number(ev.target.value));
  };

  const addButtonClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();

    const stack = {
      person,
      value,
    };

    if (stackType == 'Isa') {
      dispatch({
        type: 'updateStack',
        stack: {
          ...stack,
          stack_type: AntevortaTypes.StackType.Isa,
        }
      });
    } else if (stackType == 'Gia') {
      dispatch({
        type: 'updateStack',
        stack: {
          ...stack,
          stack_type: AntevortaTypes.StackType.Gia,
        }
      });
    } else if (stackType == 'Sipp') {
      dispatch({
        type: 'updateStack',
        stack: {
          ...stack,
          stack_type: AntevortaTypes.StackType.Sipp,
        }
      });
    } else {
      errorMessage('Unknown Stack');
    }
    resetStackType();
    resetOptions();
  };

  useEffect(() => {
    resetOptions();
  }, [
    stackType,
  ]);

  return (
    <ComponentWrapper>
      <Text>Simulations require one Gia, Sipp, and Isa</Text>
      <FormWrapper>
        <FormLabel
          htmlFor="metis-stack-type">
          <Text
            light>
            Type
          </Text>
        </FormLabel>
        <FormSelect
          id="metis-stack-type"
          options={ stackTypes }
          value={ stackType }
          onChange={ selectTypeChange } />
        <FormLabel
          htmlFor="metis-stack-value">
          <Text
            light>
            Value
          </Text>
        </FormLabel>
        <FormInput
          id="metis-stack- value"
          type="number"
          min="0"
          step="1000"
          value={ value }
          onChange={ selectValueChange } />
        <Button
          onClick={ addButtonClick }>
          Add Stack
        </Button>
      </FormWrapper>
    </ComponentWrapper>
  );
};

