use alator::perf::BacktestOutput;
use alator::types::DateTime;
use alator::types::StrategySnapshot;
use alator::clock::Clock;
use alator::types::CashValue;

use crate::stack::{CanTransfer, TransferResult, BankAcc, Gia, Isa, Sipp};
use crate::input::HashMapSourceSim;
use crate::input::SimDataSource;
use crate::schedule::Schedule;
use crate::strat::InvestmentStrategy;
use crate::tax::uk::{NIC, UKTaxInput, TaxPeriod, UKTaxConfig};
use crate::flow::Flow;

#[derive(Clone, Debug)]
pub struct UKSimulationPerformanceAnnualFrame {
    pub isa_snapshot: StrategySnapshot,
    pub sipp_snapshot: StrategySnapshot,
    pub gia_snapshot: StrategySnapshot,
    pub cash: CashValue,
    pub gross_income: CashValue,
    pub net_income: CashValue,
    pub expense: CashValue,
    pub tax_paid: CashValue,
    pub sipp_contributions: CashValue,
}

#[derive(Clone, Debug)]
pub struct UKSimulationPerformancePortfolioStats {
    pub isa: BacktestOutput,
    pub gia: BacktestOutput,
    pub sipp: BacktestOutput,
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
    pub perf_schedule: Schedule,
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
    pub tax_config: UKTaxConfig,
    pub sim_state: SimState,

    //All of this state is flushed at some point
    pub income_paid_in_curr_loop: CashValue,
    pub gross_income_annual: CashValue,
    pub net_income_annual: CashValue,
    pub expense_annual: CashValue,
    pub tax_paid_annual: CashValue,
    //This isn't used for reporting, this is used in tax calculations
    pub tax_paid_paye_annual: CashValue,
    pub non_paye_income_annual: CashValue,
    pub paye_income_annual: CashValue,
    pub savings_income_annual: CashValue,
    pub rental_income_annual: CashValue,
    pub self_employment_income_annual: CashValue,
    pub sipp_contributions_annual: CashValue,
    //Persists over the life of simulation
    //`StrategySnapshot` diffs the cash values so we have to provide total
    //sum
    pub paid_into_isa_since_start: CashValue,
    pub paid_into_gia_since_start: CashValue,
    pub paid_into_sipp_since_start: CashValue,
    //Tracker
    pub isa_snapshot: Vec<StrategySnapshot>,
    pub sipp_snapshot: Vec<StrategySnapshot>,
    pub gia_snapshot: Vec<StrategySnapshot>,
    pub cash: Vec<CashValue>,
    pub gross_income: Vec<CashValue>,
    pub net_income: Vec<CashValue>,
    pub expense: Vec<CashValue>,
    //includes paye
    pub tax_paid: Vec<CashValue>,
    pub sipp_contributions: Vec<CashValue>,
}

impl<S: InvestmentStrategy> UKSimulationState<S> {
    fn clear_loop(&mut self) {
        self.income_paid_in_curr_loop = CashValue::from(0.0);
    }

    ///Only used for integration testing logic for simulation runs that are less than one year long and which,
    ///as a result, will not have any tracking data to return
    pub fn get_total_value(&self) -> CashValue {
        let total_value = *self.isa.liquidation_value()
            + *self.gia.liquidation_value()
            + *self.sipp.liquidation_value()
            + *self.bank.balance;
        CashValue::from(total_value)
    }

