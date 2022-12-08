import React from 'react';
import PropTypes from 'prop-types';

import {
  useLoader,
} from '@Components/reducers/loader';
import {
  CancelIcon,
  Title,
  Text,
  Button,
  ComponentWrapper,
  DefaultHorizontalSpacer,
} from '@Common';

import {
  useModel,
} from '../../../../reducers/riskattribution';

const renderRemoval = (val, removeFunc) => (
  <CancelIcon
    style={
      {
        paddingRight: '0.25rem',
      }
    }
    onClick={ () => removeFunc(val) } />
);

const VariableRows = ({
  vals, title, removeFunc,
}) => {
  if (Object.keys(vals).length > 0) {
    return (
      <DefaultHorizontalSpacer>
        <Text
          light>
          {title}
        </Text>
        {
          Object.keys(vals).map((v) => {
            return (
              <DefaultHorizontalSpacer
                key={ v }>
                <Text
                  style={
                    {
                      display: 'flex',
                      alignItems: 'center',
                    }
                  }>
                  {renderRemoval(v, removeFunc)}
                  {vals[v].name}
                </Text>
              </DefaultHorizontalSpacer>
            );
          })
        }
      </DefaultHorizontalSpacer>
    );
  } else {
    return null;
  }
};

VariableRows.propTypes = {
  title: PropTypes.string.isRequired,
  vals: PropTypes.object.isRequired,
  removeFunc: PropTypes.func.isRequired,
};

export const ModelDefinition = (props) => {
  const {
    removeDependent,
    removeIndependent,
    runCore,
    runDrawdownEstimator,
    state,
  } = useModel();

  const {
    state: loaderState,
    toggleLoader,
    renderLoader,
  } = useLoader();

  const {
    independent,
    dependent,
    isRunnable,
    hasIndependent,
    hasDependent,
  } = state;

  const Loader = renderLoader();

  if (hasIndependent || hasDependent) {
    let depToObj = {};
    if (hasDependent) {
      depToObj = {
        [dependent.id]: dependent,
      };
    }
    return (
      <ComponentWrapper>
        <Title>
          Model Definition
        </Title>
        <DefaultHorizontalSpacer>
          <VariableRows
            removeFunc={ removeDependent }
            title={ 'Dependent' }
            vals={ depToObj } />
          <VariableRows
            removeFunc={ removeIndependent }
            title={ 'Independent' }
            vals={ independent } />
        </DefaultHorizontalSpacer>
        <div>
          <Button
            disabled={ loaderState.isLoading || !isRunnable }
            onClick={ () => runCore(toggleLoader()) }>
            Run Core
          </Button>
          <Button
            disabled={ loaderState.isLoading || !isRunnable }
            onClick={ () => runDrawdownEstimator(toggleLoader()) }>
            Run Drawdown
          </Button>
        </div>
        <div>
          <Loader />
        </div>
      </ComponentWrapper>
    );
  }
  return null;
};
