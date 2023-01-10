import React, {
  useState,
} from 'react';
import PropTypes from 'prop-types';

import {
  FormWrapper,
  FormLabel,
  FormInput,
} from '@Components/form';
import {
  PortfolioSearch,
  usePortfolio,
} from '@Components/portfolio';
import {
  Text,
  Button,
} from '@Common';
import {
  useSuggest,
} from '@Components/suggest';

export const BuilderForm = ({
  isEmpty,
  onClickSave,
}) => {
  const [
    weight,
    setWeight,
  ] = useState(10);

  const {
    addToPortfolio,
  } = usePortfolio();

  const {
    state,
    clearInput,
    clearOptions,
  } = useSuggest();

  const isFinished = weight != '' && state.hasSelected;

  const addSecurity = (e) => {
    e.preventDefault();
    addToPortfolio(state.value, weight);
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
      <Button
        disabled={ isEmpty }
        onClick={ onClickSave }>
        Save portfolio
      </Button>
    </FormWrapper>
  );
};

BuilderForm.propTypes = {
  isEmpty: PropTypes.bool.isRequired,
  onClickSave: PropTypes.func.isRequired,
};
