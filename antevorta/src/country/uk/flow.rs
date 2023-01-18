use std::collections::HashMap;

use alator::types::{CashValue, DateTime};

use crate::acc::CanTransfer;
use crate::input::{HashMapSourceSim, SimDataSource};
use crate::report::FlowReporter;
use crate::schedule::Schedule;
use crate::strat::InvestmentStrategy;

use super::tax::{TaxPeriod, UKTaxableIncome};
use super::UKSimulationState;

trait WillFlow<S: InvestmentStrategy> {
    fn check(&self, curr: &i64, state: &mut UKSimulationState<S>);
    fn get_value(&self) -> CashValue;
    fn set_value(&mut self, cash: &f64);
}

#[derive(Clone, Debug)]
pub enum Flow {
    Employment(Employment),
    EmploymentStaticGrowth(StaticGrowth, Employment),
    EmploymentFixedGrowth(FixedGrowth, Employment),
    EmploymentPAYE(EmploymentPAYE),
    EmploymentPAYEStaticGrowth(StaticGrowth, EmploymentPAYE),
    EmploymentPAYEFixedGrowth(FixedGrowth, EmploymentPAYE),
    Rental(Rental),
    Expense(Expense),
    InflationLinkedExpense(InflationDataHashMap, Expense),
    PctOfIncomeExpense(PctOfIncomeExpense),
}

impl Flow {
    pub fn is_expense(&self) -> bool {
        match self {
            Flow::Expense(_) | Flow::InflationLinkedExpense(_, _) | Flow::PctOfIncomeExpense(_) => {
                true
            }
            _ => false,
        }
    }

    pub fn check<S: InvestmentStrategy>(
        &mut self,
        curr: &DateTime,
        state: &mut UKSimulationState<S>,
    ) {
        match self {
            Flow::Employment(val) => val.check(curr, state),
            Flow::EmploymentFixedGrowth(growth, val) => growth.check(curr, state, val),
            Flow::EmploymentStaticGrowth(growth, val) => growth.check(curr, state, val),
            Flow::EmploymentPAYE(val) => val.check(curr, state),
            Flow::EmploymentPAYEFixedGrowth(growth, val) => growth.check(curr, state, val),
            Flow::EmploymentPAYEStaticGrowth(growth, val) => growth.check(curr, state, val),
            Flow::Rental(val) => val.check(curr, state),
            Flow::Expense(val) => val.check(curr, state),
            Flow::InflationLinkedExpense(growth, val) => growth.check(curr, state, val),
            Flow::PctOfIncomeExpense(val) => val.check(curr, state),
        }
    }
}

#[derive(Clone, Debug)]
pub struct InflationDataHashMap {
    source: HashMapSourceSim,
}

impl InflationDataHashMap {
    fn check<F: WillFlow<S>, S: InvestmentStrategy>(
        &mut self,
        curr: &i64,
        state: &mut UKSimulationState<S>,
        target: &mut F,
    ) {
        target.check(curr, state);
        let curr_val = target.get_value();
        if let Some(inflation) = self.source.get_current_inflation() {
            let new_val = *curr_val * (1.0 + inflation);
            target.set_value(&new_val);
        } else {
            panic!("Created fixed growth rate employement income with bad date");
        }
    }
}

impl InflationDataHashMap {
    fn new(source: HashMapSourceSim) -> Self {
        Self { source }
    }
}

#[derive(Clone, Debug)]
pub struct StaticGrowth {
    growth_rate: f64,
}

impl StaticGrowth {
    fn check<F: WillFlow<S>, S: InvestmentStrategy>(
        &mut self,
        curr: &i64,
        state: &mut UKSimulationState<S>,
        target: &mut F,
    ) {
        target.check(curr, state);
        let curr_val = target.get_value();
        let new_val = *curr_val * (1.0 + self.growth_rate);
        target.set_value(&new_val);
    }

    fn new(growth_rate: f64) -> Self {
        Self { growth_rate }
    }
}

type FixedGrowthData = HashMap<DateTime, f64>;

#[derive(Clone, Debug)]
pub struct FixedGrowth {
    growth_data: FixedGrowthData,
}

impl FixedGrowth {
    fn check<F: WillFlow<S>, S: InvestmentStrategy>(
        &mut self,
        curr: &i64,
        state: &mut UKSimulationState<S>,
        target: &mut F,
    ) {
        target.check(curr, state);
        let curr_val = target.get_value();
        if let Some(growth) = self.growth_data.get(&DateTime::from(*curr)) {
            let new_val = *curr_val * (1.0 + growth);
            target.set_value(&new_val)
        } else {
            panic!("Created fixed growth rate employement income with bad date");
        }
    }

