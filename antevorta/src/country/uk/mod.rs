pub mod flow;
mod stack;
mod tax;

use self::flow::UKIncomeInternal;
pub use self::tax::NIC;

use alator::types::DateTime;
use serde::{Deserialize, Serialize};
use serde_json::Error;
use std::rc::Rc;

use alator::clock::Clock;
use alator::types::CashValue;

use crate::acc::CanTransfer;
use crate::acc::TransferResult;
use crate::country::uk::stack::BankAcc;
use crate::input::HashMapSourceSim;
use crate::input::SimDataSource;
use crate::report::UKAnnualReport;
use crate::schedule::Schedule;
use crate::strat::InvestmentStrategy;

use flow::Flow;
use flow::{Employment, EmploymentPAYE, Expense, PctOfIncomeExpense, Rental};
use stack::Mortgage;
use stack::{Gia, Isa, Sipp, Stack};
use tax::{TaxPeriod, UKTaxConfig};

pub struct UKStack {
    pub isa: CashValue,
    pub sipp: CashValue,
    pub gia: CashValue,
    pub bank: CashValue,
}

impl UKStack {
    pub fn total_value(&self) -> CashValue {
        CashValue::from(*self.isa + *self.sipp + *self.gia + *self.bank)
    }
}

pub enum SimState {
    Ready,
    //If in unrecoverable state, all further mutations to state stop should only happen when we run
    //out of money
    Unrecoverable,
}

//Each loop we check for rebalance, check tax, and then check for user-defined income events.
pub struct UKSimulationState<S: InvestmentStrategy> {
    //Has to be ordered, tax has to be calculated first
    pub nic_group: NIC,
    pub annual_tax_schedule: Schedule,
    pub clock: Clock,
    pub contribution_pct: f64,
    pub emergency_fund_minimum: f64,
    pub source: HashMapSourceSim,
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
    pub income_paid_in_curr_loop: CashValue,
    pub gross_income_annual_sum: CashValue,
    pub net_income_annual_sum: CashValue,
    pub expense_annual_sum: CashValue,
    pub tax_paid_annual_sum: CashValue,
}

impl<S: InvestmentStrategy> UKSimulationState<S> {
    pub fn clear_annual(&mut self) {
        self.gross_income_annual_sum = CashValue::from(0.0);
        self.net_income_annual_sum = CashValue::from(0.0);
        self.expense_annual_sum = CashValue::from(0.0);
        self.tax_paid_annual_sum = CashValue::from(0.0);
    }

    pub fn clear_loop(&mut self) {
        self.income_paid_in_curr_loop = CashValue::from(0.0);
    }

    pub fn update(&mut self) {
        match self.sim_state {
            SimState::Ready => {
                self.clear_loop();
                self.isa.check();
                self.gia.check();
                self.sipp.check();

                let curr_date = self.clock.borrow().now();

                self.rebalance_cash();
                //Only triggers when schedule is met
                self.pay_taxes(&curr_date);

                self.isa.rebalance();
                self.gia.rebalance();
                self.sipp.rebalance();

                //We cannot pass the reference to self to flows whilst iterating over flows which are also
                //on self, we therefore need to clone
                let mut cloned_flows: Vec<Flow> = self.flows.to_vec();
                for flow in cloned_flows.iter_mut() {
                    flow.check(&curr_date, self);
                }
                //The internal state of the flows may have changed here, so we need to overwite flows on
                //self
                self.flows = cloned_flows;

                self.rebalance_cash();

                self.isa.finish();
                self.gia.finish();
                self.sipp.finish();
            }
            //If unrecoverable then no further updates
            SimState::Unrecoverable => {}
        }
    }

    pub fn get_state(&self) -> UKStack {
        UKStack {
            isa: self.isa.liquidation_value(),
            gia: self.gia.liquidation_value(),
            sipp: self.sipp.liquidation_value(),
            bank: self.bank.balance.clone(),
        }
    }

    pub fn get_annual_report(&mut self) -> Option<UKAnnualReport> {
        let curr_date = self.clock.borrow().now();
        if self.annual_tax_schedule.check(&curr_date) {
            let report = UKAnnualReport {
                isa: self.isa.liquidation_value(),
                gia: self.gia.liquidation_value(),
                sipp: self.sipp.liquidation_value(),
                cash: self.bank.balance.clone(),
                gross_income: self.gross_income_annual_sum.clone(),
                net_income: self.net_income_annual_sum.clone(),
                expense: self.expense_annual_sum.clone(),
                tax_paid: self.tax_paid_annual_sum.clone(),
            };
            self.clear_annual();
            return Some(report);
        }
        None
    }

