import React, { useState } from "react";

import { useUser, useUserDispatch } from "@Components/reducers/user";
import { useMessage } from "@Components/reducers/message";
import { Button, DoubleHorizontalSpacer, Text } from "@Common/index";
import { addPortfolio } from "@Api/index";
import { FormInput, FormLabel, FormWrapper } from "@Components/form";

export const PortfolioSaver = () => {
  const userState = useUser();
  const userDispatch = useUserDispatch();
  const [name, setName] = useState("");
  const { errorMessage } = useMessage();

  const savePortfolio = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();

    if (!userState.isLoggedIn) {
      errorMessage("Must be logged in to save portfolio");
    } else {
      const successFunc = () => {
        userDispatch({ type: 'SAVE_PORTFOLIO', name, portfolio: userState.portfolio });
      };

      const errorFunc = () => {
        errorMessage("Couldn't save portfolio");
      };

      addPortfolio(userState.user, name, userState.portfolio, successFunc, errorFunc);
      setName("");
    }
  };

  if (userState.portfolio.isEmpty) {
    return null;
  } else {
    return (
      <>
        <Text>Save Portfolio</Text>
        <DoubleHorizontalSpacer>
          <FormWrapper>
            <FormLabel
              htmlFor="portfolio-name-input">
              <Text light>Portfolio Name</Text>
            </FormLabel>
            <FormInput
              id="portfolio-name-input"
              type="text"
              value={ name }
              name="name"
              onChange={ (ev: React.ChangeEvent<HTMLInputElement>) => setName(ev.target.value) } />
            <Button
              onClick={savePortfolio}>
                Save
            </Button>
          </FormWrapper>
        </DoubleHorizontalSpacer>
      </>
    )
  }
};