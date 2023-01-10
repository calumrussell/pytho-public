import React from 'react';
import Autosuggest from 'react-autosuggest';
import PropTypes from 'prop-types';

// Need to re-export useSuggest because there isn't full isolation of suggest
// code within this module.
export {
  useSuggest, SuggestProvider,
} from './reducers/suggest';

import {
  useSuggest,
} from './reducers/suggest';

export const AutoSuggest = ({
  id, selectFunc, renderFunc, searchFunc, getValueFunc, shouldRenderSuggestions,
}) => {
  const {
    state,
    clearOptions,
    updateInput,
    selectValue,
  } = useSuggest();

  const selectSuggestion = (e, {
    suggestion,
  }) => {
    const value = selectFunc(suggestion);
    selectValue(value);
  };

  const renderSuggestion = (item) => renderFunc(item);

  const onInputChange = (e, {
    newValue,
  }) =>
    updateInput(newValue);

  return (
    <Autosuggest
      id={ id }
      suggestions={ state.options }
      shouldRenderSuggestions={ (v) => shouldRenderSuggestions(v) }
      onSuggestionsClearRequested={ () => clearOptions() }
      onSuggestionSelected={ selectSuggestion }
      onSuggestionsFetchRequested={ searchFunc }
      getSuggestionValue={ getValueFunc }
      renderSuggestion={ renderSuggestion }
      inputProps={
        {
          id: id + '-selection',
          placeholder: 'Search Security',
          value: state.input,
          onChange: onInputChange,
        }
      }
    />
  );
};

AutoSuggest.propTypes = {
  id: PropTypes.string.isRequired,
  selectFunc: PropTypes.func.isRequired,
  renderFunc: PropTypes.func.isRequired,
  searchFunc: PropTypes.func.isRequired,
  getValueFunc: PropTypes.func.isRequired,
  shouldRenderSuggestions: PropTypes.func.isRequired,
};
