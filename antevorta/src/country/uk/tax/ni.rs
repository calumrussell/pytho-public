use alator::types::CashValue;
use serde::{Deserialize, Serialize};

use super::{TaxPeriod, UKTaxConfig};
use crate::tax::ThresholdCalculator;

pub struct NIB1;
impl NIB1 {
    pub fn calc(income: &CashValue, is_paye: bool, config: &UKTaxConfig) -> CashValue {
        let mut min = config.ni_band_2_band;
        if !is_paye {
            min *= 12.0;
        }
        let max = CashValue::MAX.into();
        let rate = config.ni_band_1_rate;
        ThresholdCalculator::calc(min, max, rate)(*income)
    }
}

pub struct NIB2;
impl NIB2 {
    pub fn calc(income: &CashValue, is_paye: bool, config: &UKTaxConfig) -> CashValue {
        let mut min = config.ni_band_1_band;
        let mut max = config.ni_band_2_band;
        if !is_paye {
            min *= 12.0;
            max *= 12.0;
        }
        let rate = config.ni_band_2_rate;
        ThresholdCalculator::calc(min, max, rate)(*income)
    }
}

pub struct NIB3;
impl NIB3 {
    pub fn calc(income: &CashValue, is_paye: bool, config: &UKTaxConfig) -> CashValue {
        let mut min = config.ni_band_1_band;
        let mut max = config.ni_band_2_band;
        if !is_paye {
            min *= 12.0;
            max *= 12.0;
        }
        let rate = config.ni_band_3_rate;
        ThresholdCalculator::calc(min, max, rate)(*income)
    }
}

pub struct NIB4;
impl NIB4 {
    pub fn calc(income: &CashValue, is_paye: bool, config: &UKTaxConfig) -> CashValue {
        let mut min = config.ni_band_1_band;
        let mut max = config.ni_band_2_band;
        if !is_paye {
            min *= 12.0;
            max *= 12.0;
        }
        let rate = config.ni_band_1_rate;
        ThresholdCalculator::calc(min, max, rate)(*income)
    }
}

#[derive(Debug)]
pub struct NITaxOutput(CashValue);

impl NITaxOutput {
    pub fn total(&self) -> CashValue {
        self.0
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
pub enum NIC {
    A,
    B,
    C,
    F,
    H,
    I,
    J,
    L,
    M,
    S,
    V,
    Z,
}

fn ni_calc(nic: &NIC, inc: &CashValue, is_paye: bool, config: &UKTaxConfig) -> CashValue {
    match nic {
        NIC::A | NIC::F | NIC::H | NIC::M | NIC::V => {
            NIB3::calc(inc, is_paye, config) + NIB1::calc(inc, is_paye, config)
        }
        NIC::B | NIC::I => NIB2::calc(inc, is_paye, config) + NIB1::calc(inc, is_paye, config),
        NIC::J | NIC::L | NIC::Z => NIB4::calc(inc, is_paye, config) + NIB1::calc(inc, is_paye, config),
        NIC::C | NIC::S => CashValue::default(),
    }
}

impl NIC {
    pub fn calc(&self, period: &TaxPeriod, config: &UKTaxConfig) -> NITaxOutput {
        let employment_income = period.employment();
        let ni = ni_calc(self, &employment_income, false, config);
        NITaxOutput(ni)
    }

    pub fn paye_calc(&self, pay: &CashValue, config: &UKTaxConfig) -> NITaxOutput {
        let ni = ni_calc(self, pay, true, config);
        NITaxOutput(ni)
    }
}
