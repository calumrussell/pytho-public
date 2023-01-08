pub mod calcs;
pub mod eod;
pub mod risk;
pub mod sim;
pub mod stat;

use calcs::{max_dd_threshold_position, DDInput, DDResults};
use risk::{EodRawRiskInput, risk_analysis};
use std::panic;
use wasm_bindgen::prelude::*;

use sim::{alator_backtest, AlatorResults, EodRawAlatorInput, EodRawAntevortaInput};
use sim::{antevorta_multiple, AntevortaResults};

extern crate console_error_panic_hook;

#[wasm_bindgen]
pub fn backtest(js_input: JsValue) -> JsValue {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
    let raw_input: EodRawAlatorInput = serde_wasm_bindgen::from_value(js_input).unwrap();
    let backtest_res: AlatorResults = alator_backtest(raw_input.into());
    serde_wasm_bindgen::to_value(&backtest_res).unwrap()
}

#[wasm_bindgen]
pub fn antevorta(js_input: JsValue) -> JsValue {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
    let raw_input: EodRawAntevortaInput = serde_wasm_bindgen::from_value(js_input).unwrap();
    let antevorta_res: AntevortaResults = antevorta_multiple(raw_input.into()).unwrap();
    serde_wasm_bindgen::to_value(&antevorta_res).unwrap()
}

#[wasm_bindgen]
pub fn drawdown(js_input: JsValue) -> JsValue {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
    let input: DDInput = serde_wasm_bindgen::from_value(js_input).unwrap();
    let dd_res: DDResults = max_dd_threshold_position(input);
    serde_wasm_bindgen::to_value(&dd_res).unwrap()
}

#[wasm_bindgen]
pub fn risk(js_input: JsValue) -> JsValue {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
    let input: EodRawRiskInput = serde_wasm_bindgen::from_value(js_input).unwrap();
    let risk_result = risk_analysis(&input);
    serde_wasm_bindgen::to_value(&risk_result).unwrap()
 
}
