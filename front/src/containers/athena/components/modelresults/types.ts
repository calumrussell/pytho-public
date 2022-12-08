interface CoreResult {
  regression: {
    coefs: Array<number>,
    errors: Array<number>,
  },
  avgs: Array<number>,
}

interface RollingResult {
  regressions: {
    coefs: Array<Array<number>>,
    errors: Array<Array<number>>,
  },
  dates: Array<number>,
}

export interface Security {
  id: number,
  name: string,
}

export interface Independents {
  [key: number]: Security,
}

export interface ModelResults {
  core: CoreResult,
  rolling: RollingResult,
}
