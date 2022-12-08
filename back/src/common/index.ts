export interface None {
  _tag: "None";
}

export interface Some<T> {
  _tag: "Some";
  readonly value: T;
}

export type Option<T> = None | Some<T>;

export function none(): None {
  return { _tag: "None" };
}

export function some<T>(value: T): Some<T> {
  return { _tag: "Some", value };
}

import MLR from "ml-regression-multivariate-linear";

export interface RegressionResult {
  coefs: Array<number>,
  errors: Array<number>,
}

export function regression(y: Array<Array<number>>, x: Array<Array<number>>): RegressionResult {
  const mlr = new MLR(x, y);
  return {
    coefs: mlr.weights.reverse().map(v => parseFloat(v[0].toFixed(2))),
    errors: mlr.stdErrors.reverse().map(v => parseFloat(v.toFixed(2))),
  };
}; 

export interface RegressionResults {
  coefs: Array<Array<number>>,
  errors: Array<Array<number>>,
}

export function regressions(y: Array<Array<Array<number>>>, x: Array<Array<Array<number>>>): RegressionResults {
  const results = y.map((data, i) => regression(data, x[i]));
  return {
    coefs: results.map((r) => r.coefs),
    errors: results.map((r) => r.errors),
  }
}

const randomSampleFromList = (arr: Array<number>) => {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

const percentile = (arr: Array<number>, p: number) => {
    if (arr.length === 0) return 0;
    if (typeof p !== 'number') throw new TypeError('p must be a number');
    if (p <= 0) return arr[0];
    if (p >= 1) return arr[arr.length - 1];

    var index = (arr.length - 1) * p,
        lower = Math.floor(index),
        upper = lower + 1,
        weight = index % 1;

    if (upper >= arr.length) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
};

type BootstrapEstimate = [number, number];

//TODO: This is just percentile estimates, we need studentized because (I think) the
//estimates are skewed but there is no package and it is going to take a few
//hours to implement.
export function bootstrap(data: Array<number>, runs: number, sample_size: number): BootstrapEstimate {
  let avgs = [];
  for (let i=0; i < runs; i++) {
    let samples = [];
    for (let j=0; j < sample_size; j++) {
      samples.push(randomSampleFromList(data));
    }
    avgs.push(samples.reduce((acc, curr) => acc + curr, 0));
  }
  return [percentile(avgs.sort(), 0.05), percentile(avgs.sort(), 0.95)]
}

export function transpose(matrix: Array<Array<number>>) {
  return matrix[0].map((col, i) => matrix.map(row => row[i]));
}
