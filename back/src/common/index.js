"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transpose = exports.bootstrap = exports.regressions = exports.regression = exports.some = exports.none = void 0;
function none() {
    return { _tag: "None" };
}
exports.none = none;
function some(value) {
    return { _tag: "Some", value };
}
exports.some = some;
const ml_regression_multivariate_linear_1 = __importDefault(require("ml-regression-multivariate-linear"));
function regression(y, x) {
    const mlr = new ml_regression_multivariate_linear_1.default(x, y);
    return {
        coefs: mlr.weights.reverse().map(v => parseFloat(v[0].toFixed(2))),
        errors: mlr.stdErrors.reverse().map(v => parseFloat(v.toFixed(2))),
    };
}
exports.regression = regression;
;
function regressions(y, x) {
    const results = y.map((data, i) => regression(data, x[i]));
    return {
        coefs: results.map((r) => r.coefs),
        errors: results.map((r) => r.errors),
    };
}
exports.regressions = regressions;
const randomSampleFromList = (arr) => {
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
};
const percentile = (arr, p) => {
    if (arr.length === 0)
        return 0;
    if (typeof p !== 'number')
        throw new TypeError('p must be a number');
    if (p <= 0)
        return arr[0];
    if (p >= 1)
        return arr[arr.length - 1];
    var index = (arr.length - 1) * p, lower = Math.floor(index), upper = lower + 1, weight = index % 1;
    if (upper >= arr.length)
        return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
};
//TODO: This is just percentile estimates, we need studentized because (I think) the
//estimates are skewed but there is no package and it is going to take a few
//hours to implement.
function bootstrap(data, runs, sample_size) {
    let avgs = [];
    for (let i = 0; i < runs; i++) {
        let samples = [];
        for (let j = 0; j < sample_size; j++) {
            samples.push(randomSampleFromList(data));
        }
        avgs.push(samples.reduce((acc, curr) => acc + curr, 0));
    }
    return [percentile(avgs.sort(), 0.05), percentile(avgs.sort(), 0.95)];
}
exports.bootstrap = bootstrap;
function transpose(matrix) {
    return matrix[0].map((col, i) => matrix.map(row => row[i]));
}
exports.transpose = transpose;
