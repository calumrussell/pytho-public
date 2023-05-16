use alator::types::CashValue;
use serde::{Deserialize, Serialize};

use super::{UKTaxConfig, UKTaxInput};
use crate::tax::ThresholdCalculator;

pub struct NIB1;
impl NIB1 {
    pub fn calc(income: &f64, is_paye: bool, config: &UKTaxConfig) -> CashValue {
        let mut min = *config.ni_band_2_band;
        if !is_paye {
            min *= 12.0;
        }
        let max = f64::MAX;
        let rate = config.ni_band_1_rate;
        ThresholdCalculator::calc(&min, &max, rate)(income)
    }
}

pub struct NIB2;
impl NIB2 {
    pub fn calc(income: &f64, is_paye: bool, config: &UKTaxConfig) -> CashValue {
        let mut min = *config.ni_band_1_band;
        let mut max = *config.ni_band_2_band;
        if !is_paye {
            min *= 12.0;
            max *= 12.0;
        }
        let rate = config.ni_band_2_rate;
        ThresholdCalculator::calc(&min, &max, rate)(income)
    }
}

pub struct NIB3;
impl NIB3 {
    pub fn calc(income: &f64, is_paye: bool, config: &UKTaxConfig) -> CashValue {
        let mut min = *config.ni_band_1_band;
        let mut max = *config.ni_band_2_band;
        if !is_paye {
            min *= 12.0;
            max *= 12.0;
        }
        let rate = config.ni_band_3_rate;
        ThresholdCalculator::calc(&min, &max, rate)(income)
    }
}

pub struct NIB4;
impl NIB4 {
    pub fn calc(income: &f64, is_paye: bool, config: &UKTaxConfig) -> CashValue {
        let mut min = *config.ni_band_1_band;
        let mut max = *config.ni_band_2_band;
        if !is_paye {
            min *= 12.0;
            max *= 12.0;
        }
        let rate = config.ni_band_1_rate;
        ThresholdCalculator::calc(&min, &max, rate)(income)
    }
}

#[derive(Debug)]
pub struct NITaxOutput(CashValue);

impl NITaxOutput {
    pub fn total(&self) -> CashValue {
        self.0.clone()
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

fn ni_calc(nic: &NIC, inc: &f64, is_paye: bool, config: &UKTaxConfig) -> CashValue {
    match nic {
        NIC::A | NIC::F | NIC::H | NIC::M | NIC::V => {
            let sum = *NIB3::calc(inc, is_paye, config) + *NIB1::calc(inc, is_paye, config);
            CashValue::from(sum)
        }
        NIC::B | NIC::I => {
            let sum = *NIB2::calc(inc, is_paye, config) + *NIB1::calc(inc, is_paye, config);
            CashValue::from(sum)
        }
        NIC::J | NIC::L | NIC::Z => {
            let sum = *NIB4::calc(inc, is_paye, config) + *NIB1::calc(inc, is_paye, config);
            CashValue::from(sum)
        }
        NIC::C | NIC::S => CashValue::from(0.0),
    }
}

impl NIC {
    pub fn calc(&self, period: &UKTaxInput, config: &UKTaxConfig) -> NITaxOutput {
        //We only take non_paye_employment income here because paye_employment has already paid NI
        let employment_income = &period.non_paye_employment;
        let ni = ni_calc(self, &employment_income, false, config);
        NITaxOutput(ni)
    }

    pub fn paye_calc(&self, pay: &f64, config: &UKTaxConfig) -> NITaxOutput {
        let ni = ni_calc(self, pay, true, config);
        NITaxOutput(ni)
    }
}
