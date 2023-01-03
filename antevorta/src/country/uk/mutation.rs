use alator::types::CashValue;

use crate::acc::{CanTransfer, TransferResult};
use crate::input::{HashMapSourceSim, SimDataSource};
use crate::strat::InvestmentStrategy;

use super::flow::UKIncomeInternal;
use super::UKSimulationState;

#[derive(Clone)]
pub enum Mutations {
    CashBalance(CashBalanceStrategy),
    TaxHashSource(TaxStrategy<HashMapSourceSim>),
}

impl Mutations {
    pub fn check<S: InvestmentStrategy>(&self, curr: &i64, state: &mut UKSimulationState<S>) {
        match self {
            Mutations::CashBalance(strat) => strat.check(curr, state),
            Mutations::TaxHashSource(strat) => strat.check(curr, state),
        }
    }
}

#[derive(Clone, Debug)]
pub struct CashBalanceStrategy {
    emergency_fund_minimum: CashValue,
}

impl CashBalanceStrategy {
    pub fn check<S: InvestmentStrategy>(&self, _curr: &i64, state: &mut UKSimulationState<S>) {
        let bank_bal = *state.1.bank.balance;
        let excess_cash = bank_bal - *self.emergency_fund_minimum;
        if excess_cash > 0.0 {
            state.1.bank.withdraw(&excess_cash);
            //If we are over ISA deposit limit, invest what is possible then return the remainder
            //which can go into GIA
            let (_deposited, remainder) = state.1.isa.deposit_wrapper(&excess_cash);
            if *remainder > 0.0 {
                state.1.gia.deposit(&remainder);
            }
        }
    }
}

impl CashBalanceStrategy {
    pub fn new(emergency_fund_minimum: &f64) -> Self {
        Self {
            emergency_fund_minimum: CashValue::from(*emergency_fund_minimum),
        }
    }
}

#[derive(Clone)]
pub struct TaxStrategy<D: SimDataSource> {
    src: D,
}

impl<D: SimDataSource> TaxStrategy<D> {
    pub fn check<S: InvestmentStrategy>(&self, curr: &i64, state: &mut UKSimulationState<S>) {
        if state.1.annual_tax.check_bool(curr) {
            //Inflation is annualized but with daily frequency, so we should always have an annual
            //number
            let inflation = self.src.get_current_inflation().unwrap();
            let curr_config = &state.1.tax_config;
            let new_config = curr_config.apply_inflation(inflation);
            state.1.tax_config = new_config.clone();

            let mut capital_gains = 0.0;
            let mut dividends_received = 0.0;

            //Assumes that we are correctly calling this on the last day of the current tax year
            if let Some(period_start) = state.0.annual_tax_schedule.last_period(curr) {
                capital_gains += *state.1.gia.get_capital_gains(curr, &period_start);
                dividends_received += *state.1.gia.get_dividends(curr, &period_start);
            }

            if capital_gains > 0.0 {
                state
                    .1
                    .annual_tax
                    .add_income(UKIncomeInternal::OtherGains(CashValue::from(capital_gains)));
            }

            if dividends_received > 0.0 {
                state
                    .1
                    .annual_tax
                    .add_income(UKIncomeInternal::Dividend(CashValue::from(
                        dividends_received,
                    )));
            }

            let output = state.1.annual_tax.calc(&new_config);
            let tax_due = output.total();

            if let TransferResult::Failure = state.1.bank.withdraw(&tax_due) {
                //Not enough cash in bank to pay taxes, liquidate cash accounts if there is still
                //not enough then panic the simulation
                //TODO: add a way to cancel simulation when it gets to invalid state

                let cash_value =
                    *state.1.gia.liquidation_value() + *state.1.isa.liquidation_value();
                if cash_value < *tax_due {
                    panic!("Insufficient cash to pay tax, shut down simulation")
                } else if *state.1.isa.liquidation_value() > *tax_due {
                    state.1.isa.liquidate(&tax_due);
                } else {
                    let isa_value = state.1.isa.liquidation_value();
                    state.1.isa.liquidate(&isa_value);
                    let remainder = *tax_due - *isa_value;
                    state.1.gia.liquidate(&remainder);
                }
            }
        }
    }
}

impl<D: SimDataSource> TaxStrategy<D> {
    pub fn new(src: D) -> Self {
        Self { src }
    }
}
