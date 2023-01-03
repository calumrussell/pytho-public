mod capital;
mod income;
mod ni;

use alator::types::CashValue;

use crate::schedule::Schedule;
use crate::tax::TaxRate;

use self::capital::{CapitalGainsTax, CapitalGainsTaxOutput};
use self::income::{DividendTax, IncomeTax, IncomeTaxOutput, PAYEIncomeTax};
use self::ni::NITaxOutput;
pub use self::ni::NIC;

#[derive(Debug)]
pub struct UKTaxOutput {
    income: IncomeTaxOutput,
    capital_gains: CapitalGainsTaxOutput,
    ni: NITaxOutput,
    dividend: CashValue,
    paye_tax_paid: CashValue,
}

impl UKTaxOutput {
    pub fn total(&self) -> CashValue {
        let sum =
            *self.income.total() + *self.capital_gains.total() + *self.ni.total() + *self.dividend
                - *self.paye_tax_paid;
        CashValue::from(sum)
    }
}

#[derive(Clone, Debug)]
pub enum UKTaxableIncome {
    Wage(CashValue),
    WagePAYE(CashValue),
    SelfEmployment(CashValue),
    SavingsInterest(CashValue),
    Rental(CashValue),
    Dividend(CashValue),
    ResiPropertyGains(CashValue),
    OtherGains(CashValue),
    Null,
}

impl UKTaxableIncome {
    pub fn value(&self) -> CashValue {
        match self {
            UKTaxableIncome::Wage(val)
            | UKTaxableIncome::WagePAYE(val)
            | UKTaxableIncome::SelfEmployment(val)
            | UKTaxableIncome::SavingsInterest(val)
            | UKTaxableIncome::Rental(val)
            | UKTaxableIncome::Dividend(val)
            | UKTaxableIncome::ResiPropertyGains(val)
            | UKTaxableIncome::OtherGains(val) => val.clone(),
            UKTaxableIncome::Null => CashValue::default(),
        }
    }

    pub fn savings(&self) -> bool {
        matches!(self, UKTaxableIncome::SavingsInterest(_))
    }

    pub fn rental(&self) -> bool {
        matches!(self, UKTaxableIncome::Rental(_))
    }

    pub fn dividend(&self) -> bool {
        matches!(self, UKTaxableIncome::Dividend(_))
    }

    pub fn self_employment(&self) -> bool {
        matches!(self, UKTaxableIncome::SelfEmployment(_))
    }

    pub fn paye(&self) -> bool {
        matches!(self, UKTaxableIncome::WagePAYE(_))
    }

    pub fn employment(&self) -> bool {
        matches!(
            self,
            UKTaxableIncome::Wage(_) | UKTaxableIncome::WagePAYE(_)
        )
    }

    pub fn capital(&self) -> bool {
        matches!(
            self,
            UKTaxableIncome::ResiPropertyGains(_) | UKTaxableIncome::OtherGains(_)
        )
    }

    pub fn income(&self) -> bool {
        //Only includes those income streams that are calculated with income tax
        //Does not include Dividend
        matches!(
            self,
            UKTaxableIncome::Wage(_)
                | UKTaxableIncome::WagePAYE(_)
                | UKTaxableIncome::SelfEmployment(_)
                | UKTaxableIncome::SavingsInterest(_)
                | UKTaxableIncome::Rental(_)
        )
    }
}

#[derive(Clone, Debug)]
pub struct TaxPeriod {
    income: Vec<UKTaxableIncome>,
    contributions: Vec<CashValue>,
    payment_schedule: Option<Schedule>,
    paye_tax_paid: CashValue,
    //ni is a variable that can change annually but it is fixed through the simulation life
    ni: NIC,
}

impl TaxPeriod {
    pub fn income(&self) -> CashValue {
        let sum: f64 = self
            .income
            .iter()
            .filter(|v| v.income())
            .map(|v| *v.value())
            .sum();
        CashValue::from(sum)
    }

    pub fn paye_income(&self) -> CashValue {
        let sum: f64 = self
            .income
            .iter()
            .filter(|v| v.paye())
            .map(|v| *v.value())
            .sum();
        CashValue::from(sum)
    }

