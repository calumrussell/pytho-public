use alator::{
    perf::PerformanceCalculator,
    types::{CashValue, StrategySnapshot},
};
use serde::{Deserialize, Serialize};

use crate::{country::uk::UKSimulationState, strat::InvestmentStrategy};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct UKSimulationOutput {
    pub cash: Vec<f64>,
    pub gross_income: Vec<f64>,
    pub net_income: Vec<f64>,
    pub expense: Vec<f64>,
    pub tax_paid: Vec<f64>,
    pub sipp_contributions: Vec<f64>,
    pub ret: f64,
    pub cagr: f64,
    pub vol: f64,
    pub mdd: f64,
    pub sharpe: f64,
    pub values: Vec<f64>,
    pub returns: Vec<f64>,
    pub returns_dates: Vec<i64>,
    pub investment_cash_flows: Vec<f64>,
    pub first_date: i64,
    pub last_date: i64,
    pub dd_start_date: i64,
    pub dd_end_date: i64,
    pub best_return: f64,
    pub worst_return: f64,
    pub frequency: String,
}

impl UKSimulationOutput {
    pub fn get_final_value<S: InvestmentStrategy>(sim: &UKSimulationState<S>) -> CashValue {
        let total_value = *sim.isa_snapshot.last().unwrap().portfolio_value
            + *sim.gia_snapshot.last().unwrap().portfolio_value
            + *sim.sipp_snapshot.last().unwrap().portfolio_value
            + **sim.cash.last().unwrap();
        CashValue::from(total_value)
    }

    pub fn get_output<S: InvestmentStrategy>(sim: &UKSimulationState<S>) -> UKSimulationOutput {
        let mut joined_snaps = Vec::new();
        for (isa, sipp, gia) in sim
            .isa_snapshot
            .iter()
            .zip(sim.gia_snapshot.iter())
            .zip(sim.sipp_snapshot.iter())
            .map(|((x, y), z)| (x, y, z))
        {
            let date = isa.date.clone();
            //Should be the same across account types
            let inflation = isa.inflation;

            let value = CashValue::from(
                &*isa.portfolio_value + &*sipp.portfolio_value + &*gia.portfolio_value,
            );
            let net_cash_flow =
                CashValue::from(&*isa.net_cash_flow + &*sipp.net_cash_flow + &*gia.net_cash_flow);

            joined_snaps.push(StrategySnapshot {
                date,
                inflation,
                portfolio_value: value,
                net_cash_flow,
            });
        }
        let perf =
            PerformanceCalculator::calculate(alator::types::Frequency::Monthly, joined_snaps);

        UKSimulationOutput {
            returns_dates: perf.dates,
            returns: perf.returns,
            ret: perf.ret,
            cagr: perf.cagr,
            vol: perf.vol,
            mdd: perf.mdd,
            investment_cash_flows: perf.cash_flows,
            sharpe: perf.sharpe,
            values: perf.values,
            first_date: perf.first_date,
            last_date: perf.last_date,
            best_return: perf.best_return,
            worst_return: perf.worst_return,
            frequency: perf.frequency,
            dd_end_date: perf.dd_end_date,
            dd_start_date: perf.dd_start_date,
            gross_income: sim.gross_income.iter().map(|v| **v).collect(),
            net_income: sim.net_income.iter().map(|v| **v).collect(),
            cash: sim.cash.iter().map(|v| **v).collect(),
            expense: sim.expense.iter().map(|v| **v).collect(),
            tax_paid: sim.tax_paid.iter().map(|v| **v).collect(),
            sipp_contributions: sim.sipp_contributions.iter().map(|v| **v).collect(),
        }
    }
}
