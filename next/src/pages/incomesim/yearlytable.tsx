import {
  DefaultHorizontalSpacer,
  Text,
  strConverter,
  strConverterMult,
  dateConverter,
} from "@Common/index";
import { FormSelect, FormWrapper } from "@Components/form";
import { Row, ScrollableTable } from "@Components/table";
import React, { useState } from "react";

interface YearlyTableProps {
  key: number;
  runs: number;
  years: Array<number>;
  gross_income: Array<Array<number>>;
  net_income: Array<Array<number>>;
  expense: Array<Array<number>>;
  contribution: Array<Array<number>>;
  tax_paid: Array<Array<number>>;
  returns: Array<Array<number>>;
  values: Array<Array<number>>;
  dates: Array<number>;
}

export const YearlyTable = ({
  runs,
  years,
  gross_income,
  net_income,
  expense,
  contribution,
  tax_paid,
  returns,
  values,
  dates,
}: YearlyTableProps) => {
  const [run, setRun] = useState(0);

  const annualHeaders = [<Row key={0} values={years} title={"Year"} />];

  const annualRows = [
    <Row
      key={1}
      values={gross_income[run]}
      title={"Gross income"}
      isSubSection={false}
      formattingFunc={strConverter}
    />,
    <Row
      key={2}
      values={net_income[run]}
      title={"Net income"}
      isSubSection={false}
      formattingFunc={strConverter}
    />,
    <Row
      key={3}
      values={expense[run]}
      title={"Expense"}
      isSubSection={false}
      formattingFunc={strConverter}
    />,
    <Row
      key={4}
      values={tax_paid[run]}
      title={"Tax paid"}
      isSubSection={false}
      formattingFunc={strConverter}
    />,
    <Row
      key={5}
      values={contribution[run]}
      title={"Sipp contributions"}
      isSubSection={false}
      formattingFunc={strConverter}
    />,
  ];

  const monthlyHeaders = [
    <Row
      key={6}
      values={dates}
      title={"Month"}
      formattingFunc={dateConverter}
    />,
  ];

  const monthlyRows = [
    <Row
      key={7}
      values={returns[run]}
      title={"Returns"}
      isSubSection={false}
      formattingFunc={strConverterMult}
    />,
    <Row
      key={8}
      values={values[run]}
      title={"Total value"}
      isSubSection={false}
      formattingFunc={strConverter}
    />,
  ];

  const onSelect = (ev: React.ChangeEvent<HTMLInputElement>) => {
    ev.preventDefault();
    setRun(Number(ev.target.value));
  };

  const runIterator = Array.from(Array(runs).keys());

  return (
    <DefaultHorizontalSpacer>
      <Text light>Raw values for simulation run</Text>
      <FormWrapper>
        <FormSelect options={runIterator} onChange={onSelect} />
      </FormWrapper>
      <ScrollableTable headerRows={annualHeaders} bodyRows={annualRows} />
      <ScrollableTable headerRows={monthlyHeaders} bodyRows={monthlyRows} />
    </DefaultHorizontalSpacer>
  );
};
