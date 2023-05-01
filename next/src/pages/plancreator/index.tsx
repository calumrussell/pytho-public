import React, { useReducer, useState } from "react";
import styled from "styled-components";
import { useRouter } from "next/router";
import { api_userfinancialplan } from "@prisma/client";

import {
  SectionWrapper,
  AntevortaTypes,
  ComponentWrapper,
  Text,
  ClickableTextHighlightBanner,
  ClickableText,
  Request,
  CancelIcon,
  Button,
  DefaultHorizontalSpacer,
  MultiSelect,
} from "@Common/index";
import { withSessionSsr } from "@Root/lib/session";
import prisma from "@Root/lib/prisma";
import { Main } from "@Components/main";
import { FormInput, FormLabel, FormWrapper } from "@Components/form";
import { useMessage } from "@Components/reducers/message";

import { Flow } from "@Containers/plancreator/flow";
import { Stack } from "@Containers/plancreator/stack";
import { reducer, initialState } from "@Containers/plancreator/reducer";

const RowWrapper = styled.div`
  display: flex;
  align-items: center;

  > * {
    &:first-child {
      padding-right: 0.5rem;
    }
    &:nth-child(2) {
      padding-right: 0.5rem;
    }
  }
`;

interface PlanCreatorProps {
  userKey: string;
  plans: Array<api_userfinancialplan>;
}

