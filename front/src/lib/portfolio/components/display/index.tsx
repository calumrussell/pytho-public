import React from "react";
import styled from "styled-components";
import zip from 'lodash.zip';

import { DefaultHorizontalSpacer, Text, CancelIcon, PortfolioTypes, DoubleHorizontalSpacer } from "@Common/index";
import { useUser, useUserDispatch } from "@Components/reducers/user";

const RowSpacer = styled(DefaultHorizontalSpacer)`
  display: flex;
  align-items: center;
`;

const Wrapper = styled.div`
  margin: 1rem 0rem;
`

export const PortfolioDisplay = () => {

  const userState = useUser();
  const userDispatch = useUserDispatch();

  const {
    assets,
    weights,
    isEmpty
  } = userState.portfolio;

  const removeFunc = (idx: number) => {
    userDispatch({ type: 'RMV_ASSET', idx });
  }

  if (isEmpty) {
    return null;
  } else {
    const zipped: [PortfolioTypes.Security | undefined,  number | undefined][] = zip<PortfolioTypes.Security, number>(assets, weights);

    return (
      <Wrapper>
      {
        zipped.map((data, idx) => {
          return (
            <React.Fragment
              key={ idx }>
              <RowSpacer>
                <CancelIcon
                  style={{paddingRight: '0.25rem'}}
                  data-testid="backtest-removeassetbutton"
                  value={idx.toString()}
                  onClick={ () => removeFunc(idx) } />
                <Text
                  style={{paddingRight: '0.5rem'}}
                  small>
                  {`${data[1]} %`}
                </Text>
                <Text>
                  { data[0] === undefined ? "" : data[0].name }
                </Text>
              </RowSpacer>
            </React.Fragment>
          )
        })
      }
      </Wrapper>
    )
  }
}
  