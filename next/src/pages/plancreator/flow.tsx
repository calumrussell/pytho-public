import React, { useState, useEffect } from "react";

import { useMessage } from "@Components/reducers/message";
import {
  FormSelect,
  FormLabel,
  FormWrapper,
  FormInput,
} from "@Components/form";
import {
  ComponentWrapper,
  Text,
  Button,
  Nullable,
  AntevortaTypes,
} from "@Common/index";

import { ACTIONTYPE } from ".";

interface FlowProps {
  dispatch: React.Dispatch<ACTIONTYPE>;
}

export const Flow = ({ dispatch }: FlowProps) => {
  const { errorMessage } = useMessage();

  // More general versions of the internal enum used, detailed options
  // are set within the screen for each type
  const flowTypes = ["Employment", "Expense"];

  const incomeTypeGrowthOptions = ["None", "Static"];

  const expenseTypeGrowthOptions = ["None", "Inflation-linked"];

  const [flowType, setFlowType] = useState(flowTypes[0]);
  // This can't be changed yet but is included for completeness
  const [person, setPerson] = useState(0);
  // Optional, when pct exists then this should be undefined
  const [flowValue, setFlowValue] = useState(0.0);
  // Optional
  const [staticGrowth, setStaticGrowth] = useState(0.0);
  // Optional
  const [pct, setPct] = useState(0.0);
  // Defaults to false, but is only used for Employment
  const [isPaye, setIsPaye] = useState(false);
  // Defaults to false, but is only used for Expense
  const [isPctOfIncome, setIsPctOfIncome] = useState(false);
  // The first option is the same for both flow types,
  // so we show regardless of state
  const [growthOption, setGrowthOption] = useState(incomeTypeGrowthOptions[0]);
  // Defaults to false, but is only used for Expense
  const [isInflationLinked, setIsInflationLinked] = useState(false);
  // Not user-controlled
  const [growthOptions, setGrowthOptions] = useState(incomeTypeGrowthOptions);

  const resetOptions = () => {
    setPerson(0);
    setFlowValue(0.0);
    setStaticGrowth(0.0);
    setPct(0.0);
    setIsPaye(false);
    setIsPctOfIncome(false);
    setGrowthOption(incomeTypeGrowthOptions[0]);
    setIsInflationLinked(false);
  };

  const selectTypeChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    ev.preventDefault();
    setFlowType(ev.target.value);
    // Reset everything else to default value so that we get predictable state
    resetOptions();
  };

  const selectPayeChange = () => {
    const curr = !isPaye;
    setIsPaye(curr);
  };

  const selectFlowValueChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setFlowValue(Number(ev.target.value));
  };

  const selectGrowthOptionChange = (
    ev: React.ChangeEvent<HTMLInputElement>
  ) => {
    setGrowthOption(ev.target.value);

    // Reset all the state that depends on the growth option,
    // don't reset value
    setPct(0.0);
    setStaticGrowth(0.0);
  };

  const selectStaticGrowthChange = (
    ev: React.ChangeEvent<HTMLInputElement>
  ) => {
    setStaticGrowth(Number(ev.target.value));
  };

  const selectPctOfIncomeChange = () => {
    const curr = !isPctOfIncome;
    setIsPctOfIncome(curr);

    // Reset the value of the any expense dependencies when this changes
    // If the user toggled this state on but had initialized the
    // flow value, that value would persist
    setFlowValue(0.0);
    setPct(0.0);
    // This is not a dependency that is passed through to the back-end
    // but it makes sense to reset this here too
    setGrowthOption(growthOptions[0]);
  };

  const selectPctChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setPct(Number(ev.target.value));
  };

  const addButtonClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();

    const flow = {
      person,
      schedule: {
        schedule_type: AntevortaTypes.ScheduleType.EndOfMonth,
      },
    };

    // Flow for expenses
    if (flowType == "Expense" && pct != undefined) {
      dispatch({
        type: "updateFlow",
        flow: {
          ...flow,
          pct,
          flow_type: AntevortaTypes.FlowType.PctOfIncomeExpense,
        },
      });
      resetOptions();
      return;
    } else if (flowType == "Expense" && isInflationLinked && flowValue) {
      dispatch({
        type: "updateFlow",
        flow: {
          ...flow,
          value: flowValue,
          flow_type: AntevortaTypes.FlowType.InflationLinkedExpense,
        },
      });
      resetOptions();
      return;
    } else if (flowType == "Expense" && flowValue) {
      // Can only be a normal expense by this point
      dispatch({
        type: "updateFlow",
        flow: {
          ...flow,
          value: flowValue,
          flow_type: AntevortaTypes.FlowType.Expense,
        },
      });
      resetOptions();
      return;
    } else if (flowType == "Expense") {
      // This catches all missing values, not just the flowValue
      errorMessage("Empty value");
      return;
    }

    // Flow for income
    if (flowType == "Employment" && isPaye && growthOption === "Static") {
      dispatch({
        type: "updateFlow",
        flow: {
          ...flow,
          static_growth: staticGrowth,
          value: flowValue,
          flow_type: AntevortaTypes.FlowType.EmploymentPAYEStaticGrowth,
        },
      });
      resetOptions();
      return;
    } else if (flowType == "Employment" && growthOption === "Static") {
      dispatch({
        type: "updateFlow",
        flow: {
          ...flow,
          static_growth: staticGrowth,
          value: flowValue,
          flow_type: AntevortaTypes.FlowType.EmploymentStaticGrowth,
        },
      });
      resetOptions();
      return;
    } else if (flowType == "Employment" && isPaye) {
      dispatch({
        type: "updateFlow",
        flow: {
          ...flow,
          value: flowValue,
          flow_type: AntevortaTypes.FlowType.EmploymentPAYE,
        },
      });
      resetOptions();
      return;
    } else if (flowType == "Employment" && flowValue) {
      dispatch({
        type: "updateFlow",
        flow: {
          ...flow,
          value: flowValue,
          flow_type: AntevortaTypes.FlowType.Employment,
        },
      });
      resetOptions();
      return;
    } else if (flowType == "Employment") {
      // This catches all missing values, not just the flowValue
      errorMessage("Empty value");
      return;
    }
  };

  useEffect(() => {
    resetOptions();
    if (flowType === "Employment") {
      setGrowthOptions(incomeTypeGrowthOptions);
    } else {
      setGrowthOptions(expenseTypeGrowthOptions);
    }
  }, [flowType]);

  return (
    <ComponentWrapper>
      <FormWrapper>
        <FormLabel htmlFor="metis-flow-type">
          <Text light>Type</Text>
        </FormLabel>
        <FormSelect
          id="metis-flow-type"
          options={flowTypes}
          value={flowType}
          onChange={selectTypeChange}
        />

        <Nullable condition={flowType === "Employment"}>
          <FormLabel htmlFor="metis-flow-isPaye">
            <Text light>Paye</Text>
          </FormLabel>
          <FormInput
            id="metis-flow-isPaye"
            type="checkbox"
            checked={isPaye}
            onChange={selectPayeChange}
          />
        </Nullable>
        <Nullable condition={flowType === "Expense"}>
          <FormLabel htmlFor="metis-flow-isPct">
            <Text light>Fixed % of Monthly Income</Text>
          </FormLabel>
          <FormInput
            id="metis-flow-isPct"
            type="checkbox"
            checked={isPctOfIncome}
            onChange={selectPctOfIncomeChange}
          />
        </Nullable>
        <Nullable
          condition={
            (flowType === "Employment" || flowType === "Expense") &&
            isPctOfIncome === false
          }
        >
          <FormLabel htmlFor="metis-flow-growth-options">
            <Text light>Growth</Text>
          </FormLabel>
          <FormSelect
            id="metis-flow-growth-options"
            options={growthOptions}
            value={growthOption}
            onChange={selectGrowthOptionChange}
          />
          <FormLabel htmlFor="metis-flow-value">
            <Text light>Value (monthly)</Text>
          </FormLabel>
          <FormInput
            id="metis-flow-value"
            type="number"
            min="1000"
            step="500"
            value={flowValue}
            onChange={selectFlowValueChange}
          />
          <Nullable condition={growthOption == "Static"}>
            <FormLabel htmlFor="metis-flow-growth">
              <Text light>Growth % (i.e. 0.05)</Text>
            </FormLabel>
            <FormInput
              id="metis-flow-growth"
              type="number"
              min="0"
              step="0.01"
              value={staticGrowth}
              onChange={selectStaticGrowthChange}
            />
          </Nullable>
        </Nullable>
        <Nullable condition={isPctOfIncome === true}>
          <FormLabel htmlFor="metis-flow-pct">
            <Text light>Pct % (i.e. 0.05)</Text>
          </FormLabel>
          <FormInput
            id="metis-flow-pct"
            type="number"
            min="0"
            step="0.01"
            value={pct}
            onChange={selectPctChange}
          />
        </Nullable>
        <Button onClick={addButtonClick}>Add Flow</Button>
      </FormWrapper>
    </ComponentWrapper>
  );
};
