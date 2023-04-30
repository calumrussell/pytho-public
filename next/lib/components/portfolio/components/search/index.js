import React, { useState } from "react";
import styled from "styled-components";

import { FormSelect, FormLabel } from "@Components/form";
import { Text } from "@Common/index";
import { AutoSuggest, useSuggest } from "@Components/suggest";

const SearchResultsWrapper = styled.span`
  display: flex;
  justify-content: space-between;
`;

export const PortfolioSearch = (props) => {
  const securityTypes = ["security", "factor"];

  const [securityType, setSecurityType] = useState("fund");

  const onSecurityTypeInputChange = (e) => setSecurityType(e.target.value);

  const { getOptions } = useSuggest();

  const selectFunc = (suggestion) => suggestion;

  const searchSecurityFunc = (input) => {
    const value = input.value;
    const url = `/api/suggest?s=${encodeURIComponent(value)}`;
    const copy = {
      ...input,
      url,
    };
    getOptions(copy);
  };

  const renderFunc = (val) => {
    return (
      <>
        <SearchResultsWrapper>
          <Text>{val.name}</Text>
          <Text>{val.currency}</Text>
        </SearchResultsWrapper>
        <SearchResultsWrapper>
          <Text light>{val.issuer}</Text>
          <Text light>{val.ticker}</Text>
        </SearchResultsWrapper>
      </>
    );
  };

  const getValueFunc = (val) => val.name;

  const shouldRenderSuggestions = (val) => val.trim().length > 2;

  return (
    <>
      <FormLabel htmlFor="portfoliosearch-securitytype">
        <Text light>Security Type</Text>
      </FormLabel>
      <FormSelect
        id="portfoliosearch-securitytype"
        data-testid="portfoliosearch-securitytype-dropdown"
        value={securityType}
        options={securityTypes}
        onChange={onSecurityTypeInputChange}
      />
      <FormLabel htmlFor="portfoliosearch-asset">
        <Text light>Asset</Text>
        <Text light italic>
          Can search by asset name or ticker. Ticker format shown in results.
        </Text>
      </FormLabel>
      <AutoSuggest
        id="portfoliosearch-asset"
        selectFunc={selectFunc}
        shouldRenderSuggestions={shouldRenderSuggestions}
        searchFunc={searchSecurityFunc}
        renderFunc={renderFunc}
        getValueFunc={getValueFunc}
      />
    </>
  );
};
