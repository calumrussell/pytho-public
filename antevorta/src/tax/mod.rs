pub mod uk;

use alator::types::CashValue;
use std::ops::Deref;

#[derive(Clone, Copy, Debug)]
pub struct TaxRate(f64);

impl Deref for TaxRate {
    type Target = f64;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl From<f64> for TaxRate {
    fn from(v: f64) -> Self {
        Self(v)
    }
}

impl From<TaxRate> for f64 {
    fn from(v: TaxRate) -> Self {
        v.0
    }
}

pub trait Threshold {
    const MIN: CashValue;
    const MAX: CashValue;
    const RATE: TaxRate;

    fn calc(total_income: &f64) -> CashValue {
        let mut taxable_income = 0.0;
        if total_income > &Self::MIN {
            if total_income < &Self::MAX {
                taxable_income = *total_income - *Self::MIN;
            } else {
                taxable_income = *Self::MAX - *Self::MIN;
            }
        }
        CashValue::from(taxable_income * *Self::RATE)
    }
}

pub struct ThresholdCalculator;

impl ThresholdCalculator {
    pub fn calc<'a>(
        min: &'a f64,
        max: &'a f64,
        rate: TaxRate,
    ) -> Box<dyn FnOnce(&f64) -> CashValue + 'a> {
        let func = move |income: &f64| {
            let taxable_income;
            if income > min {
                if income < max {
                    taxable_income = income - min;
                } else {
                    taxable_income = max - min;
                }
                CashValue::from(taxable_income * *rate)
            } else {
                CashValue::from(0.0)
            }
        };
        Box::new(func)
    }
}
