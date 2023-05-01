import React, { useState, useReducer, useEffect } from "react";
import type { api_userportfolio, api_userfinancialplan } from "@prisma/client";
import Link from "next/link";

import { LoaderProvider } from "@Components/reducers/loader";
import {
  Request,
  PageWrapper,
  SectionWrapper,
  Text,
  DefaultHorizontalSpacer,
  ClickableTextHighlightBanner,
  ClickableText,
  ComponentWrapper,
  Title,
  Button,
  AntevortaTypes,
} from "@Common/index";
import prisma from "@Root/lib/prisma";
import { withSessionSsr } from "@Root/lib/session";
import { Main } from "@Components/main";
import { FormInput, FormLabel, FormWrapper } from "@Components/form";
import {
  PortfolioBuild,
  portfolioStateToJson,
  initialState as portfolioInitialState,
  reducer as portfolioReducer,
} from "@Components/portfolio";
import { useMessage } from "@Components/reducers/message";
import { useLoader } from "@Components/reducers/loader";
import { HistogramChart, StackedBarChart } from "@Components/charts";

import { InfoHeader } from "@Containers/incomesim/infoheader";
import { YearlyTable } from "@Containers/incomesim/yearlytable";
import { initialState, reducer, convertStateToSnakeCase } from "@Containers/incomesim/reducer";

interface IncomeSimProps {
  userKey: string | null;
  portfolios: Array<api_userportfolio>;
  plans: Array<api_userfinancialplan>;
}