    pub fn savings_income(&self) -> CashValue {
        let sum: f64 = self
            .income
            .iter()
            .filter(|v| v.savings())
            .map(|v| *v.value())
            .sum();
        CashValue::from(sum)
    }

    pub fn rental_income(&self) -> CashValue {
        let sum: f64 = self
            .income
            .iter()
            .filter(|v| v.rental())
            .map(|v| *v.value())
            .sum();
        CashValue::from(sum)
    }

    pub fn self_employment_income(&self) -> CashValue {
        let sum: f64 = self
            .income
            .iter()
            .filter(|v| v.self_employment())
            .map(|v| *v.value())
            .sum();
        CashValue::from(sum)
    }

    pub fn dividend(&self) -> CashValue {
        let sum: f64 = self
            .income
            .iter()
            .filter(|v| v.dividend())
            .map(|v| *v.value())
            .sum();
        CashValue::from(sum)
    }

    pub fn capital(&self) -> CashValue {
        let sum: f64 = self
            .income
            .iter()
            .filter(|v| v.capital())
            .map(|v| *v.value())
            .sum();
        CashValue::from(sum)
    }

    pub fn employment(&self) -> CashValue {
        let sum: f64 = self
            .income
            .iter()
            .filter(|v| v.employment())
            .map(|v| *v.value())
            .sum();
        CashValue::from(sum)
    }

    pub fn contributions(&self) -> CashValue {
        let sum: f64 = self.contributions.iter().cloned().map(|v| *v).sum();
        CashValue::from(sum)
    }

    pub fn check_bool(&self, date: &i64) -> bool {
        if let Some(payment_schedule) = &self.payment_schedule {
            return payment_schedule.check(date);
        }
        false
    }

    pub fn calc(&self, config: &UKTaxConfig) -> UKTaxOutput {
        let it = IncomeTax::calc(self, config);
        let cg = CapitalGainsTax::calc(self, config);
        let ni = self.ni.calc(self, config);
        let divi = DividendTax::calc(self, &it, config);

        UKTaxOutput {
            income: it,
            capital_gains: cg,
            ni,
            dividend: divi,
            paye_tax_paid: self.paye_tax_paid.clone(),
        }
    }

    //PAYE calculations are totally stateless
    pub fn paye(pay: &f64, contribution: &f64, ni: NIC, config: &UKTaxConfig) -> UKTaxOutput {
        //Filters income passed for PAYE only so can't be called with
        //wrong input
        let it = PAYEIncomeTax::calc(pay, contribution, config);
        let ni = ni.paye_calc(pay, config);

        UKTaxOutput {
            income: it,
            capital_gains: CapitalGainsTaxOutput::zero(),
            ni,
            dividend: CashValue::default(),
            paye_tax_paid: CashValue::default(),
        }
    }

    pub fn add_paye_paid(&mut self, amount: &f64) {
        self.paye_tax_paid = CashValue::from(*self.paye_tax_paid + amount);
    }

    pub fn add_income<I: Into<UKTaxableIncome>>(&mut self, inc: I) {
        self.income.push(inc.into());
    }

    pub fn add_contribution(&mut self, cont: &f64) {
        self.contributions.push(CashValue::from(*cont))
    }

    pub fn with_schedule(payment_schedule: Schedule, ni: NIC) -> Self {
        Self {
            income: Vec::new(),
            contributions: Vec::new(),
            payment_schedule: Some(payment_schedule),
            paye_tax_paid: CashValue::default(),
            ni,
        }
    }
}

#[derive(Clone, Debug)]
pub struct UKTaxConfig {
    basic_income_rate: TaxRate,
    higher_income_rate: TaxRate,
    additional_income_rate: TaxRate,
    basic_dividend_rate: TaxRate,
    higher_dividend_rate: TaxRate,
    additional_dividend_rate: TaxRate,
    basic_residential_capital_rate: TaxRate,
    higher_residential_capital_rate: TaxRate,
    basic_other_capital_rate: TaxRate,
    higher_other_capital_rate: TaxRate,
    ni_band_1_rate: TaxRate,
    ni_band_2_rate: TaxRate,
    ni_band_3_rate: TaxRate,
    personal_allowance_band: CashValue,
    personal_allowance_taper_threshold_band: CashValue,
    personal_allowance_taper_value: CashValue,
    basic_income_top_band: CashValue,
    higher_rate_top_band: CashValue,
    starting_savings_allowance_band: CashValue,
    self_employment_allowance_band: CashValue,
    rental_allowance_band: CashValue,
    dividend_allowance_band: CashValue,
    capital_gains_allowance_band: CashValue,
    ni_band_1_band: CashValue,
    ni_band_2_band: CashValue,
    basic_rate_savings_allowance_band: CashValue,
    higher_rate_savings_allowance_band: CashValue,
}

