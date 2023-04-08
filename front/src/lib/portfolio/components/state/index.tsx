import React from "react";

import { useUser } from "@Components/reducers/user";
import { Text, ClickableText, DoubleHorizontalSpacer } from "@Common/index";
import styled from "styled-components";
import zip from "lodash.zip";
import { useUserDispatch } from "@Components/reducers/user";
import { removePortfolio } from "@Api/index";
import { useMessage } from "@Components/reducers/message";

const Row = styled.div`
  display: flex;
  flex-direction: horizontal;
  justify-content: space-between;
`;

const ButtonWrapper = styled.div`
  display: flex;
  flex-direction: horiztonal;
`

export const PortfolioState = () => {
  const userState = useUser();
  const userDispatch = useUserDispatch();
  const { errorMessage} = useMessage();

  const loadSavedPortfolio = (idx: number) => {
    let savedPortfolio = userState.portfolios[idx];

    userDispatch({ type: 'CLR_PORTFOLIO' });
    zip(savedPortfolio.portfolio.assets, savedPortfolio.portfolio.weights).map((val) => {
      if (val[0] != undefined && val[1] != undefined ) {
        userDispatch({ type: 'ADD_PORTFOLIO', asset: val[0], weight: val[1]});
      }
    });
  };

  const deleteSavedPortfolio = (name: string, idx: number) => {
    const successFunc = () => {
      userDispatch({ type: 'RMV_PORTFOLIO', idx });
    };

    const errorFunc = () => {
      errorMessage(`Delete of ${name} failed`);
    }

    removePortfolio(userState.user, name, successFunc, errorFunc);
  };

  return (
    <>
      <Text>Saved Portfolios</Text>
      { userState.portfolios.length === 0 ? <Text light italic>No saved portfolios</Text>: null}
      <DoubleHorizontalSpacer>
        {
          userState.portfolios.map((portfolio, idx) => {
            return (
              <React.Fragment
                key={idx}>
                  <Row>
                    <Text
                      style={{ marginRight: '0.5rem' }}
                      light>
                      {idx + '.' + '   ' + portfolio.name}
                    </Text>
                    <ButtonWrapper>
                      <ClickableText
                        style={{ paddingRight: '0.5rem' }}
                        onClick={() => deleteSavedPortfolio(portfolio.name, idx)}>
                          Delete
                      </ClickableText>
                      <ClickableText
                        onClick={() => loadSavedPortfolio(idx)}>
                        Load
                      </ClickableText>
                    </ButtonWrapper>
                  </Row>
              </React.Fragment>
            )
          })
        }
      </DoubleHorizontalSpacer>
    </>
  )
};