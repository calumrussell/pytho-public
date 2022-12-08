import React from 'react';

import {
  Button,
  SectionWrapper,
  ComponentWrapper,
} from '@Common';
import {
  FormWrapper,
} from '@Components/form';
import {
  PortfolioSearch,
} from '@Components/portfolio';
import {
  useSuggest,
} from '@Components/suggest';

import {
  ModelDefinition,
} from './components/modeldefinition';
import {
  useModel,
} from '../../reducers/riskattribution';

export const Builder = (props) => {
  const {
    addDependent,
    addIndependent,
    state,
  } = useModel();

  const {
    searchState,
    clearInput,
    clearOptions,
  } = useSuggest();

  const addSecurityClick = (func, e) => {
    e.preventDefault();
    func(searchState.value);
    clearInput();
    clearOptions();
  };

  return (
    <SectionWrapper>
      <ComponentWrapper>
        <FormWrapper>
          <PortfolioSearch />
          <Button
            disabled={ !searchState.hasSelected }
            onClick={ (e) => addSecurityClick(addIndependent, e) }>
            Add Independent
          </Button>
          <Button
            disabled={ !searchState.hasSelected || state.hasDependent }
            onClick={ (e) => addSecurityClick(addDependent, e) }>
            Add Dependent
          </Button>
        </FormWrapper>
      </ComponentWrapper>
      <ModelDefinition />
    </SectionWrapper>
  );
};
