mod capital;
mod income;
mod ni;

use alator::types::CashValue;

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

pub struct UKTaxInput {
    pub non_paye_employment: CashValue,
    pub paye_employment: CashValue,
    pub savings: CashValue,
    pub rental: CashValue,
    pub self_employment: CashValue,
    pub contributions: CashValue,
    pub paye_tax_paid: CashValue,
    pub ni: NIC,
    pub dividend: CashValue,
    pub capital_gains: CashValue,
}

impl UKTaxInput {
    pub fn default() -> Self {
        Self {
            non_paye_employment: CashValue::from(0.0),
            paye_employment: CashValue::from(0.0),
            savings: CashValue::from(0.0),
            rental: CashValue::from(0.0),
            self_employment: CashValue::from(0.0),
            contributions: CashValue::from(0.0),
            paye_tax_paid: CashValue::from(0.0),
            ni: NIC::A,
            dividend: CashValue::from(0.0),
            capital_gains: CashValue::from(0.0),
        }
    }
}

#[derive(Clone, Debug)]
pub struct TaxPeriod;

impl TaxPeriod {
    pub fn calc(input: &UKTaxInput, config: &UKTaxConfig) -> UKTaxOutput {
        let it = IncomeTax::calc(input, config);
        let cg = CapitalGainsTax::calc(input, config);
        let ni = input.ni.calc(input, config);
        let divi = DividendTax::calc(input, &it, config);

        UKTaxOutput {
            income: it,
            capital_gains: cg,
            ni,
            dividend: divi,
            paye_tax_paid: input.paye_tax_paid.clone(),
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
    use super::{TaxPeriod, UKTaxConfig, UKTaxInput, NIC};

    #[test]
    fn test_that_uk_tax_flow_works() {
        let config = UKTaxConfig::default();
        let mut input = UKTaxInput::default();
        input.non_paye_employment = 80_000.0.into();
        input.contributions = 4_000.0.into();

        let paid = TaxPeriod::calc(&input, &config);
        let _total = paid.total();
    }

    #[test]
    fn test_that_income_tax_calculates_correctly() {
        //This is a rough test, not bound closely to the actual values
        let config = UKTaxConfig::default();
        let mut input = UKTaxInput::default();
        input.non_paye_employment = 45_000.0.into();
        //Implies 5% contributions
        input.contributions = 2_250.0.into();

        let paid = TaxPeriod::calc(&input, &config);
        assert!(*paid.total() > 8_000.0 && *paid.total() < 12_000.0);
    }

    #[test]
    fn test_that_dividend_income_calculates_correctly() {
        //This is a rough test that the output is sane, not that is exactly correct
        let config = UKTaxConfig::default();
        let mut input = UKTaxInput::default();
        input.non_paye_employment = 70_000.0.into();
        input.dividend = 10_000.0.into();
        let tax_paid = TaxPeriod::calc(&input, &config).total();

        //Should be within a few percent of normal income tax rate for income above
        //basic rate
        let mut input1 = UKTaxInput::default();
        input1.non_paye_employment = 80_000.0.into();
        let tax_paid1 = TaxPeriod::calc(&input1, &config).total();
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

        let paye = TaxPeriod::paye(&monthly_wage, &monthly_contribution, NIC::A, &config);
        let paye_paid = paye.total();

        let mut input = UKTaxInput::default();
        input.non_paye_employment = annual_wage.into();
        input.contributions = annual_contribution.into();
        let tax_paid = TaxPeriod::calc(&input, &config).total();

        let annualised_paye_total = *paye_paid * 12.0;
        let diff = *tax_paid - annualised_paye_total;
        assert!(diff > -10.0 && diff < 10.0);
    }
}
