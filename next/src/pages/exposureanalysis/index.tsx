import React, { useReducer, useState } from "react";
import zip from "lodash.zip";

import { useLoader, LoaderProvider } from "@Components/reducers/loader";
import { useMessage } from "@Components/reducers/message";
import { useSuggest, SuggestProvider } from "@Components/suggest";
import { withSessionSsr } from "@Root/lib/session";
import { Main } from "@Components/main";
import {
  CancelIcon,
  DefaultHorizontalSpacer,
  Text,
  Button,
  ComponentWrapper,
  Title,
  Request,
  annualiseMonthlyRet,
  strConverter,
  strConverterMult,
  NumberWithTitle,
  PortfolioTypes,
  AthenaTypes,
} from "@Common/index";
import { FormWrapper } from "@Components/form";
import { PortfolioSearch } from "@Components/portfolio";
import { LineChart } from "@Components/charts";

import { reducer, initialState } from "@Containers/exposureanalysis/reducer";

interface FormattedCoreResults {
  coreCoefs: number[];
  annualizedRets: number[];
  annualizedAlpha: number[];
  rollingDates: number[];
  rollingCoefs: number[][];
}
const resultBuilder = (res: AthenaTypes.ModelResults) => ({
  coreCoefs: res.core.regression.coefs,
  annualizedRets: res.core.avgs.map(annualiseMonthlyRet),
  annualizedAlpha: res.core.regression.coefs.map(annualiseMonthlyRet),
  rollingDates: res.rolling.dates,
  rollingCoefs: res.rolling.regressions.coefs.map((coef: number[]) =>
    coef.map(annualiseMonthlyRet)
  ),
});