export const Inner = (props: PlanCreatorProps) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [planName, setPlanName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(-1);
  const router = useRouter();

  const { successMessage, errorMessage } = useMessage();

  const stacks = state.stacks.map((stack, i) => (
    <RowWrapper key={i}>
      <CancelIcon
        height={`1rem`}
        width={`1rem`}
        onClick={() => dispatch({ type: "removeStack", pos: i })}
      />
      <Text small light>
        {`${i}`}
      </Text>
      <Text>{stack.stack_type}</Text>
    </RowWrapper>
  ));

  const flows = state.flows.map((flow, i) => (
    <RowWrapper key={i}>
      <CancelIcon
        height={`1rem`}
        width={`1rem`}
        onClick={() => dispatch({ type: "removeFlow", pos: i })}
      />
      <Text small light>
        {`${i}`}
      </Text>
      <Text>{flow.flow_type}</Text>
    </RowWrapper>
  ));

  const changeHandler = (
    ev: React.ChangeEvent<HTMLInputElement>,
    name: string
  ) => {
    ev.preventDefault();
    dispatch({ type: "updateVar", name, value: Number(ev.target.value) });
  };

  const submitHandler = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();

    const planObj = {
      name: planName,
      plan: state,
    };

    Request.post("/api/plan/post", planObj)
      .then(() => {
        successMessage(`Created ${planName} plan`);
        dispatch({ type: "clearPlan" });
        setPlanName("");
        router.reload();
      })
      .catch(() => {
        errorMessage(`Failed to create ${planName} plan`);
      });
  };

  const loadSavedPlanFromServer = (
    plan: AntevortaTypes.FinancialPlan,
    name: string,
    pos: number
  ) => {
    if (selectedPlan === pos) {
      dispatch({ type: "clearPlan" });
      setPlanName("");
      setSelectedPlan(-1);
    } else {
      dispatch({ type: "loadPlan", plan });
      setPlanName(name);
      setSelectedPlan(pos);
    }
  };

  const removeSavedPlanFromServer = (name: string) => {
    Request.remove(`/api/plan/delete?name=${name}`)
      .then(() => {
        successMessage(`Successfully deleted ${planName} plan`);
        router.reload();
      })
      .catch(() => {
        errorMessage(`Failed to delete ${planName} plan`);
      });
  };

  const titles = ["Flow", "Stack"];

  return (
    <SectionWrapper>
      <ComponentWrapper>
        <Text focus>Existing Plans</Text>
        {props.plans.map((plan, i) => {
          const typedPlan =
            plan.plan as unknown as AntevortaTypes.FinancialPlan;
          const alwaysName = plan.name ? plan.name : "";
          return (
            <ClickableTextHighlightBanner
              name={alwaysName}
              key={i}
              pos={i}
              selected={selectedPlan === i}
            >
              <div>
                <ClickableText
                  onClick={() =>
                    loadSavedPlanFromServer(typedPlan, alwaysName, i)
                  }
                >
                  Select
                </ClickableText>
                <ClickableText
                  onClick={() => removeSavedPlanFromServer(alwaysName)}
                >
                  Delete
                </ClickableText>
              </div>
            </ClickableTextHighlightBanner>
          );
        })}
        <FormWrapper>
          <FormLabel htmlFor="metis-plan-name">
            <Text light>Plan Name</Text>
          </FormLabel>
          <FormInput
            id="metis-plan-name"
            type="text"
            value={planName}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
              setPlanName(ev.target.value)
            }
          />
          <FormLabel htmlFor="metis-state-contribution">
            <Text light>Contribution Pct</Text>
          </FormLabel>
          <FormInput
            id="metis-state-contribution"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={state.contribution_pct}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
              changeHandler(ev, "contribution_pct")
            }
          />
          <FormLabel htmlFor="metis-state-emergencycash">
            <Text light>Emergency Cash Min</Text>
          </FormLabel>
          <FormInput
            id="metis-state-emergencycash"
            type="number"
            min="0"
            step="1000"
            value={state.emergency_cash_min}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
              changeHandler(ev, "emergency_cash_min")
            }
          />
          <FormLabel htmlFor="metis-state-lifetimepensionconts">
            <Text light>Lifetime Pension Contributions To-date</Text>
          </FormLabel>
          <FormInput
            id="metis-state-lifetimepensionconts"
            type="number"
            min="0"
            step="1000"
            value={state.lifetime_pension_contributions}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
              changeHandler(ev, "lifetime_pension_contributions")
            }
          />
          <FormLabel htmlFor="metis-state-startingcash">
            <Text light>Starting Cash</Text>
          </FormLabel>
          <FormInput
            id="metis-state-startingcash"
            type="number"
            min="0"
            step="1000"
            value={state.starting_cash}
            onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
              changeHandler(ev, "starting_cash")
            }
          />
        </FormWrapper>
        <div>
          <Text light>Stack/Flow Builder</Text>
          <DefaultHorizontalSpacer>
            <div style={{ paddingTop: "0.5rem", paddingBottom: "1rem" }}>
              <Text light>Stacks:</Text>
              <DefaultHorizontalSpacer>
                {stacks.length > 0 ? stacks : <Text italic>No Stacks</Text>}
              </DefaultHorizontalSpacer>
              <Text light>Flows:</Text>
              <DefaultHorizontalSpacer>
                {flows.length > 0 ? flows : <Text italic>No Flows</Text>}
              </DefaultHorizontalSpacer>
            </div>
          </DefaultHorizontalSpacer>
          <DefaultHorizontalSpacer>
            <MultiSelect titles={titles}>
              <Flow dispatch={dispatch} />
              <Stack dispatch={dispatch} />
            </MultiSelect>
          </DefaultHorizontalSpacer>
        </div>
        <Button onClick={submitHandler}>Add Plan</Button>
      </ComponentWrapper>
    </SectionWrapper>
  );
};

export default function PlanCreator(props: PlanCreatorProps) {
  return (
    <Main userKey={props.userKey}>
      <Inner {...props} />
    </Main>
  );
}

export const getServerSideProps = withSessionSsr(
  async function getServerSideProps({ req }) {
    const plans = [];
    let userKey = null;
    if (req.session.user) {
      if (req.session.user.userKey) {
        userKey = req.session.user.userKey;

        let userPlans = await prisma.api_userfinancialplan.findMany({
          where: {
            user_key: {
              equals: req.session.user.userKey,
            },
          },
        });
        plans.push(...userPlans);
      }
    }

    return {
      props: {
        userKey,
        plans,
      },
    };
  }
);