    fn new(growth_data: FixedGrowthData) -> Self {
        Self { growth_data }
    }
}

#[derive(Clone, Debug)]
pub struct Employment {
    value: CashValue,
    schedule: Schedule,
}

impl<S: InvestmentStrategy> WillFlow<S> for Employment {
    fn check(&self, curr: &i64, state: &mut UKSimulationState<S>) {
        if self.schedule.check(curr) {
            state.reporter.paid_gross_income(&self.value);
            let tax_type: UKTaxableIncome = self.clone().into();
            state.annual_tax.add_income(tax_type);
            let contribution = *self.value * state.contribution_pct;
            let (contributed, remainder) = state.sipp.deposit_wrapper(&contribution);
            state.annual_tax.add_contribution(&contributed);
            let net_pay = *self.value - *contributed + *remainder;
            state.paid_income_loop(&net_pay);
            state.reporter.paid_net_income(&net_pay);
            state.bank.deposit(&net_pay);
        }
    }

    fn get_value(&self) -> CashValue {
        self.value.clone()
    }

    fn set_value(&mut self, cash: &f64) {
        self.value = CashValue::from(*cash);
    }
}

impl Employment {
    pub fn static_growth(value: CashValue, schedule: Schedule, growth: f64) -> Flow {
        let growth = StaticGrowth::new(growth);
        let employment = Employment::new(value, schedule);
        Flow::EmploymentStaticGrowth(growth, employment)
    }

    pub fn fixed_growth(value: CashValue, schedule: Schedule, growth: FixedGrowthData) -> Flow {
        let growth = FixedGrowth::new(growth);
        let employment = Employment::new(value, schedule);
        Flow::EmploymentFixedGrowth(growth, employment)
    }

    pub fn flow(value: CashValue, schedule: Schedule) -> Flow {
        Flow::Employment(Self::new(value, schedule))
    }

    pub fn new(value: CashValue, schedule: Schedule) -> Self {
        Self { value, schedule }
    }
}

impl From<Employment> for UKTaxableIncome {
    fn from(val: Employment) -> Self {
        UKTaxableIncome::Wage(val.value)
    }
}

#[derive(Clone, Debug)]
pub struct EmploymentPAYE {
    value: CashValue,
    schedule: Schedule,
}

impl<S: InvestmentStrategy> WillFlow<S> for EmploymentPAYE {
    fn check(&self, curr: &i64, state: &mut UKSimulationState<S>) {
        if self.schedule.check(curr) {
            state.reporter.paid_gross_income(&self.value);
            let contribution = *self.value * state.contribution_pct;
            let (contributed, remainder) = state.sipp.deposit_wrapper(&contribution);
            state.annual_tax.add_contribution(&contributed);
            let paye_paid = TaxPeriod::paye(
                &self.value,
                &contributed,
                state.nic_group,
                &state.tax_config,
            );
            state.annual_tax.add_paye_paid(&paye_paid.total());
            let net_pay = *self.value + *remainder - *contributed - *paye_paid.total();
            state.paid_income_loop(&net_pay);
            state.reporter.paid_net_income(&net_pay);
            state.bank.deposit(&net_pay);
        }
    }

    fn get_value(&self) -> CashValue {
        self.value.clone()
    }

    fn set_value(&mut self, val: &f64) {
        self.value = CashValue::from(*val);
    }
}

impl EmploymentPAYE {
    pub fn static_growth(value: CashValue, schedule: Schedule, growth: f64) -> Flow {
        let growth = StaticGrowth::new(growth);
        let employment = EmploymentPAYE::new(value, schedule);
        Flow::EmploymentPAYEStaticGrowth(growth, employment)
    }

    pub fn fixed_growth(value: CashValue, schedule: Schedule, growth: FixedGrowthData) -> Flow {
        let growth = FixedGrowth::new(growth);
        let employment = EmploymentPAYE::new(value, schedule);
        Flow::EmploymentPAYEFixedGrowth(growth, employment)
    }

    pub fn flow(value: CashValue, schedule: Schedule) -> Flow {
        Flow::EmploymentPAYE(Self::new(value, schedule))
    }

    pub fn new(value: CashValue, schedule: Schedule) -> Self {
        Self { value, schedule }
    }
}

impl From<EmploymentPAYE> for UKTaxableIncome {
    fn from(val: EmploymentPAYE) -> Self {
        UKTaxableIncome::WagePAYE(val.value)
    }
}

#[derive(Clone, Debug)]
pub struct Rental {
    value: CashValue,
    schedule: Schedule,
}

