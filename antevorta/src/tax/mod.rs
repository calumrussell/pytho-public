use alator::types::CashValue;
use std::ops::Mul;

#[derive(Clone, Copy, Debug)]
pub struct TaxRate(f64);

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

impl Mul<CashValue> for TaxRate {
    type Output = CashValue;
    fn mul(self, rhs: CashValue) -> Self::Output {
        CashValue::from(self.0 * f64::from(rhs))
    }
}

impl Mul<TaxRate> for CashValue {
    type Output = Self;
    fn mul(self, rhs: TaxRate) -> Self::Output {
        CashValue::from(f64::from(self) * rhs.0)
    }
}

pub trait Threshold {
    const MIN: CashValue;
    const MAX: CashValue;
    const RATE: TaxRate;

    fn calc(total_income: &CashValue) -> CashValue {
        let mut taxable_income = CashValue::default();
        if total_income > &Self::MIN {
            if total_income < &Self::MAX {
                taxable_income = *total_income - Self::MIN;
            } else {
                taxable_income = Self::MAX - Self::MIN;
            }
        }
        taxable_income * Self::RATE
    }
}

pub struct ThresholdCalculator;

impl ThresholdCalculator {
    pub fn calc(
        min: CashValue,
        max: CashValue,
        rate: TaxRate,
    ) -> Box<dyn FnOnce(CashValue) -> CashValue + 'static> {
        let func = move |income: CashValue| {
            let taxable_income;
            if income > min {
                if income < max {
                    taxable_income = income - min;
                } else {
                    taxable_income = max - min;
                }
                taxable_income * rate
            } else {
                CashValue::default()
            }
        };
        Box::new(func)
    }
}
