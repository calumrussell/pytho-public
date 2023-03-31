import React from "react";
import styled from "styled-components";

import {
  strConverterCurr,
  strConverter,
  NumberWithTitle,
  strConverterMult,
} from '@Common/index';
import { AntevortaStandardSimulationOutput } from "@Api/antevorta";
import { dateConverter } from "@Common/index";

interface InfoHeaderProps {
  runs: number,
  results: Array<AntevortaStandardSimulationOutput>,
  total_end_value: Array<number>,
  sample_start: number,
  sample_end: number,
}

const RowWrapper = styled.div`
  display: flex;
  justify-content: space-around;
  margin: 1rem 0;
`;

export const InfoHeader = ({results, total_end_value, runs, sample_end, sample_start}: InfoHeaderProps) => {
  const mdds = results.map(r => r.mdd);
  const avg_mdd = mdds.reduce((acc, curr) => acc+curr, 0) / mdds.length;
  //Have to flip these around because mdd is negative
  const min_mdd = mdds.reduce((acc, curr) => acc>curr?acc:curr, avg_mdd);
  const max_mdd = mdds.reduce((acc, curr) => acc<curr?acc:curr, avg_mdd);

  const vols = results.map(r => r.vol);
  const avg_vol = vols.reduce((acc, curr) => acc+curr, 0) / vols.length;
  const min_vol = vols.reduce((acc, curr) => acc<curr?acc:curr, avg_vol);
  const max_vol = vols.reduce((acc, curr) => acc>curr?acc:curr, avg_vol);

  const cagrs = results.map(r => r.cagr);
  const avg_cagr = cagrs.reduce((acc, curr) => acc+curr, 0) / cagrs.length;
  const min_cagr = cagrs.reduce((acc, curr) => acc<curr?acc:curr, avg_cagr);
  const max_cagr = cagrs.reduce((acc, curr) => acc>curr?acc:curr, avg_cagr);

  const total_avg = total_end_value.reduce((acc, curr) => acc+curr, 0) / total_end_value.length;
  const total_min = total_end_value.reduce((acc, curr) => curr < acc ? curr: acc, total_avg);
  const total_max = total_end_value.reduce((acc, curr) => curr > acc ? curr: acc, total_avg);

  const data_first_date = results[0].first_date;
  const data_last_date = results[0].last_date;

  const average_dd_length = results.map(r => (r.dd_end_date - r.dd_start_date) / 86400)
    .reduce((acc, curr) => acc+curr, 0) / runs;

  return (
    <React.Fragment>
      <RowWrapper>
        <NumberWithTitle
          title={'Sim Start'}
          number={dateConverter(data_first_date)} />
        <NumberWithTitle
          title={'Sim End'}
          number={dateConverter(data_last_date)} />
      </RowWrapper>
      <RowWrapper>
        <NumberWithTitle
          title={'Sample Start'}
          number={dateConverter(sample_start)} />
        <NumberWithTitle
          title={'Sample End'}
          number={dateConverter(sample_end)} />
      </RowWrapper>
      <RowWrapper>
        <NumberWithTitle
          title={'Min End Value'}
          number={strConverterCurr(total_min)} />
        <NumberWithTitle
          title={'Avg End Value'}
          number={strConverterCurr(total_avg)} />
        <NumberWithTitle
          title={'Max End Value'}
          number={strConverterCurr(total_max)} />
      </RowWrapper>
      <RowWrapper>
        <NumberWithTitle
          title={'Min Vol'}
          number={strConverterMult(min_vol)} />
        <NumberWithTitle
          title={'Avg Vol'}
          number={strConverterMult(avg_vol)} />
        <NumberWithTitle
          title={'Max Vol'}
          number={strConverterMult(max_vol)} />
      </RowWrapper>
      <RowWrapper>
        <NumberWithTitle
          title={'Min CAGR'}
          number={strConverterMult(min_cagr)} />
        <NumberWithTitle
          title={'Avg CAGR'}
          number={strConverterMult(avg_cagr)} />
        <NumberWithTitle
          title={'Max CAGR'}
          number={strConverterMult(max_cagr)} />
      </RowWrapper>
      <RowWrapper>
        <NumberWithTitle
          title={'Min MDD'}
          number={strConverterMult(min_mdd)} />
        <NumberWithTitle
          title={'Avg MDD'}
          number={strConverterMult(avg_mdd)} />
        <NumberWithTitle
          title={'Max MDD'}
          number={strConverterMult(max_mdd)} />
        <NumberWithTitle
          title={'Avg MDD duration'}
          number={strConverter(average_dd_length)} />
      </RowWrapper>
    </React.Fragment>
  )
}