const Inner = () => {
  const [exposure, exposureDispatch] = useReducer(reducer, initialState);
  const [results, setResults] = useState<FormattedCoreResults | null>(null);
  const { state: searchState, clearInput, clearOptions } = useSuggest();
  const { state: loaderState, toggleLoader, renderLoader } = useLoader();
  const { errorMessage } = useMessage();

  const addSecurityClick = (
    func: (val: PortfolioTypes.Security) => void,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    func(searchState.value);
    clearInput();
    clearOptions();
  };

  const runCore = (finallyFunc: () => void) => {
    const { independents, dependent } = exposure;

    if (results) {
      setResults(null);
    }

    // This shouldn't happen in normal use because the button shouldn't be clickable in invalid state
    if (dependent === null || independents.length === 0) {
      errorMessage("Missing inputs");
    } else {
      const indString = independents.map((v) => `ind=${v.id}`);
      const riskAttrQs = indString.join("&") + `&dep=${dependent.id}`;

      return Request.get(`/api/riskattribution?${riskAttrQs}`)
        .then((res) => res.json())
        .then((res) => res.data)
        .then((res) => setResults(resultBuilder(res)))
        .catch((_err) => errorMessage("Risk attribution failed"))
        .finally(finallyFunc);
    }
  };

  const Loader = renderLoader();

  const transpose = (matrix: number[][]) => {
    return matrix[0].map((_col, i) => matrix.map((row) => row[i]));
  };

  return (
    <>
      <FormWrapper>
        <PortfolioSearch />
        <Button
          disabled={!searchState.hasSelected}
          onClick={(e) =>
            addSecurityClick(
              (val: PortfolioTypes.Security) =>
                exposureDispatch({ type: "ADD_IND", security: val }),
              e
            )
          }
        >
          Add Independent
        </Button>
        <Button
          disabled={!searchState.hasSelected || exposure.dependent != null}
          onClick={(e) =>
            addSecurityClick(
              (val: PortfolioTypes.Security) =>
                exposureDispatch({ type: "ADD_DEP", security: val }),
              e
            )
          }
        >
          Add Dependent
        </Button>
      </FormWrapper>

      {(exposure.dependent != null || exposure.independents.length != 0) && (
        <ComponentWrapper>
          <Title>Model Definition</Title>
          {exposure.independents.length > 0 && (
            <DefaultHorizontalSpacer>
              <Title>Independents</Title>
              {exposure.independents.map((ind, i) => {
                return (
                  <DefaultHorizontalSpacer key={i}>
                    <span style={{ display: "flex" }}>
                      <CancelIcon
                        style={{
                          paddingRight: "0.25rem",
                        }}
                        onClick={() =>
                          exposureDispatch({ type: "DEL_IND", idx: i })
                        }
                      />
                      <Text light>{ind.name}</Text>
                    </span>
                  </DefaultHorizontalSpacer>
                );
              })}
            </DefaultHorizontalSpacer>
          )}
          {exposure.dependent && (
            <DefaultHorizontalSpacer>
              <Title>Dependent</Title>
              <DefaultHorizontalSpacer>
                <span style={{ display: "flex" }}>
                  <CancelIcon
                    style={{
                      paddingRight: "0.25rem",
                    }}
                    onClick={() => exposureDispatch({ type: "DEL_DEP" })}
                  />
                  <Text light>{exposure.dependent.name}</Text>
                </span>
              </DefaultHorizontalSpacer>
            </DefaultHorizontalSpacer>
          )}
          <Button
            disabled={
              loaderState.isLoading ||
              exposure.dependent === null ||
              exposure.independents.length === 0
            }
            onClick={() => runCore(toggleLoader())}
          >
            Run Core
          </Button>
        </ComponentWrapper>
      )}
      {results && exposure.dependent != null && (
        <>
          <Text light>{exposure.dependent.name}</Text>
          <DefaultHorizontalSpacer>
            <NumberWithTitle
              hasPercentage
              title={"Alpha"}
              number={strConverterMult(results.annualizedAlpha[0])}
            />
            <NumberWithTitle
              hasPercentage
              title={"Avg Ret"}
              number={strConverterMult(results.annualizedRets[0])}
            />
          </DefaultHorizontalSpacer>
        </>
      )}
      {results && (
        <LineChart
          rootId={"chart-container-exposure-alpha"}
          labels={["Alpha"]}
          xValues={results.rollingDates}
          yValues={[results.rollingCoefs.map((coefs) => coefs[0])]}
        />
      )}
      {results &&
        zip(results.annualizedRets, results.coreCoefs).map((data, i) => {
          //First one is intercept
          if (i == 0) return null;

          if (data[0] != undefined && data[1] != undefined) {
            return (
              <>
                <Text light>{exposure.independents[i - 1].name}</Text>
                <DefaultHorizontalSpacer>
                  <NumberWithTitle
                    title={"Coef"}
                    number={strConverter(data[1])}
                  />
                  <NumberWithTitle
                    hasPercentage
                    title={"Avg Ret"}
                    number={strConverterMult(data[0])}
                  />
                </DefaultHorizontalSpacer>
              </>
            );
          }
        })}
      {results && (
        <LineChart
          rootId={"chart-container-exposure-coefs"}
          labels={exposure.independents.map((i) => i.name)}
          xValues={results.rollingDates}
          yValues={transpose(
            results.rollingCoefs.map((coefs) => coefs.slice(1))
          )}
        />
      )}
      <div>
        <Loader />
      </div>
    </>
  );
};

interface ExposureAnalysisProps {
  userKey: string;
}

export default function ExposureAnalysis(props: ExposureAnalysisProps) {
  return (
    <Main userKey={props.userKey} id="riskattribution-main">
      <LoaderProvider>
        <SuggestProvider>
          <Inner />
        </SuggestProvider>
      </LoaderProvider>
    </Main>
  );
}

export const getServerSideProps = withSessionSsr(
  async function getServerSideProps({ req }) {
    let userKey = null;
    if (req.session.user) {
      if (req.session.user.userKey) {
        userKey = req.session.user.userKey;
      }
    }

    return {
      props: {
        userKey,
      },
    };
  }
);
