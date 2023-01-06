pub mod calcs;
pub mod data;
pub mod sim;
pub mod stat;

use calcs::{DDInput, DDResults, max_dd_threshold_position};
use data::EodRawAntevortaInput;
use wasm_bindgen::prelude::*;
use std::panic;

use sim::{AlatorInput, alator_backtest, AlatorResults};
use sim::{AntevortaMultipleInput, AntevortaResults, antevorta_multiple};

extern crate console_error_panic_hook;

#[wasm_bindgen]
pub fn backtest(js_input: JsValue) -> JsValue {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
    let input: AlatorInput = serde_wasm_bindgen::from_value(js_input).unwrap();
    let backtest_res: AlatorResults = alator_backtest(input);
    serde_wasm_bindgen::to_value(&backtest_res).unwrap()
}

#[wasm_bindgen]
pub fn antevorta(js_input: JsValue) -> JsValue {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
    let raw_input: EodRawAntevortaInput = serde_wasm_bindgen::from_value(js_input).unwrap();
    let input: AntevortaMultipleInput = raw_input.into();
    let antevorta_res: AntevortaResults = antevorta_multiple(input).unwrap();
    serde_wasm_bindgen::to_value(&antevorta_res).unwrap()
}

#[wasm_bindgen]
pub fn drawdown(js_input: JsValue) -> JsValue {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
    let input: DDInput = serde_wasm_bindgen::from_value(js_input).unwrap();
    let dd_res: DDResults = max_dd_threshold_position(input);
    serde_wasm_bindgen::to_value(&dd_res).unwrap()
}
