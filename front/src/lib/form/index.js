import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

export const FormSelect = (props) => (
  <select
    { ...props }>
    {
      props.options.map((o, i) => (
        <option
          value={ o }
          key={ i }>
          {o}
        </option>
      ))
    }
  </select>
);

FormSelect.propTypes = {
  options: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.element),
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.arrayOf(PropTypes.number),
    PropTypes.string,
  ]).isRequired,
  value: PropTypes.any.isRequired,
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  id: PropTypes.string,
};

export const FormInput = (props) => (
  <input
    { ...props } />
);

export const FormLabel = (props) => {
  return (
    <label
      { ...props }>
      {props.children}
    </label>
  );
};

FormLabel.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.element,
  ]).isRequired,
  htmlFor: PropTypes.string.isRequired,
};

const StyledForm = styled.form`
  input[type="text"], input[type="number"] {
    background-color: transparent;
    box-shadow: none;
    border: 1px solid var(--alt-background-color);
    color: var(--default-text-color);
    padding: 0.5rem 0.5rem;
    border-radius: 0px;
    font-size: 0.9rem;
    width: 100%;
    height: 2rem;

    &:placeholder-shown {
      font-style: italic;
    }
  }

  fieldset {
    border: none;
    padding: 0;
    
    label {
      display: block;
      margin: 0.5rem 0;
    }
  }

  select {
    height: 2rem;
    padding: 0.25rem 0.5rem;
    width: 100%;
    background-color: transparent;
    box-shadow: none;
    border: 1px solid var(--alt-background-color);
    color: var(--alt-text-color);
    font-size: 0.9rem;

    &:first-child {
      margin-top: 0;
      margin-bottom: 0.5rem;
    }

    option {
      color: var(--alt-text-color);
      background-color: var(--default-background-color);
    }

    option:first-child {
      color: var(--alt-text-color);
      background: var(--default-background-color);
    }
  }

  .react-autosuggest__container {
    position: relative;
  }

  .react-autosuggest__input {
    width: 100%;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--alt-background-color);
    border-radius: 4px;
  }

  .react-autosuggest__input--focused {
    outline: none;
  }

  .react-autosuggest__input--open {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .react-autosuggest__suggestions-container {
    display: none;
  }

  .react-autosuggest__suggestions-container--open {
    display: block;
    position: absolute;
    width: 100%;
    border: 1px solid var(--alt-background-color);
    background-color: var(--default-background-color);
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    max-height: 250px;
    overflow-y: auto;
    z-index: 2;
  }

  .react-autosuggest__suggestions-list {
    margin: 0;
    padding: 0;
    list-style-type: none;
  }

  .react-autosuggest__suggestion {
    cursor: pointer;
    padding: 10px 20px;
  }

  .react-autosuggest__suggestion--highlighted {
    background-color: var(--alt-background-color);
  }
`;


export const FormWrapper = (props) => {
  return (
    <StyledForm
      { ...props }>
      <fieldset>
        {props.children}
      </fieldset>
    </StyledForm>
  );
};

FormWrapper.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.element),
    PropTypes.element,
  ]).isRequired,
};
