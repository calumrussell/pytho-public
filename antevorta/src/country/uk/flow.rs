use std::collections::HashMap;

use alator::types::{CashValue, DateTime};

use crate::acc::CanTransfer;
use crate::input::{HashMapSourceSim, SimDataSource};
use crate::schedule::Schedule;
use crate::strat::InvestmentStrategy;

use super::tax::TaxPeriod;
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
            //Non-paye employment income deducts contributions but doesn't take income tax or NI
            //until annual tax date
            state.non_paye_income_annual =
                state.non_paye_income_annual.clone() + self.value.clone();

            let contribution = *self.value * state.contribution_pct;
            let (contributed, remainder) = state.sipp.deposit_wrapper(&contribution);
            state.contributions_annual = state.contributions_annual.clone() + contributed.clone();
            let net_pay = *self.value - *contributed + *remainder;
            state.bank.deposit(&net_pay);

            state.gross_income_annual = state.gross_income_annual.clone() + self.value.clone();
            state.net_income_annual = state.net_income_annual.clone() + net_pay.into();
            state.income_paid_in_curr_loop =
                state.income_paid_in_curr_loop.clone() + net_pay.into();
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

#[derive(Clone, Debug)]
pub struct EmploymentPAYE {
    value: CashValue,
    schedule: Schedule,
}

impl<S: InvestmentStrategy> WillFlow<S> for EmploymentPAYE {
    fn check(&self, curr: &i64, state: &mut UKSimulationState<S>) {
        if self.schedule.check(curr) {
            //Have to deduct income tax and NI and SIPP contributions
            let contribution = *self.value * state.contribution_pct;
            let (contributed, remainder) = state.sipp.deposit_wrapper(&contribution);
            state.contributions_annual = state.contributions_annual.clone() + contributed.clone();

            //Takes both income tax and NI
            let paye_paid = TaxPeriod::paye(
                &self.value,
                &contributed,
                state.nic_group,
                &state.tax_config,
            );
            state.tax_paid_annual = state.tax_paid_annual.clone() + paye_paid.total();
            state.tax_paid_paye_annual = state.tax_paid_paye_annual.clone() + paye_paid.total();

            //We don't deduct paye paid from bank but deduct it straight from gross_pay
            let net_pay = *self.value + *remainder - *contributed - *paye_paid.total();
            state.bank.deposit(&net_pay);

            state.paye_income_annual = state.paye_income_annual.clone() + net_pay.into();
            state.tax_paid_annual = state.tax_paid_annual.clone() + paye_paid.total();

            state.gross_income_annual = state.gross_income_annual.clone() + self.value.clone();
            state.net_income_annual = state.net_income_annual.clone() + net_pay.into();
            state.income_paid_in_curr_loop =
                state.income_paid_in_curr_loop.clone() + net_pay.into();
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

#[derive(Clone, Debug)]
pub struct Rental {
    value: CashValue,
    schedule: Schedule,
}

impl<S: InvestmentStrategy> WillFlow<S> for Rental {
    fn check(&self, curr: &i64, state: &mut UKSimulationState<S>) {
        if self.schedule.check(curr) {
            state.rental_income_annual = state.rental_income_annual.clone() + self.value.clone();
            state.bank.deposit(&self.value);

            state.gross_income_annual = state.gross_income_annual.clone() + self.value.clone();
            state.income_paid_in_curr_loop =
                state.income_paid_in_curr_loop.clone() + self.value.clone();
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

#[derive(Clone, Debug)]
pub struct Expense {
    value: CashValue,
    schedule: Schedule,
}

impl<S: InvestmentStrategy> WillFlow<S> for Expense {
    fn check(&self, curr: &i64, state: &mut UKSimulationState<S>) {
        if self.schedule.check(curr) {
            state.expense_annual = state.expense_annual.clone() + self.value.clone().into();
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
                state.expense_annual = state.expense_annual.clone() + expense_value.into();
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
