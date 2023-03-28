use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct StandardSimulationOutput {
    pub cash: Vec<f64>,
    pub gross_income: Vec<f64>,
    pub net_income: Vec<f64>,
    pub expense: Vec<f64>,
    pub tax_paid: Vec<f64>,
    //This is not standard but we are doing this here because I haven't decided how to fix
    pub sipp_contributions: Vec<f64>,
    pub ret: f64,
    pub cagr: f64,
    pub vol: f64,
    pub mdd: f64,
    pub sharpe: f64,
    pub values: Vec<f64>,
    pub returns: Vec<f64>,
    pub returns_dates: Vec<i64>,
    pub investment_cash_flows: Vec<f64>,
    pub first_date: i64,
    pub last_date: i64,
    pub dd_start_date: i64,
    pub dd_end_date: i64,
    pub best_return: f64,
    pub worst_return: f64,
    pub frequency: String,
}

pub trait ProducesStandardSimulationOutput {
    fn get_output(&self) -> StandardSimulationOutput;
}