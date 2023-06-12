use serde::{Deserialize, Serialize};
use serde_json::Error;
use std::rc::Rc;
use alator::clock::Clock;
use alator::types::CashValue;

use crate::flow::{Employment, EmploymentPAYE, Expense, PctOfIncomeExpense, Rental, Flow};
use crate::stack::{CanTransfer, Isa, Sipp, Stack, BankAcc, Mortgage, Gia};
use crate::sim::uk::{UKSimulationState, SimState};
use crate::tax::uk::{NIC, UKTaxConfig};
use crate::strat::InvestmentStrategy;
use crate::input::{HashMapSourceSim, SimDataSource};
use crate::schedule::Schedule;

#[derive(Debug, Deserialize, Serialize)]
pub struct UKSimConfig {
    starting_cash: f64,
    emergency_cash_min: f64,
    nic: NIC,
    lifetime_pension_contributions: f64,
    contribution_pct: f64,
    flows: Option<Vec<FlowUKSimConfig>>,
    stacks: Option<Vec<StackUKSimConfig>>,
}

impl UKSimConfig {
    pub fn create<S: InvestmentStrategy>(
        &self,
        clock: Clock,
        strat: S,
        src: HashMapSourceSim,
    ) -> UKSimulationState<S> {
        //TODO: the bank account should be given as part of the config and initialised rather than
        //have the input as a special value
        let mut bank = BankAcc::new();
        bank.deposit(&self.starting_cash);

        let mut gia: Option<Gia<S>> = None;
        let mut sipp: Option<Sipp<S>> = None;
        let mut isa: Option<Isa<S>> = None;

        //This loop is just used to initialise the accounts
        if let Some(stacks) = &self.stacks {
            for stack in stacks {
                let into_cash = self.lifetime_pension_contributions.into();
                let into_internal =
                    stack.build(Rc::clone(&clock), src.clone(), strat.clone(), into_cash);
                match into_internal {
                    Stack::Isa(val) => isa = Some(val),
                    Stack::Sipp(val) => sipp = Some(val),
                    Stack::Gia(val) => gia = Some(val),
                    _ => (),
                }
            }
        } else {
            panic!("Must initialize stacks");
        }

        if gia.is_none() | sipp.is_none() | isa.is_none() {
            panic!("Missing investment account");
        }

        //Have to make sure that expenses are ordered after income
        let mut non_expense_flows: Vec<Flow> = self
            .flows
            .as_ref()
            .unwrap()
            .iter()
            .map(|f| f.build(&src))
            .filter(|f| f.is_expense())
            .collect();

        let mut expense_flows: Vec<Flow> = self
            .flows
            .as_ref()
            .unwrap()
            .iter()
            .map(|f| f.build(&src))
            .filter(|f| !f.is_expense())
            .collect();

        let mut flows = Vec::new();
        flows.append(&mut expense_flows);
        flows.append(&mut non_expense_flows);

        UKSimulationState {
            nic_group: self.nic,
            annual_tax_schedule: Schedule::EveryYear(1, 4),
            perf_schedule: Schedule::StartOfMonth,
            clock: Rc::clone(&clock),
            contribution_pct: self.contribution_pct,
            emergency_fund_minimum: self.emergency_cash_min,
            source: src,
            flows,
            bank,
            gia: gia.unwrap(),
            sipp: sipp.unwrap(),
            isa: isa.unwrap(),
            tax_config: UKTaxConfig::default(),
            sim_state: SimState::Ready,
            income_paid_in_curr_loop: 0.0.into(),
            expense_annual: 0.0.into(),
            gross_income_annual: 0.0.into(),
            net_income_annual: 0.0.into(),
            tax_paid_annual: 0.0.into(),
            tax_paid_paye_annual: 0.0.into(),
            sipp_contributions_annual: 0.0.into(),
            non_paye_income_annual: 0.0.into(),
            paye_income_annual: 0.0.into(),
            rental_income_annual: 0.0.into(),
            savings_income_annual: 0.0.into(),
            self_employment_income_annual: 0.0.into(),
            paid_into_gia_since_start: 0.0.into(),
            paid_into_isa_since_start: 0.0.into(),
            paid_into_sipp_since_start: 0.0.into(),
            isa_snapshot: Vec::new(),
            sipp_snapshot: Vec::new(),
            gia_snapshot: Vec::new(),
            cash: Vec::new(),
            gross_income: Vec::new(),
            net_income: Vec::new(),
            expense: Vec::new(),
            tax_paid: Vec::new(),
            sipp_contributions: Vec::new(),
        }
    }

    pub fn parse(json_str: &str) -> Result<UKSimConfig, Error> {
        serde_json::from_str(json_str)
    }
}

#[derive(Copy, Clone, Debug, Deserialize, Serialize)]
enum SupportedSchedules {
    EveryDay,
    EndOfMonth,
    StartOfMonth,
}

#[derive(Copy, Clone, Debug, Deserialize, Serialize)]
struct ScheduleUKSimConfig {
    schedule_type: SupportedSchedules,
    day: Option<u8>,
    month: Option<u8>,
}

impl From<ScheduleUKSimConfig> for Schedule {
    fn from(c: ScheduleUKSimConfig) -> Self {
        match c.schedule_type {
            SupportedSchedules::EveryDay => Schedule::EveryDay,
            SupportedSchedules::EndOfMonth => Schedule::EveryMonth(27),
            SupportedSchedules::StartOfMonth => Schedule::StartOfMonth,
        }
    }
}

