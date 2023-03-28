import React, {
  useState,
} from 'react';

import {
  Text,
  Button,
} from '@Common';
import {
  FormWrapper,
  FormLabel,
  FormInput,
} from '@Components/form';
import {
  PortfolioSearch,
} from '@Components/portfolio';
import {
  SuggestProvider,
  useSuggest,
} from '@Components/suggest';
import {
  useUserDispatch
} from '@Components/reducers/user';

export const BuilderForm = (props) => {
  const [
    weight,
    setWeight,
  ] = useState(10);

  const {
    state,
    clearInput,
    clearOptions,
  } = useSuggest();

  const userDispatch = useUserDispatch();

  const isFinished = weight != '' && state.hasSelected;

  const addSecurity = (e) => {
    e.preventDefault();
    userDispatch({
      type: 'ADD_PORTFOLIO',
      asset: state.value,
      weight,
    })
    clearInput()
    clearOptions();
  };

  return (
    <FormWrapper>
      <PortfolioSearch />
      <FormLabel
        htmlFor="aphrodite-weight">
        <Text
          light>
          Portfolio Weight (%)
        </Text>
      </FormLabel>
      <FormInput
        id="aphrodite-weight"
        data-testid="backtest-weight-input"
        type="number"
        min="0"
        max="100"
        step="10"
        name="weight"
        value={ weight }
        onChange={ (e) => setWeight(Number(e.target.value)) } />
      <Button
        disabled={ !isFinished }
        onClick={ addSecurity }>
        Add to portfolio
      </Button>
    </FormWrapper>
  );
};

export const PortfolioBuilder = (props) => {
  return (
    <SuggestProvider>
      <BuilderForm />
    </SuggestProvider>
  )
}