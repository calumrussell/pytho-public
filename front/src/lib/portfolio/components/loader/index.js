import React, {
  useState,
} from 'react';

import {
  useUser,
} from '@Components/reducers/user';
import {
  usePortfolio,
} from '@Components/portfolio';
import {
  FormLabel,
  FormSelect,
} from '@Components/form';

const wrapperStyle = {};

export const PortfolioLoader = (props) => {
  const [
    selectedPortfolio,
    setSelectedPortfolio,
  ] = useState('');

  const {
    userHasPortfolios,
    getPortfolioNames,
    getPortfolioByName,
  } = useUser();

  const {
    loadPortfolioFromUser,
  } = usePortfolio();

  const selectFunc = (value) => {
    if (value != '') {
      setSelectedPortfolio(value);
      loadPortfolioFromUser(getPortfolioByName(value));
    }
  };

  if (userHasPortfolios()) {
    const portfolioNames = [
      '',
      ...getPortfolioNames(),
    ];
    return (
      <div
        style={ wrapperStyle }>
        <FormLabel>
          Load saved portfolios:
        </FormLabel>
        <FormSelect
          onChange={ (e) => selectFunc(e.target.value) }
          values={ selectedPortfolio }
          options={ portfolioNames } />
      </div>
    );
  }
  return null;
};
