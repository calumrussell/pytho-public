use alator::types::CashValue;

use super::income::IncomeTax;
use super::{TaxPeriod, UKTaxConfig};

#[derive(Debug)]
pub struct CapitalGainsTaxOutput(CashValue);

impl CapitalGainsTaxOutput {
    pub fn total(&self) -> CashValue {
        self.0.clone()
    }

    pub fn zero() -> Self {
        CapitalGainsTaxOutput(CashValue::default())
    }
}

pub struct CapitalGainsTax;
impl CapitalGainsTax {
    pub fn calc(period: &TaxPeriod, config: &UKTaxConfig) -> CapitalGainsTaxOutput {
        let capital_gains = period.capital();

        let taxable_income = IncomeTax::taxable_income(period);
        //TODO: Probably need to be reduced for income over 100k
        //Need some separate calculation for the personal allowance?
        let income_over_basic = *taxable_income - *config.personal_allowance_band;

        let taxable_gain = *capital_gains - *config.capital_gains_allowance_band;
        if income_over_basic + taxable_gain < *config.basic_income_top_band {
            let resi_tax = *capital_gains * *config.basic_residential_capital_rate;
            let other_tax = *capital_gains * *config.basic_other_capital_rate;
            CapitalGainsTaxOutput(CashValue::from(resi_tax + other_tax))
        } else {
            let resi_tax = *capital_gains * *config.higher_residential_capital_rate;
            let other_tax = *capital_gains * *config.higher_other_capital_rate;
            CapitalGainsTaxOutput(CashValue::from(resi_tax + other_tax))
        }
    }
}
