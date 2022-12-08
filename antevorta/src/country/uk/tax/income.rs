use alator::types::CashValue;

use crate::country::uk::tax::{TaxPeriod};
use crate::tax::ThresholdCalculator;

use super::UKTaxConfig;

fn basic(total_income: &CashValue, is_paye: bool, config: &UKTaxConfig) -> CashValue {
    let mut allowance_taper_threshold = config.personal_allowance_taper_threshold_band;
    let mut min = config.personal_allowance_band;
    let mut max = config.basic_income_top_band;
    if is_paye {
        allowance_taper_threshold /= 12.0;
        min /= 12.0;
        max /= 12.0;
    }

    let rate = config.basic_income_rate;
    if total_income < &allowance_taper_threshold {
        return ThresholdCalculator::calc(min, max, rate)(*total_income);
    } else {
        let income_over = *total_income - allowance_taper_threshold;

        let taper = config.personal_allowance_taper_value;
        let mut min_basic_threshold = (min * taper) - income_over;
        if min_basic_threshold < 0.0 {
            min_basic_threshold = CashValue::default();
        }
        return ThresholdCalculator::calc(min_basic_threshold, max, rate)(*total_income);
    }
}

fn higher(total_income: &CashValue, is_paye: bool, config: &UKTaxConfig) -> CashValue {
    let rate = config.higher_income_rate;
    let min = config.basic_income_top_band + 1.0;
    let max = config.higher_rate_top_band;
    if is_paye {
        return ThresholdCalculator::calc(min / 12.0, max / 12.0, rate)(*total_income);
    } else {
        return ThresholdCalculator::calc(min, max, rate)(*total_income);
    }
}

fn additional(total_income: &CashValue, is_paye: bool, config: &UKTaxConfig) -> CashValue {
    let rate = config.additional_income_rate;
    let min = config.higher_rate_top_band + 1.0;
    let max = CashValue::MAX.into();
    if is_paye {
        return ThresholdCalculator::calc(min / 12.0, max, rate)(*total_income);
    } else {
        return ThresholdCalculator::calc(min, max, rate)(*total_income);
    }
}

//Savings allowance is calculated using taxable income including savings.
//If savings income puts you into the additional bracket then there is no allowance.
//We can safely calculate after income_tax has been calculated on all income.
fn personal_savings_allowance(
    savings_income: &CashValue,
    _basic: CashValue,
    higher: CashValue,
    additional: CashValue,
    config: &UKTaxConfig,
) -> CashValue {
    if *savings_income == 0.0 {
        return CashValue::default();
    }

    if additional != 0.0 {
        return CashValue::default();
    }
    if higher == 0.0 {
        //basic rate
        let basic_allowance = config.basic_rate_savings_allowance_band;
        if *savings_income > basic_allowance {
            basic_allowance
        } else {
            *savings_income
        }
    } else {
        //higher rate
        let higher_allowance = config.higher_rate_savings_allowance_band;
        if *savings_income > higher_allowance {
            higher_allowance
        } else {
            *savings_income
        }
    }
}

fn starting_savings_allowance(savings_income: &CashValue, total_income: &CashValue, config: &UKTaxConfig) -> CashValue {
    let allowance = config.starting_savings_allowance_band;
    let threshold = config.personal_allowance_band + allowance;

    if *total_income < threshold {
        if *savings_income > allowance {
            allowance
        } else {
            *savings_income
        }
    } else {
        CashValue::default()
    }
}

fn self_employment_allowance(self_employment_income: &CashValue, config: &UKTaxConfig) -> CashValue {
    let allowance = config.self_employment_allowance_band;
    if *self_employment_income > 0.0 {
        if self_employment_income > &allowance {
            allowance
        } else {
            *self_employment_income
        }
    } else {
        CashValue::default()
    }
}

fn rental_allowance(rental_income: &CashValue, config: &UKTaxConfig) -> CashValue {
    let allowance = config.rental_allowance_band;
    if *rental_income > 0.0 {
        if *rental_income > allowance {
            return allowance;
        } else {
            return *rental_income;
        }
    }
    CashValue::default()
}

#[derive(Debug)]
pub struct IncomeTaxOutput(CashValue, CashValue, CashValue, CashValue, CashValue);
impl IncomeTaxOutput {
    pub fn additional(&self) -> CashValue {
        self.2
    }

    pub fn taxable_income(&self) -> CashValue {
        self.4
    }

    pub fn total(&self) -> CashValue {
        self.0 + self.1 + self.2 - self.3
    }
}

