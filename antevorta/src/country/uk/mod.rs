pub mod flow;
mod mutation;
mod stack;
mod tax;

pub use self::tax::NIC;

use serde::{Deserialize, Serialize};
use serde_json::Error;
use std::rc::Rc;

use alator::clock::Clock;
use alator::types::CashValue;

use crate::acc::CanTransfer;
use crate::country::uk::stack::BankAcc;
use crate::input::HashMapSourceSim;
use crate::input::SimDataSource;
use crate::schedule::Schedule;
use crate::sim::{SimulationState, SimulationValue};
use crate::strat::InvestmentStrategy;

use flow::Flow;
use flow::{Employment, EmploymentPAYE, Expense, PctOfIncomeExpense, Rental};
use mutation::{CashBalanceStrategy, Mutations, TaxStrategy};
use stack::Mortgage;
use stack::{Gia, Isa, Sipp, Stack};
use tax::{TaxPeriod, UKTaxConfig};

pub enum SimState {
    Ready,
    //If in unrecoverable state, all further mutations to state stop should only happen when we run
    //out of money
    Unrecoverable,
}

pub struct SimConstants {
    //Has to be ordered, tax has to be calculated first
    pub start_mutations: Vec<Mutations>,
    pub end_mutations: Vec<Mutations>,
    pub nic_group: NIC,
    pub annual_tax_schedule: Schedule,
    pub clock: Clock,
    pub contribution_pct: f64,
}

pub struct SimMutableState<S: InvestmentStrategy> {
    //At the moment, clients are not modifying the actual list of flows but the internal state can
    //change
    pub flows: Vec<Flow>,
    pub bank: BankAcc,
    pub sipp: Sipp<S>,
    pub gia: Gia<S>,
    pub isa: Isa<S>,
    pub annual_tax: TaxPeriod,
    pub tax_config: UKTaxConfig,
    pub sim_state: SimState,
}

pub struct SimLoopState {
    pub income_paid: CashValue,
}

impl SimLoopState {
    pub fn clear(&mut self) {
        self.income_paid = CashValue::from(0.0);
    }

    pub fn paid_income(&mut self, income: &f64) {
        self.income_paid = CashValue::from(*self.income_paid + *income);
    }