impl Default for UKTaxConfig {
    fn default() -> Self {
        Self {
            basic_income_rate: TaxRate::from(0.22),
            higher_income_rate: TaxRate::from(0.4),
            additional_income_rate: TaxRate::from(0.45),
            basic_dividend_rate: TaxRate::from(0.0875),
            higher_dividend_rate: TaxRate::from(0.3375),
            additional_dividend_rate: TaxRate::from(0.3935),
            basic_residential_capital_rate: TaxRate::from(0.18),
            basic_other_capital_rate: TaxRate::from(0.1),
            higher_residential_capital_rate: TaxRate::from(0.28),
            higher_other_capital_rate: TaxRate::from(0.28),
            ni_band_1_rate: TaxRate::from(0.0325),
            ni_band_2_rate: TaxRate::from(0.071),
            ni_band_3_rate: TaxRate::from(0.1325),
            personal_allowance_band: CashValue::from(12_571.0),
            personal_allowance_taper_threshold_band: CashValue::from(100_000.0),
            personal_allowance_taper_value: CashValue::from(2.0),
            basic_income_top_band: CashValue::from(50_270.0),
            higher_rate_top_band: CashValue::from(150_000.0),
            starting_savings_allowance_band: CashValue::from(5_000.0),
            self_employment_allowance_band: CashValue::from(1_000.0),
            rental_allowance_band: CashValue::from(1_000.0),
            dividend_allowance_band: CashValue::from(2_000.0),
            capital_gains_allowance_band: CashValue::from(12_300.0),
            ni_band_1_band: CashValue::from(823.01),
            ni_band_2_band: CashValue::from(4_189.0),
            basic_rate_savings_allowance_band: CashValue::from(1000.0),
            higher_rate_savings_allowance_band: CashValue::from(500.0),
        }
    }
}

impl UKTaxConfig {
    pub fn apply_inflation(&self, value: &f64) -> UKTaxConfig {
        UKTaxConfig {
            basic_income_rate: self.basic_income_rate,
            higher_income_rate: self.higher_income_rate,
            additional_income_rate: self.additional_income_rate,
            basic_dividend_rate: self.basic_dividend_rate,
            higher_dividend_rate: self.higher_dividend_rate,
            additional_dividend_rate: self.additional_dividend_rate,
            basic_residential_capital_rate: self.basic_residential_capital_rate,
            basic_other_capital_rate: self.basic_other_capital_rate,
            higher_residential_capital_rate: self.higher_residential_capital_rate,
            higher_other_capital_rate: self.higher_other_capital_rate,
            ni_band_1_rate: self.ni_band_1_rate,
            ni_band_2_rate: self.ni_band_2_rate,
            ni_band_3_rate: self.ni_band_3_rate,
            personal_allowance_band: CashValue::from(*self.personal_allowance_band * (1.0 + value)),
            personal_allowance_taper_threshold_band: CashValue::from(
                *self.personal_allowance_taper_threshold_band * (1.0 + value),
            ),
            personal_allowance_taper_value: CashValue::from(
                *self.personal_allowance_taper_value * (1.0 + value),
            ),
            basic_income_top_band: CashValue::from(*self.basic_income_top_band * (1.0 + value)),
            higher_rate_top_band: CashValue::from(*self.higher_rate_top_band * (1.0 + value)),
            starting_savings_allowance_band: CashValue::from(
                *self.starting_savings_allowance_band * (1.0 + value),
            ),
            self_employment_allowance_band: CashValue::from(
                *self.self_employment_allowance_band * (1.0 + value),
            ),
            rental_allowance_band: CashValue::from(*self.rental_allowance_band * (1.0 + value)),
            dividend_allowance_band: CashValue::from(*self.dividend_allowance_band * (1.0 + value)),
            capital_gains_allowance_band: CashValue::from(
                *self.capital_gains_allowance_band * (1.0 + value),
            ),
            ni_band_1_band: CashValue::from(*self.ni_band_1_band * (1.0 + value)),
            ni_band_2_band: CashValue::from(*self.ni_band_2_band * (1.0 + value)),
            basic_rate_savings_allowance_band: CashValue::from(
                *self.basic_rate_savings_allowance_band * (1.0 + value),
            ),
            higher_rate_savings_allowance_band: CashValue::from(
                *self.higher_rate_savings_allowance_band * (1.0 + value),
            ),
        }
    }
}