pub struct IncomeTax;
impl IncomeTax {
    pub fn calc(period: &TaxPeriod, config: &UKTaxConfig) -> IncomeTaxOutput {
        let taxable_income_net_pension = Self::taxable_income(period);
        let basic = basic(&taxable_income_net_pension, false, config);
        let higher = higher(&taxable_income_net_pension, false, config);
        let additional = additional(&taxable_income_net_pension, false, config);

        let allowances = Self::allowances(period, &basic, &higher, &additional, config);
        IncomeTaxOutput(
            basic,
            higher,
            additional,
            allowances,
            taxable_income_net_pension,
        )
    }

    fn allowances(
        period: &TaxPeriod,
        basic: &CashValue,
        higher: &CashValue,
        additional: &CashValue,
        config: &UKTaxConfig,
    ) -> CashValue {
        let total_income = period.income();
        let savings_income = period.savings_income();
        let rental_income = period.rental_income();
        let self_employment_income = period.self_employment_income();

        let saving_allowance =
            personal_savings_allowance(&savings_income, *basic, *higher, *additional, config);
        let self_employment_allowance = self_employment_allowance(&self_employment_income, config);
        let rental_allowance = rental_allowance(&rental_income, config);
        let starting_savings_allowance = starting_savings_allowance(&savings_income, &total_income, config);
        saving_allowance + self_employment_allowance + rental_allowance + starting_savings_allowance
    }

    pub fn taxable_income(period: &TaxPeriod) -> CashValue {
        let total_income = period.income();
        //Contribution won't be invalid because rules are encoded
        //in SIPP account, and we only pass contribution after we are
        //sure that it can be deposited into account with breaking limits
        let total_contributions = period.contributions();
        total_income - total_contributions
    }
}

pub struct PAYEIncomeTax;

impl PAYEIncomeTax {
    pub fn calc(pay: &CashValue, contribution: &CashValue, config: &UKTaxConfig) -> IncomeTaxOutput {
        //Contribution won't be invalid because rules are encoded
        //in SIPP account, and we only pass contribution after we are
        //sure that it can be deposited into account with breaking limits
        let taxable_income_net_pension = *pay - *contribution;

        let basic = basic(&taxable_income_net_pension, true, config);
        let higher = higher(&taxable_income_net_pension, true, config);
        let additional = additional(&taxable_income_net_pension, true, config);
        //PAYE has no allowances
        IncomeTaxOutput(
            basic,
            higher,
            additional,
            CashValue::default(),
            taxable_income_net_pension,
        )
    }
}

pub struct DividendTax;

impl DividendTax {
    pub fn calc(period: &TaxPeriod, income_tax: &IncomeTaxOutput, config: &UKTaxConfig) -> CashValue {
        let dividend = period.dividend();

        let allowance = config.dividend_allowance_band;
        let basic = config.basic_dividend_rate;
        let higher = config.higher_dividend_rate;
        let additional = config.additional_dividend_rate;

        if dividend <= allowance {
            return CashValue::default();
        }

        let taxable_amount = dividend - allowance;
        if income_tax.additional() > 0.0 {
            taxable_amount * additional
        } else {
            let mut income_left = taxable_amount;
            let mut tax_paid = CashValue::default();

            let remaining_basic_allowance =
                config.basic_income_top_band - income_tax.taxable_income();
            if remaining_basic_allowance > 0.0 {
                if remaining_basic_allowance < income_left {
                    tax_paid += remaining_basic_allowance * basic;
                    income_left -= remaining_basic_allowance;
                } else {
                    tax_paid += income_left * basic;
                    income_left = CashValue::default();
                }
            }
            let remaining_higher_allowance =
                config.higher_rate_top_band - income_tax.taxable_income();
            if remaining_higher_allowance > 0.0 && income_left > 0.0 {
                if remaining_higher_allowance < income_left {
                    tax_paid += remaining_higher_allowance * higher;
                    income_left -= remaining_higher_allowance;
                } else {
                    tax_paid += income_left * higher;
                    income_left = CashValue::default();
                }
            }
            if income_left > 0.0 {
                tax_paid += income_left * additional;
            }
            tax_paid
        }
    }
}

#[cfg(test)]
mod tests {
    use super::personal_savings_allowance;

    use crate::country::uk::tax::UKTaxConfig;

    #[test]
    fn test_savings_allowance_output() {
        let config = UKTaxConfig::default();
        //Basic rate taxpayer, no savings income should generate zero allowance
        let a = personal_savings_allowance(&0.0.into(), 1_000.0.into(), 0.0.into(), 0.0.into(), &config);
        assert!(a == 0.0);

        //Higher rate taxpayer with savings income should generate allowance
        let a1 =
            personal_savings_allowance(&1_000.0.into(), 1_000.0.into(), 1_000.0.into(), 0.0.into(), &config);
        assert!(a1 != 0.0);

        //Basic rate taxpayer with savings income should generate allowance
        let a2 =
            personal_savings_allowance(&1_000.0.into(), 1_000.0.into(), 0.0.into(), 0.0.into(), &config);
        assert!(a2 != 0.0);
    }
}