    pub fn init() -> Self {
        Self {
            income_paid: 0.0.into(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct UKSimulationResult {
    pub cash: CashValue,
    pub isa: CashValue,
    pub gia: CashValue,
    pub sipp: CashValue,
}

impl UKSimulationResult {
    pub fn get_total_value(&self) -> CashValue {
        CashValue::from(*self.cash + *self.isa + *self.gia + *self.sipp)
    }
}

/*
 * Each loop we check for rebalance, check for tax year, and then check for
 * user-defined income events.
 */
pub struct UKSimulationState<S: InvestmentStrategy>(
    pub SimConstants,
    pub SimMutableState<S>,
    pub SimLoopState,
);

impl<S: InvestmentStrategy> UKSimulationState<S> {
    pub fn get_perf(&mut self) -> UKSimulationResult {
        UKSimulationResult {
            cash: self.1.bank.balance.clone(),
            isa: self.1.isa.liquidation_value(),
            gia: self.1.gia.liquidation_value(),
            sipp: self.1.sipp.liquidation_value(),
        }
    }
}

impl<S: InvestmentStrategy> SimulationState for UKSimulationState<S> {
    fn update(&mut self) {
        match self.1.sim_state {
            SimState::Ready => {
                self.2.clear();
                self.1.isa.check();
                self.1.gia.check();
                self.1.sipp.check();

                let curr_date = self.0.clock.borrow().now();
                //Mutations should not be modified during the simulation
                let cloned_start_mutations: Vec<Mutations> = self.0.start_mutations.to_vec();
                for mutation in cloned_start_mutations {
                    mutation.check(&curr_date, self)
                }

                self.1.isa.rebalance();
                self.1.gia.rebalance();
                self.1.sipp.rebalance();

                //We cannot pass the reference to self to flows whilst iterating over flows which are also
                //on self, we therefore need to clone
                let mut cloned_flows: Vec<Flow> = self.1.flows.to_vec();
                for flow in cloned_flows.iter_mut() {
                    flow.check(&curr_date, self);
                }
                //The internal state of the flows may have changed here, so we need to overwite flows on
                //self
                self.1.flows = cloned_flows;

                //Mutations should not be modified during the simulation
                let cloned_end_mutations: Vec<Mutations> = self.0.end_mutations.to_vec();
                for mutation in cloned_end_mutations {
                    mutation.check(&curr_date, self)
                }

                self.1.isa.finish();
                self.1.gia.finish();
                self.1.sipp.finish();
            }, 
            //If unrecoverable then no further updates
            SimState::Unrecoverable => {}
        }
    }

    fn get_state(&mut self) -> SimulationValue {
        SimulationValue(self.get_perf().get_total_value().into())
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    starting_cash: f64,
    emergency_cash_min: f64,
    nic: NIC,
    lifetime_pension_contributions: f64,
    contribution_pct: f64,
    flows: Option<Vec<FlowConfig>>,
    stacks: Option<Vec<StackConfig>>,
}

impl Config {
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

        let cash_strategy =
            Mutations::CashBalance(CashBalanceStrategy::new(&self.emergency_cash_min));
        let tax_strategy = Mutations::TaxHashSource(TaxStrategy::new(src.clone()));

        let start_mutations = vec![cash_strategy.clone(), tax_strategy];
        let end_mutations = vec![cash_strategy];

        let flows: Vec<Flow> = self
            .flows
            .as_ref()
            .unwrap()
            .iter()
            .map(|f| f.build(&src))
            .collect();
        let annual_tax_schedule = Schedule::EveryYear(1, 4);

        let constants = SimConstants {
            start_mutations,
            end_mutations,
            nic_group: self.nic,
            annual_tax_schedule: annual_tax_schedule.clone(),
            clock: Rc::clone(&clock),
            contribution_pct: self.contribution_pct,
        };

        let mutable = SimMutableState {
            flows,
            bank,
            gia: gia.unwrap(),
            sipp: sipp.unwrap(),
            isa: isa.unwrap(),
            annual_tax: TaxPeriod::with_schedule(annual_tax_schedule, self.nic),
            tax_config: UKTaxConfig::default(),
            sim_state: SimState::Ready,
        };

        let loop_state = SimLoopState::init();

        UKSimulationState(constants, mutable, loop_state)
    }

    pub fn parse(json_str: &str) -> Result<Config, Error> {
        serde_json::from_str(json_str)
    }
}

#[derive(Copy, Clone, Debug, Deserialize, Serialize)]
enum SupportedSchedules {
    EveryDay,
    EndOfMonth,
}

#[derive(Copy, Clone, Debug, Deserialize, Serialize)]
struct ScheduleConfig {
    schedule_type: SupportedSchedules,
    day: Option<u8>,
    month: Option<u8>,
}

impl From<ScheduleConfig> for Schedule {
    fn from(c: ScheduleConfig) -> Self {
        match c.schedule_type {
            SupportedSchedules::EveryDay => Schedule::EveryDay,
            SupportedSchedules::EndOfMonth => Schedule::EveryMonth(27),
        }
    }
}

impl From<&ScheduleConfig> for Schedule {
    fn from(c: &ScheduleConfig) -> Self {
        match c.schedule_type {
            SupportedSchedules::EveryDay => Schedule::EveryDay,
            SupportedSchedules::EndOfMonth => Schedule::EveryMonth(27),
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
struct FlowConfig {
    flow_type: SupportedFlowTypes,
    person: Option<u8>,
    value: Option<f64>,         //PctOfIncomeExpense has no value
    schedule: ScheduleConfig,   //All flows need schedule
    static_growth: Option<f64>, //Only for growth types
    pct: Option<f64>,           //Only for pct types
}

impl FlowConfig {
    fn build(&self, src: &HashMapSourceSim) -> Flow {
        //This used to have more branching, this made no sense because the unwrap should panic out to the client
        //so we just try and unwrap immediately rather than trying to catch anything
        let schedule: Schedule = self.schedule.into();
        match &self.flow_type {
            SupportedFlowTypes::Employment => {
                Employment::flow(self.value.unwrap().into(), schedule)
            }
            SupportedFlowTypes::EmploymentPAYE => {
                EmploymentPAYE::flow(self.value.unwrap().into(), schedule)
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
struct StackConfig {
    stack_type: SupportedStackTypes,
    person: Option<u8>,
    value: f64,             //All stacks should have a value
    rate: Option<f64>,      //Only for Mortgage
    term: Option<u8>,       //Only for Mortgage
    fix_length: Option<u8>, //Only for Mortgage
}

impl StackConfig {
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
    use super::Config;

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
        Config::parse(data).unwrap();
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
        Config::parse(data).unwrap();
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
        Config::parse(data).unwrap();
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
        Config::parse(data).unwrap();
    }
}
