import React, {
  useState,
} from 'react';
import PropTypes from 'prop-types';

import {
  FormInput,
} from '@Components/form';
import {
  Button,
} from '@Common';
import {
  usePortfolio,
} from '@Components/portfolio';
import {
  useUser,
} from '@Components/reducers/user';


export const PortfolioSaver = ({
  showSaver, setShowSaver,
}) => {
  if (showSaver) {
    const [
      portfolioName,
      setPortfolioName,
    ] = useState('');

    const {
      state,
    } = usePortfolio();

    const {
      savePortfolio,
    } = useUser();

    const portfolioSaver = () => {
      savePortfolio(state.portfolio, portfolioName);
      setShowSaver(false);
    };

    return (
      <div>
        <FormInput
          type="text"
          name="portfolio-name"
          value={ portfolioName }
          onChange={ (e) => setPortfolioName(e.target.value) } />
        <Button
          onClick={ () => portfolioSaver() }>
          Save
        </Button>
      </div>
    );
  } else {
    return null;
  }
};

PortfolioSaver.propTypes = {
  showSaver: PropTypes.bool.isRequired,
  setShowSaver: PropTypes.func.isRequired,
};
