"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.some = exports.none = void 0;
function none() {
    return { _tag: "None" };
}
exports.none = none;
function some(value) {
    return { _tag: "Some", value };
}
exports.some = some;