    pub fn update(&mut self) {
        match self.sim_state {
            SimState::Ready => {
                self.clear_loop();
                self.isa.check();
                self.gia.check();
                self.sipp.check();

                let curr_date = self.clock.borrow().now();

                //Must be triggered early because if the strategy needs to generate cash to pay
                //taxes then we record the cash flow out but the trades don't get executed until
                //the day after. This is a loophole in the trade flow but it is easier to just
                //record the state before this happens.
                self.update_tracker();

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
            SimState::Unrecoverable => {}
        }
    }

    // Tracker is only updated monthly on the performance schedule
    fn update_tracker(&mut self) {
        let curr_date = self.clock.borrow().now();

        if self.perf_schedule.check(&curr_date) {
            let trailing_month_inflation = self.source.get_trailing_month_inflation();

            let isa_snapshot = StrategySnapshot {
                date: curr_date.clone(),
                portfolio_value: self.isa.liquidation_value(),
                net_cash_flow: self.paid_into_isa_since_start.clone(),
                inflation: trailing_month_inflation.clone(),
            };
            let gia_snapshot = StrategySnapshot {
                date: curr_date.clone(),
                portfolio_value: self.gia.liquidation_value(),
                net_cash_flow: self.paid_into_gia_since_start.clone(),
                inflation: trailing_month_inflation.clone(),
            };
            let sipp_snapshot = StrategySnapshot {
                date: curr_date.clone(),
                portfolio_value: self.sipp.liquidation_value(),
                net_cash_flow: self.paid_into_sipp_since_start.clone(),
                inflation: trailing_month_inflation.clone(),
            };
            self.isa_snapshot.push(isa_snapshot);
            self.gia_snapshot.push(gia_snapshot);
            self.sipp_snapshot.push(sipp_snapshot);
            self.cash.push(self.bank.balance.clone());
        }
    }

    // Updates on the same frequency as taxes, and should only be called by code
    // that runs taxes. There are some nasty and obscure cycles that can be triggered
    // if the taxation payment, the annual perf update, and the monthly perf update
    // aren't ordered properly because it can lead to erroneous perf numbers if the
    // taxation payments trigger orders (i.e. if the tax payment is greater than the cash
    // balance which happens for non-paye income).
    // We don't check the date here because this should only be called by taxation paying
    // code that has already performed this check.
    fn clear_annual(&mut self) {
        self.gross_income.push(self.gross_income_annual.clone());
        self.net_income.push(self.net_income_annual.clone());
        self.expense.push(self.expense_annual.clone());
        //This is confusing but we don't need to PAYE here
        self.tax_paid.push(self.tax_paid_annual.clone());
        self.sipp_contributions
            .push(self.sipp_contributions_annual.clone());

        //Reset the annual trackers to zero
        self.gross_income_annual = CashValue::from(0.0);
        self.net_income_annual = CashValue::from(0.0);
        self.expense_annual = CashValue::from(0.0);
        self.tax_paid_annual = CashValue::from(0.0);
        self.non_paye_income_annual = CashValue::from(0.0);
        self.paye_income_annual = CashValue::from(0.0);
        self.savings_income_annual = CashValue::from(0.0);
        self.rental_income_annual = CashValue::from(0.0);
        self.self_employment_income_annual = CashValue::from(0.0);
        self.sipp_contributions_annual = CashValue::from(0.0);
        self.tax_paid_paye_annual = CashValue::from(0.0);
    }

    fn rebalance_cash(&mut self) {
        //All flows credit the bank account only, the only place that we make deposits into
        //non-pension investment accounts is here, and this is where we track those flows.
        //Only exception to this is when we need to liquidate for tax payments.
        let bank_bal = *self.bank.balance;
        let excess_cash = bank_bal - self.emergency_fund_minimum;
        if excess_cash > 0.0 {
            self.bank.withdraw(&excess_cash);
            //If we are over ISA deposit limit, invest what is possible then return the remainder
            //which can go into GIA
            let (deposited, remainder) = self.isa.deposit_wrapper(&excess_cash);
            self.paid_into_isa_since_start =
                CashValue::from(*self.paid_into_isa_since_start + *deposited);
            if *remainder > 0.0 {
                self.paid_into_gia_since_start =
                    CashValue::from(*self.paid_into_gia_since_start + *remainder);
                self.gia.deposit(&remainder);
            }
        }
    }

    fn pay_taxes(&mut self, curr_date: &DateTime) {
        if self.annual_tax_schedule.check(curr_date) {
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

            let input = UKTaxInput {
                non_paye_employment: self.non_paye_income_annual.clone(),
                paye_employment: self.paye_income_annual.clone(),
                rental: self.rental_income_annual.clone(),
                savings: self.savings_income_annual.clone(),
                self_employment: self.self_employment_income_annual.clone(),
                ni: self.nic_group,
                paye_tax_paid: self.tax_paid_paye_annual.clone(),
                contributions: self.sipp_contributions_annual.clone(),
                capital_gains: capital_gains.into(),
                dividend: dividends_received.into(),
            };

            let output = TaxPeriod::calc(&input, &self.tax_config);
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
                    self.clear_annual();
                } else if *self.isa.liquidation_value() > *tax_due {
                    self.isa.liquidate(&tax_due);
                    self.paid_into_isa_since_start =
                        CashValue::from(*self.paid_into_isa_since_start - *tax_due);
                    self.tax_paid_annual = self.tax_paid_annual.clone() + tax_due;
                    self.clear_annual();
                } else {
                    let isa_value = self.isa.liquidation_value();
                    self.isa.liquidate(&isa_value);
                    self.paid_into_isa_since_start =
                        CashValue::from(*self.paid_into_isa_since_start - *isa_value);
                    let remainder = *tax_due - *isa_value;
                    self.gia.liquidate(&remainder);
                    self.paid_into_gia_since_start =
                        CashValue::from(*self.paid_into_gia_since_start - remainder);
                    self.tax_paid_annual = self.tax_paid_annual.clone() + tax_due;
                    self.clear_annual();
                }
            } else {
                self.tax_paid_annual = self.tax_paid_annual.clone() + tax_due;
                self.clear_annual();
            }
        }
    }
}