impl<S: InvestmentStrategy> WillFlow<S> for Rental {
    fn check(&self, curr: &i64, state: &mut UKSimulationState<S>) {
        if self.schedule.check(curr) {
            state.reporter.paid_gross_income(&self.value);
            let tax_type: UKTaxableIncome = self.clone().into();
            state.annual_tax.add_income(tax_type);
            state.bank.deposit(&self.value);
            state.paid_income_loop(&self.value);
        }
    }

    fn get_value(&self) -> CashValue {
        self.value.clone()
    }

    fn set_value(&mut self, val: &f64) {
        self.value = CashValue::from(*val);
    }
}

impl Rental {
    pub fn new(value: CashValue, schedule: Schedule) -> Self {
        Self { value, schedule }
    }

    pub fn flow(value: CashValue, schedule: Schedule) -> Flow {
        Flow::Rental(Self::new(value, schedule))
    }
}

impl From<Rental> for UKTaxableIncome {
    fn from(val: Rental) -> Self {
        UKTaxableIncome::Rental(val.value)
    }
}

#[derive(Clone, Debug)]
pub struct Expense {
    value: CashValue,
    schedule: Schedule,
}

impl<S: InvestmentStrategy> WillFlow<S> for Expense {
    fn check(&self, curr: &i64, state: &mut UKSimulationState<S>) {
        if self.schedule.check(curr) {
            state.reporter.paid_expense(&self.value);
            state.bank.withdraw(&self.value);
        }
    }

    fn get_value(&self) -> CashValue {
        self.value.clone()
    }

    fn set_value(&mut self, val: &f64) {
        self.value = CashValue::from(*val);
    }
}

impl Expense {
    pub fn new(value: CashValue, schedule: Schedule) -> Self {
        Self { value, schedule }
    }

    pub fn inflation_linked(
        value: CashValue,
        schedule: Schedule,
        source: HashMapSourceSim,
    ) -> Flow {
        let expense = Expense::new(value, schedule);
        let data = InflationDataHashMap::new(source);
        Flow::InflationLinkedExpense(data, expense)
    }

    pub fn flow(value: CashValue, schedule: Schedule) -> Flow {
        Flow::Expense(Self::new(value, schedule))
    }
}

#[derive(Clone, Debug)]
pub struct PctOfIncomeExpense {
    pct: f64,
    schedule: Schedule,
}

impl<S: InvestmentStrategy> WillFlow<S> for PctOfIncomeExpense {
    fn check(&self, curr: &i64, state: &mut UKSimulationState<S>) {
        if self.schedule.check(curr) {
            //This is correct, tried to fiddle with this and we need to make sure that income runs
            //before expense. If this isn't true then the simulation cannot continue/we generate
            //lots of erroneous transactions.
            if *state.income_paid_in_curr_loop <= 0.0 {
                //Panic here because if this hits then the caller likely made an error in the
                //simulation config
                panic!("Created PctOfIncomeExpense with no income");
            } else {
                let expense_value = self.pct * *state.income_paid_in_curr_loop;
                state.reporter.paid_expense(&expense_value);
                state.bank.withdraw(&expense_value);
            }
        }
    }

    fn get_value(&self) -> CashValue {
        unimplemented!("Has no value")
    }

    fn set_value(&mut self, _val: &f64) {
        unimplemented!("Has no value")
    }
}

impl PctOfIncomeExpense {
    pub fn new(pct: f64, schedule: Schedule) -> Self {
        Self { pct, schedule }
    }

    pub fn flow(pct: f64, schedule: Schedule) -> Flow {
        Flow::PctOfIncomeExpense(Self::new(pct, schedule))
    }
}

/*
 * Income that is created outside of the main simulator loop, for example capital gains on
 * portfolio transactions.
 * Reason to distinguish this type of income is that other types of income can grow or be set by
 * the client before the simulation starts running. With these types of income, they are only
 * created during a simulation in response to the output of the simulation's internal state.
 */
pub enum UKIncomeInternal {
    Dividend(CashValue),
    ResiPropertyGain(CashValue),
    OtherGains(CashValue),
}

impl From<UKIncomeInternal> for UKTaxableIncome {
    fn from(inc: UKIncomeInternal) -> Self {
        match inc {
            UKIncomeInternal::Dividend(value) => UKTaxableIncome::Dividend(value),
            UKIncomeInternal::ResiPropertyGain(value) => UKTaxableIncome::ResiPropertyGains(value),
            UKIncomeInternal::OtherGains(value) => UKTaxableIncome::OtherGains(value),
        }
    }
}