export const Inner = ({ portfolios, plans }: IncomeSimProps) => {
  //selectedPlan cannot be negative, so -1 is used as null value
  const [selectedPlan, setSelectedPlan] = useState<number>(-1);
  const [state, dispatch] = useReducer(reducer, initialState);

  const [portfolioState, portfolioDispatch] = useReducer(
    portfolioReducer,
    portfolioInitialState
  );

  const { errorMessage } = useMessage();
  const { toggleLoader, renderLoader } = useLoader();

  useEffect(() => {
    if (selectedPlan === -1) {
      dispatch({ type: "CLR_CONFIG" });
    } else {
      const plan = plans[selectedPlan]
        .plan as unknown as AntevortaTypes.FinancialPlan;
      dispatch({ type: "UPDATE", name: "simConfig", value: plan });
    }
  }, [selectedPlan]);

  const selectNewPlan = (pos: number) => {
    setSelectedPlan(pos);
    dispatch({ type: "CLR_RESULTS" });
  };

  const clickRunButton = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();

    if (state.results) {
      dispatch({ type: "CLR_RESULTS" });
    }

    const then = toggleLoader();
    const jsonPortfolio = portfolioStateToJson(portfolioState)();
    const runnerInput = {
      ...convertStateToSnakeCase(state)(),
      ...jsonPortfolio,
    };

    Request.post("/api/incomesim", runnerInput)
      .then((res) => res.json())
      .then((res) => dispatch({ type: "ADD_RESULTS", results: res.data }))
      .catch((err) => errorMessage(err.message))
      .finally(() => then());
  };

  const Loader = renderLoader();

  return (
    <>
      <SectionWrapper>
        <Text focus>Saved Plans</Text>
        <DefaultHorizontalSpacer>
          {plans.length === 0 ? (
            <Text italic>No Saved Plans</Text>
          ) : (
            plans.map((plan, i) => {
              return (
                <ClickableTextHighlightBanner
                  name={plan.name ? plan.name : ""}
                  key={i}
                  pos={i}
                  selected={selectedPlan === i}
                >
                  <ClickableText onClick={() => selectNewPlan(i)}>
                    Select
                  </ClickableText>
                </ClickableTextHighlightBanner>
              );
            })
          )}
        </DefaultHorizontalSpacer>
        <Link href={"/plancreator"}>
          <ClickableText>Create Plan</ClickableText>
        </Link>
      </SectionWrapper>
      {selectedPlan != -1 && (
        <SectionWrapper>
          <ComponentWrapper>
            <Title>Simulation Variables</Title>
            <DefaultHorizontalSpacer>
              <FormWrapper>
                <FormLabel htmlFor="antevorta-modelinput-simlength">
                  <Text light>Simulation Length (yrs)</Text>
                </FormLabel>
                <FormInput
                  id="antevorta-simlength-input"
                  type="number"
                  min="10"
                  max="30"
                  value={state.simLength}
                  name="simLength"
                  onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "UPDATE",
                      name: "simLength",
                      value: Number(ev.target.value),
                    })
                  }
                />
                <FormLabel htmlFor="antevorta-runs-input">
                  <Text light># of runs</Text>
                </FormLabel>
                <FormInput
                  id="antevorta-runs-input"
                  type="number"
                  min="5"
                  max="100"
                  step="5"
                  value={state.runs}
                  name="runs"
                  onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "UPDATE",
                      name: "runs",
                      value: Number(ev.target.value),
                    })
                  }
                />
                <FormLabel htmlFor="antevorta-inflationmu-input">
                  <Text light>Annual inflation average</Text>
                </FormLabel>
                <FormInput
                  id="antevorta-inflationmu-input"
                  type="number"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={state.inflationMu}
                  name="inflationMu"
                  onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "UPDATE",
                      name: "inflationMu",
                      value: Number(ev.target.value),
                    })
                  }
                />
                <FormLabel htmlFor="antevorta-inflationvar-input">
                  <Text light>Annual inflation variance</Text>
                </FormLabel>
                <FormInput
                  id="antevorta-inflationvar-input"
                  type="number"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={state.inflationVar}
                  name="inflationVar"
                  onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "UPDATE",
                      name: "inflationVar",
                      value: Number(ev.target.value),
                    })
                  }
                />
                <FormLabel htmlFor="antevorta-startdate-input">
                  <Text light>Start Date</Text>
                </FormLabel>
                <FormInput
                  id="antevorta-startdate-input"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={state.startDate}
                  name="startDate"
                  onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                    dispatch({
                      type: "UPDATE",
                      name: "startDate",
                      value: ev.target.value,
                    })
                  }
                />
              </FormWrapper>
            </DefaultHorizontalSpacer>
            <Title>Build Portfolio</Title>
            <DefaultHorizontalSpacer>
              <PortfolioBuild
                portfolios={portfolios}
                state={portfolioState}
                dispatch={portfolioDispatch}
              />
            </DefaultHorizontalSpacer>
          </ComponentWrapper>
          <ComponentWrapper>
            <Button disabled={false} onClick={clickRunButton}>
              Run Sim
            </Button>
          </ComponentWrapper>
        </SectionWrapper>
      )}
      {state.results != null && (
        <ComponentWrapper>
          <InfoHeader
            runs={state.runs}
            sample_end={state.results.antevorta.sample_end}
            sample_start={state.results.antevorta.sample_start}
            results={state.results.antevorta.results}
            total_end_value={state.results.total_end_value}
          />
          <DefaultHorizontalSpacer>
            <Text light>
              Distribution of monthly returns across all simulations
            </Text>
            <HistogramChart
              runs={50}
              rootId={"chart-container-histogram"}
              values={state.results.returns.flat()}
            />
          </DefaultHorizontalSpacer>
          <DefaultHorizontalSpacer>
            <Text light>Distribution of total value at simulation end</Text>
            <HistogramChart
              runs={Math.min(5, state.runs / 4)}
              rootId={"all-returns-container-histogram"}
              values={state.results.total_end_value}
            />
          </DefaultHorizontalSpacer>
          <DefaultHorizontalSpacer>
            <Text light>Gross income compositions per simulation year</Text>
            <StackedBarChart
              labels={["net_income", "taxes_paid", "contributions", "expenses"]}
              xValues={state.results.years}
              rootId={"chart-container-gross-income"}
              yValues={state.results.averages}
            />
          </DefaultHorizontalSpacer>
          <YearlyTable
            key={0}
            runs={state.runs}
            years={state.results.years}
            gross_income={state.results.gross_income}
            net_income={state.results.net_income}
            expense={state.results.expense}
            tax_paid={state.results.tax_paid}
            contribution={state.results.contribution}
            returns={state.results.returns}
            values={state.results.investment_values}
            dates={state.results.investment_dates}
          />
        </ComponentWrapper>
      )}
      <Loader />
    </>
  );
};

export default function IncomeSim(props: IncomeSimProps) {
  return (
    <Main userKey={props.userKey}>
      <PageWrapper id="antevorta-main">
        <LoaderProvider>
          <Inner {...props} />
        </LoaderProvider>
      </PageWrapper>
    </Main>
  );
}

export const getServerSideProps = withSessionSsr(
  async function getServerSideProps({ req }) {
    const portfolios = [];
    const plans = [];
    let userKey = null;
    if (req.session.user) {
      if (req.session.user.userKey) {
        userKey = req.session.user.userKey;

        let userPortfolios = await prisma.api_userportfolio.findMany({
          where: {
            user_key: {
              equals: req.session.user.userKey,
            },
          },
        });
        portfolios.push(...userPortfolios);

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
        portfolios,
        plans,
      },
    };
  }
);
