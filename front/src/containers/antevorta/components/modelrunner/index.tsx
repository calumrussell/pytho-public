import React, { useState, Dispatch, SetStateAction } from "react"

import {
  Button,
  ComponentWrapper,
  DefaultHorizontalSpacer,
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
  usePortfolio,
  PortfolioBuilder,
  PortfolioLoader,
} from "@Components/portfolio";
import { 
  usePlanStore 
} from "@Components/reducers/planstore";

import {
  useAntevorta,
} from '../../reducers/antevorta';
import { AxiosError } from "axios";

interface ModelInputProps {
  selectedPlanPos: number,
}

export const ModelRunner = ({selectedPlanPos}: ModelInputProps) => {

  if (selectedPlanPos == -1) {
    return null;
  }

  const plan = usePlanStore();
  const antevorta = useAntevorta();

  //Should always return true, not worked out how to get rid of this
  if (plan && antevorta) {
    const {
      state: planState,
    } = plan;

    const {
      simRequest,
    } = antevorta;

    const [runs, setRuns] = useState(5);
    const [simLength, setSimLength] = useState(5);
    const [disabledState, setDisabledState] = useState(false);

    const {
      errorMessage,
    } = useMessage();

    const {
      toggleLoader,
    } = useLoader();


    const {
      displayPortfolio,
      jsonPortfolio,
    } = usePortfolio();

    const inputWrapper = (
      ev: React.ChangeEvent<HTMLInputElement>, 
      setFunc: Dispatch<SetStateAction<number>>) => {
        setFunc(Number(ev.target.value));
    };

    const PortfolioDisplay = displayPortfolio();

    const runnerInput = {
      sim_config: planState.plans[selectedPlanPos].plan,
      runs,
      sim_length: simLength,
      ...jsonPortfolio(),
    };

    const clickButton = (
      ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault();
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

        simRequest(runnerInput, runs, errFunc, finallyFunc);
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
            </FormWrapper>
          </DefaultHorizontalSpacer>
          <Title>Build Portfolio</Title>
            <DefaultHorizontalSpacer>
              <PortfolioBuilder />
              <PortfolioDisplay />
              <PortfolioLoader />
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
  return null;
}