#[cfg(test)]
mod tests {
    use alator::types::CashValue;

    use super::{TaxPeriod, UKTaxConfig, UKTaxableIncome, NIC};
    use crate::schedule::Schedule;

    #[test]
    fn test_that_uk_tax_flow_works() {
        let config = UKTaxConfig::default();
        let schedule = Schedule::EveryYear(1, 4);
        let mut builder = TaxPeriod::with_schedule(schedule, NIC::A);
        builder.add_income(UKTaxableIncome::Wage(80_000.0.into()));
        builder.add_contribution(&(4_000.0.into()));
        let paid = builder.calc(&config);
        let _total = paid.total();
    }

    #[test]
    fn test_that_income_tax_calculates_correctly() {
        //This is a rough test, not bound closely to the actual values
        let annual_wage = 45_000.0;
        let contribution_rate = 0.05;
        let contribution = annual_wage * contribution_rate;
        let config = UKTaxConfig::default();
        let schedule = Schedule::EveryYear(1, 4);

        let mut builder = TaxPeriod::with_schedule(schedule, NIC::A);
        builder.add_income(UKTaxableIncome::Wage(CashValue::from(annual_wage)));
        builder.add_contribution(&contribution);
        let paid = builder.calc(&config);
        let _total = paid.total();
        assert!(*paid.total() > 8_000.0 && *paid.total() < 12_000.0);
    }

    #[test]
    fn test_that_dividend_income_calculates_correctly() {
        //This is a rough test that the output is sane, not that is exactly correct
        let config = UKTaxConfig::default();
        let schedule = Schedule::EveryYear(1, 4);
        let annual_wage = 70_000.0;
        let dividend = 10_000.0;

        let mut builder = TaxPeriod::with_schedule(schedule.clone(), NIC::A);
        builder.add_income(UKTaxableIncome::Wage(CashValue::from(annual_wage)));
        builder.add_income(UKTaxableIncome::Dividend(CashValue::from(dividend)));
        let tax_paid = builder.calc(&config).total();

        //Should be within a few percent of normal income tax rate for income above
        //basic rate
        let mut builder1 = TaxPeriod::with_schedule(schedule, NIC::A);
        builder1.add_income(UKTaxableIncome::Wage(CashValue::from(80_000.0)));
        let tax_paid1 = builder1.calc(&config).total();
        assert!(*tax_paid / *tax_paid1 > 0.9);
    }

    #[test]
    fn test_that_paye_income_calculates_correctly() {
        //This is very rough until we build out everything fully
        //but PAYE should come out to somewhere near the annual
        //figure using a wage with minimal adjustments
        let annual_wage = 80_000.0;
        let contribution_rate = 0.05;
        let annual_contribution = annual_wage * contribution_rate;
        let monthly_wage = annual_wage / 12.0;
        let monthly_contribution = monthly_wage * contribution_rate;
        let config = UKTaxConfig::default();
        let schedule = Schedule::EveryYear(1, 4);

        let paye = TaxPeriod::paye(&monthly_wage, &monthly_contribution, NIC::A, &config);
        let paye_paid = paye.total();

        let mut builder = TaxPeriod::with_schedule(schedule, NIC::A);
        builder.add_income(UKTaxableIncome::Wage(CashValue::from(annual_wage)));
        builder.add_contribution(&annual_contribution);
        let tax_paid = builder.calc(&config).total();

        let annualised_paye_total = *paye_paid * 12.0;
        let diff = *tax_paid - annualised_paye_total;
        assert!(diff > -10.0 && diff < 10.0);
    }
}
