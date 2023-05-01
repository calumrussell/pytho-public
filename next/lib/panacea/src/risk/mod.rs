use alator::types::DateTime;
use serde::{Deserialize, Serialize};
use smartcore::{
    linalg::basic::{arrays::Array2, matrix::DenseMatrix},
    linear::linear_regression::{
        LinearRegression, LinearRegressionParameters, LinearRegressionSolverName,
    },
};

use crate::eod::{EodRawCommon, EodRow};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RegressionResult {
    pub coefs: Vec<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CoreResult {
    regression: RegressionResult,
    avgs: Vec<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RollingRegressionResult {
    coefs: Vec<Vec<f64>>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RollingResult {
    regressions: RollingRegressionResult,
    dates: Vec<i64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RiskResult {
    dep: i64,
    ind: Vec<i64>,
    min_date: i64,
    max_date: i64,
    core: CoreResult,
    rolling: RollingResult,
}

pub fn regression(x: &Vec<Vec<f64>>, y: &Vec<f64>) -> RegressionResult {
    let mtx = DenseMatrix::from_2d_vec(x);

    let lr = LinearRegression::fit(
        &mtx,
        y,
        LinearRegressionParameters::default().with_solver(LinearRegressionSolverName::QR),
    )
    .unwrap();

    let mut res = Vec::new();

    let coefs: Vec<f64> = lr
        .coefficients()
        .get_col(0)
        .iterator(0)
        .map(|v| v.clone())
        .collect();
    let intercept = f64::from(*lr.intercept());

    res.push(intercept);
    res.extend(coefs);

    RegressionResult { coefs: res }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct EodRawRiskInput {
    pub data: Vec<Vec<EodRow>>,
    pub ind: Vec<i64>,
    pub dep: i64,
}

pub fn risk_analysis(input: &EodRawRiskInput) -> RiskResult {
    let dates = EodRawCommon::dates_intersect(&input.data);
    let mut epoch_dates = EodRawCommon::convert_dates_to_epoch(&dates);
    epoch_dates.sort();

    let monthly_dates = EodRawCommon::filter_monthly(&epoch_dates);
    let mut filtered_main = Vec::new();
    for prices in &input.data {
        let mut filtered_prices = Vec::new();
        for row in prices {
            let epoch: i64 = *DateTime::from_date_string(&row.date, "[year]-[month]-[day]");
            if monthly_dates.contains(&epoch) {
                filtered_prices.push(row.adjusted_close);
            }
        }
        filtered_main.push(filtered_prices);
    }

    let mut filtered_rets = Vec::new();
    for prices in &filtered_main {
        let mut asset_rets = Vec::new();
        for i in 1..prices.len() - 1 {
            let ret = (prices.get(i).unwrap() / prices.get(i - 1).unwrap()) - 1.0;
            asset_rets.push(ret);
        }
        filtered_rets.push(asset_rets);
    }

    RiskResult {
        core: build_core(input, &filtered_rets, &monthly_dates),
        rolling: build_rolling(input, &filtered_rets, &monthly_dates),
        min_date: monthly_dates.first().unwrap().clone(),
        max_date: monthly_dates.last().unwrap().clone(),
        ind: input.ind.clone(),
        dep: input.dep.clone(),
    }
}

fn build_rolling(
    _input: &EodRawRiskInput,
    filtered_rets: &Vec<Vec<f64>>,
    monthly_dates: &Vec<i64>,
) -> RollingResult {
    let rolling_window = 6;

    let mut rolling_dates = Vec::new();
    rolling_dates.extend(monthly_dates[0..monthly_dates.len() - rolling_window].to_vec());

    let mut rolling_rets = Vec::new();
    for rets in filtered_rets {
        let mut asset_rolling = Vec::new();
        for i in 0..rets.len() - rolling_window {
            let window = rets[i..i + rolling_window].to_vec().clone();
            asset_rolling.push(window);
        }
        rolling_rets.push(asset_rolling);
    }

    let periods = rolling_rets.get(0).unwrap().len();
    let mut regressions = Vec::new();

    for i in 0..periods {
        let dependent = rolling_rets
            .get(0)
            .unwrap()
            .get(i)
            .unwrap()
            .iter()
            .map(|v| v * 100.0)
            .collect();
        let mut independent: Vec<Vec<f64>> = Vec::new();
        for j in 0..rolling_window {
            let mut row: Vec<f64> = Vec::new();
            for k in rolling_rets.iter().skip(1) {
                row.push(*k.get(i).unwrap().get(j).unwrap() * 100.0);
            }
            independent.push(row);
        }

        let res = regression(&independent, &dependent);
        regressions.push(res.coefs);
    }

    RollingResult {
        regressions: RollingRegressionResult { coefs: regressions },
        dates: rolling_dates,
    }
}

fn build_core(
    _input: &EodRawRiskInput,
    filtered_rets: &Vec<Vec<f64>>,
    monthly_dates: &Vec<i64>,
) -> CoreResult {
    let mut avg_rets = Vec::new();
    for rets in filtered_rets {
        let ret_sum: f64 = rets.clone().iter().sum();
        avg_rets.push((ret_sum / rets.len() as f64) * 100.0);
    }

    let y: Vec<f64> = filtered_rets
        .first()
        .unwrap()
        .to_vec()
        .iter()
        .map(|v| v * 100.0)
        .collect();
    let mut x: Vec<Vec<f64>> = Vec::new();
    //Transpose independent variables
    //We deduct two because we lose the first date when calculating first period return
    for i in 0..monthly_dates.len() - 2 {
        let mut tmp = Vec::new();
        for j in filtered_rets.iter().skip(1) {
            tmp.push(j[i] * 100.0);
        }
        x.push(tmp);
    }

    let regression = regression(&x, &y);

    CoreResult {
        regression,
        avgs: avg_rets,
    }
}

#[cfg(test)]
mod tests {
    use serde::{Deserialize, Serialize};

    use crate::eod::EodRow;

    use super::{risk_analysis, EodRawRiskInput};

    #[derive(Deserialize, Serialize)]
    struct TestEodInput {
        data: Vec<EodRow>,
    }

    fn setup() -> EodRawRiskInput {
        let text = std::fs::read_to_string("./data/mcd.json").unwrap();
        let json = serde_json::from_str::<TestEodInput>(&text).unwrap();
        let text1 = std::fs::read_to_string("./data/amzn.json").unwrap();
        let json1 = serde_json::from_str::<TestEodInput>(&text1).unwrap();

        let to_vec = vec![json.data, json1.data];

        EodRawRiskInput {
            data: to_vec,
            dep: 100,
            ind: vec![101],
        }
    }

    #[test]
    pub fn test_risk() {
        let input = setup();
        let _res = risk_analysis(&input);
    }
}