    fn rebalance_cash(&mut self) {
        let bank_bal = *self.bank.balance;
        let excess_cash = bank_bal - self.emergency_fund_minimum;
        if excess_cash > 0.0 {
            self.bank.withdraw(&excess_cash);
            //If we are over ISA deposit limit, invest what is possible then return the remainder
            //which can go into GIA
            let (_deposited, remainder) = self.isa.deposit_wrapper(&excess_cash);
            if *remainder > 0.0 {
                self.gia.deposit(&remainder);
            }
        }
    }

    fn pay_taxes(&mut self, curr_date: &DateTime) {
        if self.annual_tax.check_bool(curr_date) {
            //Inflation is annualized but with daily frequency, so we should always have an annual
            //number
            let inflation = self.source.get_current_inflation().unwrap();
            let curr_config = &self.tax_config;
            let new_config = curr_config.apply_inflation(&inflation);
            self.tax_config = new_config.clone();

            let mut capital_gains = 0.0;
            let mut dividends_received = 0.0;

            //Assumes that we are correctly calling this on the last day of the current tax year
            if let Some(period_start) = self.annual_tax_schedule.last_period(curr_date) {
                capital_gains += *self.gia.get_capital_gains(curr_date, &period_start);
                dividends_received += *self.gia.get_dividends(curr_date, &period_start);
            }

            if capital_gains > 0.0 {
                self.annual_tax
                    .add_income(UKIncomeInternal::OtherGains(CashValue::from(capital_gains)));
            }

            if dividends_received > 0.0 {
                self.annual_tax
                    .add_income(UKIncomeInternal::Dividend(CashValue::from(
                        dividends_received,
                    )));
            }

            let output = self.annual_tax.calc(&new_config);
            let tax_due = output.total();
            if let TransferResult::Failure = self.bank.withdraw(&tax_due) {
                //Not enough cash in bank to pay taxes, liquidate cash accounts if there is still
                //not enough then enter unrecoverable state which pauses all forward progress with
                //simulation

                let cash_value = *self.gia.liquidation_value() + *self.isa.liquidation_value();
                if cash_value < *tax_due {
                    self.sim_state = SimState::Unrecoverable;
                    //In unrecoverable state, zero all the accounts
                    self.gia.zero();
                    self.isa.zero();
                    self.sipp.zero();
                    self.bank.zero();
                } else if *self.isa.liquidation_value() > *tax_due {
                    self.isa.liquidate(&tax_due);
                    self.tax_paid_annual_sum = self.tax_paid_annual_sum.clone() + tax_due;
                } else {
                    let isa_value = self.isa.liquidation_value();
                    self.isa.liquidate(&isa_value);
                    let remainder = *tax_due - *isa_value;
                    self.gia.liquidate(&remainder);
                    self.tax_paid_annual_sum = self.tax_paid_annual_sum.clone() + tax_due;
                }
            } else {
                self.tax_paid_annual_sum = self.tax_paid_annual_sum.clone() + tax_due;
            }
            self.annual_tax =
                TaxPeriod::with_schedule(self.annual_tax_schedule.clone(), self.nic_group);
        }
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

        let annual_tax_schedule = Schedule::EveryYear(1, 4);

        UKSimulationState {
            nic_group: self.nic,
            annual_tax_schedule: annual_tax_schedule.clone(),
            clock: Rc::clone(&clock),
            contribution_pct: self.contribution_pct,
            emergency_fund_minimum: self.emergency_cash_min,
            source: src,
            flows,
            bank,
            gia: gia.unwrap(),
            sipp: sipp.unwrap(),
            isa: isa.unwrap(),
            annual_tax: TaxPeriod::with_schedule(annual_tax_schedule, self.nic),
            tax_config: UKTaxConfig::default(),
            sim_state: SimState::Ready,
            income_paid_in_curr_loop: 0.0.into(),
            expense_annual_sum: 0.0.into(),
            gross_income_annual_sum: 0.0.into(),
            net_income_annual_sum: 0.0.into(),
            tax_paid_annual_sum: 0.0.into(),
        }

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
