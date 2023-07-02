import React from "react";
import styled from "styled-components";

import {
  strConverterCurr,
  strConverter,
  NumberWithTitle,
  strConverterMult,
  AntevortaTypes,
} from "@Common/index";
import { dateConverter } from "@Common/index";
import { StaticTable, Row } from "@Components/table";

interface InfoHeaderProps {
  runs: number;
  results: Array<AntevortaTypes.AntevortaStandardSimulationOutput>;
  total_end_value: Array<number>;
  sample_start: number;
  sample_end: number;
}

const RowWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  margin: 1rem 0;
`;

export const InfoHeader = ({
  results,
  total_end_value,
  runs,
  sample_end,
  sample_start,
}: InfoHeaderProps) => {
  const mdds = results.map((r) => r.mdd);
  const avg_mdd = mdds.reduce((acc, curr) => acc + curr, 0) / mdds.length;
  //Have to flip these around because mdd is negative
  const min_mdd = mdds.reduce(
    (acc, curr) => (acc > curr ? acc : curr),
    avg_mdd
  );
  const max_mdd = mdds.reduce(
    (acc, curr) => (acc < curr ? acc : curr),
    avg_mdd
  );

  const vols = results.map((r) => r.vol);
  const avg_vol = vols.reduce((acc, curr) => acc + curr, 0) / vols.length;
  const min_vol = vols.reduce(
    (acc, curr) => (acc < curr ? acc : curr),
    avg_vol
  );
  const max_vol = vols.reduce(
    (acc, curr) => (acc > curr ? acc : curr),
    avg_vol
  );

  const cagrs = results.map((r) => r.cagr);
  const avg_cagr = cagrs.reduce((acc, curr) => acc + curr, 0) / cagrs.length;
  const min_cagr = cagrs.reduce(
    (acc, curr) => (acc < curr ? acc : curr),
    avg_cagr
  );
  const max_cagr = cagrs.reduce(
    (acc, curr) => (acc > curr ? acc : curr),
    avg_cagr
  );

  const total_avg =
    total_end_value.reduce((acc, curr) => acc + curr, 0) /
    total_end_value.length;
  const total_min = total_end_value.reduce(
    (acc, curr) => (curr < acc ? curr : acc),
    total_avg
  );
  const total_max = total_end_value.reduce(
    (acc, curr) => (curr > acc ? curr : acc),
    total_avg
  );

  const data_first_date = results[0].first_date;
  const data_last_date = results[0].last_date;

  const average_dd_length =
    results
      .map((r) => (r.dd_end_date - r.dd_start_date) / 86400)
      .reduce((acc, curr) => acc + curr, 0) / runs;

  return (
    <React.Fragment>
      <StaticTable 
        headerRows={[<Row values={['Sim Start', 'Sim End']} title="" />]} 
        bodyRows={[<Row values={[dateConverter(data_first_date), dateConverter(data_last_date)]} title="" />]} />
      <StaticTable 
        headerRows={[<Row values={['Sample Start', 'SampleEnd']} title="" />]} 
        bodyRows={[<Row values={[dateConverter(sample_start), dateConverter(sample_end)]} title="" />]} />
      <StaticTable 
        headerRows={[<Row values={['Min', 'Avg', 'Max']} title="" />]} 
        bodyRows={[
          <Row values={[strConverterCurr(total_min), strConverterCurr(total_avg), strConverterCurr(total_max)]} title="End Value" />,
          <Row values={[strConverterMult(min_vol), strConverterMult(avg_vol), strConverterMult(max_vol)]} title="Vol %" />,
          <Row values={[strConverterMult(min_cagr), strConverterMult(avg_cagr), strConverterMult(max_cagr)]} title="CAGR %" />,
          <Row values={[strConverterMult(min_mdd), strConverterMult(avg_mdd), strConverterMult(max_mdd)]} title="MDD %" />,
          <Row values={["", strConverter(average_dd_length), ""]} title="MDD Duration" />,
        ]} />
    </React.Fragment>
  );
};
