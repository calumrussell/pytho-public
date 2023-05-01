import React, { useState } from "react";
import zip from "lodash.zip";
import styled from "styled-components";
import { useRouter } from "next/router";

import {
  Button,
  CancelIcon,
  ClickableText,
  DefaultHorizontalSpacer,
  PortfolioTypes,
  Request,
  Text,
} from "@Common/index";
import { FormInput, FormLabel, FormWrapper } from "@Components/form";
import { SuggestProvider, useSuggest } from "@Components/suggest";
import { useMessage } from "@Components/reducers/message";
import type { api_userportfolio } from "@prisma/client";

import { PortfolioSearch } from "../search";
import { PortfolioState, ACTIONTYPE } from "../reducer";

const RowSpacer = styled(DefaultHorizontalSpacer)`
  display: flex;
  align-items: center;
`;

const Row = styled.div`
  display: flex;
  flex-direction: horizontal;
  justify-content: space-between;
`;

const ButtonWrapper = styled.div`
  display: flex;
  flex-direction: horiztonal;
`;

interface BuildProps {
  portfolios: Array<api_userportfolio>;
  state: PortfolioState;
  dispatch: React.Dispatch<ACTIONTYPE>;
}

const Inner = ({ portfolios, state, dispatch }: BuildProps) => {
  //We only need the weight because the security is taken from the suggest state
  //If we set this to null, console.error about uncontrolled components
  const [weight, setWeight] = useState<number | string>("");

  //Name of the portfolio for saving
  const [portfolioName, setPortfolioName] = useState<string>("");

  const zippedPortfolio: [
    PortfolioTypes.Security | undefined,
    number | undefined
  ][] = zip<PortfolioTypes.Security, number>(state.assets, state.weights);

  const { state: suggestState, clearInput, clearOptions } = useSuggest();
  const { successMessage, errorMessage } = useMessage();
  const router = useRouter();

  const isFinished = weight != 0 && suggestState.hasSelected;

  const changeWeightInput = (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (ev.target.value === "") {
      setWeight("");
    } else {
      setWeight(Number(ev.target.value));
    }
  };

  const addSecurityToPortfolioState = (
    ev: React.MouseEvent<HTMLButtonElement>
  ) => {
    //If the weight is null, we fail silently, user cannot add security with empty weight
    if (typeof weight != "string") {
      //From suggest
      const asset = suggestState.value;
      dispatch({ type: "ADD_SECURITY", asset, weight });
      //Clear state to default
      setWeight("");
      clearInput();
      clearOptions();
    }
  };

  const removeSecurityFromPortfolioState = (idx: number) => {
    dispatch({ type: "RMV_SECURITY", pos: idx });
  };

  const loadSavedPortfolioIntoPortfolioState = (idx: number) => {
    dispatch({ type: "CLR" });

    //We are inserting the data so it should never be malformed, and the reason to move over
    //to nextJS was to remove all the types everywhere.
    const selectedPortfolio = portfolios[idx].portfolio as any;
    zip(selectedPortfolio.assets, selectedPortfolio.weights).map((pos) => {
      dispatch({
        type: "ADD_SECURITY",
        asset: pos[0] as PortfolioTypes.Security,
        weight: pos[1] as number,
      });
    });

    const name = portfolios[idx].name;
    if (name == null) {
      setPortfolioName("");
    } else {
      setPortfolioName(name);
    }
  };

  const deleteSavedPortfolioFromServer = (name: string | null, idx: number) => {
    //Should trigger page re-load
    Request.remove(`/api/portfolio/delete?name=${name}`)
      .then(async (res) => {
        successMessage(`${name} portfolio deleted`);
        router.reload();
      })
      .catch((err) => errorMessage(`${name} portfolio deletion failed`));
  };

  const savePortfolioToServer = async (
    ev: React.MouseEvent<HTMLButtonElement>
  ) => {
    const payload = {
      portfolio: state,
      name: portfolioName,
    };

    Request.post(`/api/portfolio/post`, payload)
      .then(async (res) => {
        successMessage(`${portfolioName} portfolio created`);
        router.reload();
      })
      .catch((err) =>
        errorMessage(`${portfolioName} portfolio creation failed`)
      );
  };

  return (
    <>
      <FormWrapper>
        <PortfolioSearch />
        <FormLabel htmlFor="aphrodite-weight">
          <Text light>Portfolio Weight (%)</Text>
        </FormLabel>
        <FormInput
          id="aphrodite-weight"
          data-testid="backtest-weight-input"
          type="number"
          min="0"
          max="100"
          step="10"
          name="weight"
          value={weight}
          onChange={changeWeightInput}
        />
        <Button disabled={!isFinished} onClick={addSecurityToPortfolioState}>
          Add to portfolio
        </Button>
      </FormWrapper>
      {state.assets.length != 0 &&
        zippedPortfolio.map((data, idx) => {
          return (
            <React.Fragment key={idx}>
              <RowSpacer>
                <CancelIcon
                  style={{ paddingRight: "0.25rem" }}
                  data-testid="backtest-removeassetbutton"
                  onClick={() => removeSecurityFromPortfolioState(idx)}
                />
                <Text style={{ paddingRight: "0.5rem" }} small>
                  {`${data[1]} %`}
                </Text>
                <Text>{data[0] === undefined ? "" : data[0].name}</Text>
              </RowSpacer>
            </React.Fragment>
          );
        })}
      {state.assets.length != 0 && (
        <>
          <Text>Save Portfolio</Text>
          <FormWrapper>
            <FormLabel htmlFor="portfolio-name-input">
              <Text light>Portfolio Name</Text>
            </FormLabel>
            <FormInput
              id="portfolio-name-input"
              type="text"
              value={portfolioName}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                setPortfolioName(ev.target.value)
              }
            />
            <Button onClick={savePortfolioToServer}>Save</Button>
          </FormWrapper>
        </>
      )}
      <Text>Saved Portfolios</Text>
      {portfolios.length === 0 ? (
        <Text light italic>
          No saved portfolios
        </Text>
      ) : null}
      {portfolios.map((portfolio, idx) => {
        return (
          <React.Fragment key={idx}>
            <Row>
              <Text style={{ marginRight: "0.5rem" }} light>
                {idx + "." + "   " + portfolio.name}
              </Text>
              <ButtonWrapper>
                <ClickableText
                  style={{ paddingRight: "0.5rem" }}
                  onClick={() =>
                    deleteSavedPortfolioFromServer(portfolio.name, idx)
                  }
                >
                  Delete
                </ClickableText>
                <ClickableText
                  onClick={() => loadSavedPortfolioIntoPortfolioState(idx)}
                >
                  Load
                </ClickableText>
              </ButtonWrapper>
            </Row>
          </React.Fragment>
        );
      })}
    </>
  );
};

export const PortfolioBuild = (props: BuildProps) => {
  return (
    <SuggestProvider>
      <Inner {...props} />
    </SuggestProvider>
  );
};
