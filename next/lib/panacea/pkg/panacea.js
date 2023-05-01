import * as wasm from "./panacea_bg.wasm";
import { __wbg_set_wasm } from "./panacea_bg.js";
__wbg_set_wasm(wasm);
export * from "./panacea_bg.js";