impl From<&ScheduleUKSimConfig> for Schedule {
    fn from(c: &ScheduleUKSimConfig) -> Self {
        match c.schedule_type {
            SupportedSchedules::EveryDay => Schedule::EveryDay,
            SupportedSchedules::EndOfMonth => Schedule::EveryMonth(27),
            SupportedSchedules::StartOfMonth => Schedule::StartOfMonth,
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
enum SupportedFlowTypes {
    Employment,
    EmploymentStaticGrowth,
    EmploymentPAYE,
    EmploymentPAYEStaticGrowth,
    Rental,
    Expense,
    PctOfIncomeExpense,
    InflationLinkedExpense,
}

#[derive(Debug, Deserialize, Serialize)]
struct FlowUKSimConfig {
    flow_type: SupportedFlowTypes,
    person: Option<u8>,
    value: Option<f64>,         //PctOfIncomeExpense has no value
    schedule: ScheduleUKSimConfig,   //All flows need schedule
    static_growth: Option<f64>, //Only for growth types
    pct: Option<f64>,           //Only for pct types
}

impl FlowUKSimConfig {
    fn build(&self, src: &HashMapSourceSim) -> Flow {
        //This used to have more branching, this made no sense because the unwrap should panic out to the client
        //so we just try and unwrap immediately rather than trying to catch anything
        let schedule: Schedule = self.schedule.into();
        match &self.flow_type {
            SupportedFlowTypes::Employment => {
                Employment::flow(self.value.unwrap().into(), schedule, src.clone())
            }
            SupportedFlowTypes::EmploymentPAYE => {
                EmploymentPAYE::flow(self.value.unwrap().into(), schedule, src.clone())
            }
            SupportedFlowTypes::Expense => Expense::flow(self.value.unwrap().into(), schedule),
            SupportedFlowTypes::Rental => Rental::flow(self.value.unwrap().into(), schedule),
            SupportedFlowTypes::InflationLinkedExpense => {
                Expense::inflation_linked(self.value.unwrap().into(), schedule, src.clone())
            }
            SupportedFlowTypes::EmploymentStaticGrowth => Employment::static_growth(
                self.value.unwrap().into(),
                schedule,
                self.static_growth.unwrap(),
            ),
            SupportedFlowTypes::EmploymentPAYEStaticGrowth => EmploymentPAYE::static_growth(
                self.value.unwrap().into(),
                schedule,
                self.static_growth.unwrap(),
            ),
            SupportedFlowTypes::PctOfIncomeExpense => {
                PctOfIncomeExpense::flow(self.pct.unwrap(), schedule)
            }
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
enum SupportedStackTypes {
    Isa,
    Sipp,
    Gia,
    Mortgage,
}

#[derive(Debug, Deserialize, Serialize)]
struct StackUKSimConfig {
    stack_type: SupportedStackTypes,
    person: Option<u8>,
    value: f64,             //All stacks should have a value
    rate: Option<f64>,      //Only for Mortgage
    term: Option<u8>,       //Only for Mortgage
    fix_length: Option<u8>, //Only for Mortgage
}

impl StackUKSimConfig {
    fn build<S: InvestmentStrategy, D: SimDataSource>(
        &self,
        clock: Clock,
        src: D,
        strat: S,
        lifetime_pension_contributions: CashValue,
    ) -> Stack<S, D> {
        let value: CashValue = self.value.into();
        match &self.stack_type {
            SupportedStackTypes::Isa => Stack::Isa(Isa::<S>::new_with_cash(strat, &value)),
            SupportedStackTypes::Gia => Stack::Gia(Gia::<S>::new_with_cash(strat, &value)),
            SupportedStackTypes::Sipp => Stack::Sipp(Sipp::<S>::new_with_cash(
                strat,
                &lifetime_pension_contributions,
                &value,
            )),
            SupportedStackTypes::Mortgage => {
                //We try to unwrap immediately, if there is something wrong we just panic out and the error
                //will return the  missing value.
                let fix_length = self.fix_length.unwrap();

                //We create the mortgage from sim start
                let curr_date = clock.borrow().now();

                let rate = self.rate.unwrap();
                let m = Mortgage::start(&value, rate, &curr_date, fix_length, clock, src);
                Stack::Mortgage(m)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::UKSimConfig;

    #[test]
    fn test_that_basic_config_loads() {
        let data = r#"
          {
              "starting_cash": 1000.0,
              "nic": "A",
              "emergency_cash_min": 4000.0,
              "lifetime_pension_contributions": 10.0,
              "contribution_pct": 0.1
          }"#;
        UKSimConfig::parse(data).unwrap();
    }

    #[test]
    fn test_that_flows_config_loads() {
        let data = r#"
          {
              "starting_cash": 1000.0,
              "nic": "A",
              "lifetime_pension_contributions": 10.0,
              "contribution_pct": 0.1,
              "emergency_cash_min": 4000.0,
              "flows": [
                 {
                     "flow_type": "Employment",
                     "value": 4000.0,
                     "schedule": {
                         "schedule_type": "EveryDay"
                     }
                 }
              ]
          }"#;
        UKSimConfig::parse(data).unwrap();
    }

    #[test]
    fn test_that_stacks_config_loads() {
        let data = r#"
          {
              "starting_cash": 1000.0,
              "nic": "A",
              "lifetime_pension_contributions": 10.0,
              "emergency_cash_min": 4000.0,
              "contribution_pct": 0.1,
              "stacks": [
                 {
                     "stack_type": "Isa",
                     "value": 4000.0
                 }
              ]
          }"#;
        UKSimConfig::parse(data).unwrap();
    }

    #[test]
    #[should_panic]
    fn test_that_bad_input_unwrap_panics() {
        let data = r#"
          {
              "nic": "A",
              "lifetime_pension_contributions": 10.0,
              "contribution_pct": 0.1
              "emergency_cash_min": 4000.0,
          }"#;
        UKSimConfig::parse(data).unwrap();
    }
}
