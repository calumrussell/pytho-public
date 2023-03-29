import React, { useState, Dispatch, SetStateAction } from "react"

import {
  Button,
  ComponentWrapper,
  DefaultHorizontalSpacer,
  PortfolioTypes,
  Text,
  Title,
} from '@Common/index';
import {
  FormLabel,
  FormInput,
  FormWrapper,
} from '@Components/form';
import {
  useMessage
} from '@Components/reducers/message';
import {
  useLoader
} from '@Components/reducers/loader';
import { 
  PortfolioDisplay,
  PortfolioBuilder,
} from "@Components/portfolio";
import { 
  useUser
} from "@Components/reducers/user";
import {
  antevortaRequest
} from "@Api/index";

import {
  useAntevorta,
  useAntevortaDispatch,
} from '../../context';
import { AxiosError } from "axios";
import { AntevortaRequestOutput } from "@Api/antevorta";

interface ModelInputProps {
  selectedPlanPos: number,
}

const jsonPortfolio = (portfolio: PortfolioTypes.Portfolio) => ({
  'assets': portfolio.assets.map((i) => i.id),
  'weights': portfolio.weights.map((i) => i/100),
});

export const ModelRunner = ({selectedPlanPos}: ModelInputProps) => {

  if (selectedPlanPos == -1) {
    return null;
  }

  const userState = useUser();
  const antevortaState = useAntevorta();
  const antevortaDispatch = useAntevortaDispatch();

  const [runs, setRuns] = useState(5);
  const [simLength, setSimLength] = useState(5);
  const [inflationMu, setInflationMu] = useState(2);
  const [inflationVar, setInflationVar] = useState(2);
  const [disabledState, setDisabledState] = useState(false);

  const {
    errorMessage,
  } = useMessage();

  const {
    toggleLoader,
  } = useLoader();

  const inputWrapper = (
    ev: React.ChangeEvent<HTMLInputElement>, 
    setFunc: Dispatch<SetStateAction<number>>) => {
      setFunc(Number(ev.target.value));
  };

  const clickButton = (
    ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();

      if (antevortaState.results) {
        antevortaDispatch({type: 'clearResults'})
      }

      const runnerInput = {
        sim_config: userState.plans[selectedPlanPos].plan,
        runs,
        sim_length: simLength,
        inflation_mu: inflationMu / 100.0,
        inflation_var: inflationVar / 100.0,
        ...jsonPortfolio(userState.portfolio),
      };

      setDisabledState(true);
      const stop = toggleLoader();

      const errFunc = (err: AxiosError) => {
        errorMessage(err.message);
        stop();
      };

      const finallyFunc = () => {
        setDisabledState(false);
        stop();
      };

      const successFunc = (results: AntevortaRequestOutput) => {
        antevortaDispatch({type: "addResults", results})
      }

      antevortaRequest(runnerInput, successFunc, errFunc, finallyFunc);
  };

  return (
    <React.Fragment>
      <ComponentWrapper>
        <Title>Simulation Variables</Title>
        <DefaultHorizontalSpacer>
          <FormWrapper>
            <FormLabel
              htmlFor="antevorta-modelinput-simlength">
              <Text light>Simulation Length (yrs)</Text>
            </FormLabel>
            <FormInput
              id="antevorta-simlength-input"
              type="number"
              min="10"
              max="30"
              value={ simLength }
              name="simLength"
              onChange={ 
                (ev: React.ChangeEvent<HTMLInputElement>) => 
                  inputWrapper(ev, setSimLength) } />
            <FormLabel
              htmlFor="antevorta-runs-input">
              <Text light># of runs</Text>
            </FormLabel>
            <FormInput
              id="antevorta-runs-input"
              type="number"
              min="5"
              max="100"
              step="5"
              value={ runs }
              name="runs"
              onChange={ 
                (ev: React.ChangeEvent<HTMLInputElement>) => 
                  inputWrapper(ev, setRuns) } />
            <FormLabel
              htmlFor="antevorta-inflationmu-input">
              <Text light>Annual inflation average</Text>
            </FormLabel>
            <FormInput
              id="antevorta-inflationmu-input"
              type="number"
              min="-10"
              max="10"
              step="0.5"
              value={ inflationMu }
              name="inflationMu"
              onChange={ 
                (ev: React.ChangeEvent<HTMLInputElement>) => 
                  inputWrapper(ev, setInflationMu ) } />
              <FormLabel
              htmlFor="antevorta-inflationvar-input">
              <Text light>Annual inflation variance</Text>
            </FormLabel>
            <FormInput
              id="antevorta-inflationvar-input"
              type="number"
              min="-10"
              max="10"
              step="0.5"
              value={ inflationVar }
              name="inflationVar"
              onChange={ 
                (ev: React.ChangeEvent<HTMLInputElement>) => 
                  inputWrapper(ev, setInflationVar) } />
          </FormWrapper>
        </DefaultHorizontalSpacer>
        <Title>Build Portfolio</Title>
          <DefaultHorizontalSpacer>
            <PortfolioBuilder />
            <PortfolioDisplay />
          </DefaultHorizontalSpacer>
      </ComponentWrapper>
      <ComponentWrapper>
        <Button 
          disabled={disabledState}
          onClick={clickButton}>
            Run Sim
        </Button>
      </ComponentWrapper>
    </React.Fragment>
  )
}
