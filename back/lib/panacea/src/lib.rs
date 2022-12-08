pub mod calcs;
pub mod sim;
pub mod stat;

use calcs::{DDInput, DDResults, max_dd_threshold_position};
use wasm_bindgen::prelude::*;

use sim::{AlatorInput, alator_backtest, AlatorResults};
use sim::{AntevortaMultipleInput, AntevortaResults, antevorta_multiple};

#[wasm_bindgen]
pub fn backtest(js_input: JsValue) -> JsValue {
    let input: AlatorInput = serde_wasm_bindgen::from_value(js_input).unwrap();
    let backtest_res: AlatorResults = alator_backtest(input);
    serde_wasm_bindgen::to_value(&backtest_res).unwrap()
}

#[wasm_bindgen]
pub fn antevorta(js_input: JsValue) -> JsValue {
    let input: AntevortaMultipleInput = serde_wasm_bindgen::from_value(js_input).unwrap();
    let antevorta_res: AntevortaResults = antevorta_multiple(input).unwrap();
    serde_wasm_bindgen::to_value(&antevorta_res).unwrap()
}

#[wasm_bindgen]
pub fn drawdown(js_input: JsValue) -> JsValue {
    let input: DDInput = serde_wasm_bindgen::from_value(js_input).unwrap();
    let dd_res: DDResults = max_dd_threshold_position(input);
    serde_wasm_bindgen::to_value(&dd_res).unwrap()
}
