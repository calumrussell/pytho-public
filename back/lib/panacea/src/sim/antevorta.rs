use crate::eod::{EodRawCommon, EodRow};
use crate::stat::build_sample_raw_daily;
use alator::broker::Quote;
use alator::clock::ClockBuilder;
use alator::exchange::DefaultExchangeBuilder;
use alator::sim::SimulatedBrokerBuilder;
use alator::types::{DateTime, PortfolioAllocation};
use antevorta::country::uk::{Config, UKSimulationPerformanceTracker};
use antevorta::input::build_hashmapsource_with_quotes_with_inflation;
use antevorta::schedule::Schedule;
use antevorta::strat::StaticInvestmentStrategy;
use serde::{Deserialize, Serialize};
use smartcore::linalg::basic::matrix::DenseMatrix;
use std::collections::HashMap;
use std::error::Error;
use std::fmt;
use std::rc::Rc;
use smartcore::linalg::basic::arrays::{ArrayView1, Array};
use smartcore::linalg::basic::arrays::Array2;

pub fn build_price_input_from_raw_close_prices(
    close: &Vec<Vec<EodRow>>,
    assets: &Vec<String>,
    date_intersection: &Vec<String>,
) -> AntevortaPriceInput {
    let mut res = AntevortaPriceInput::new();
    for (ticker, prices) in assets.iter().zip(close) {
        for row in prices {
            if date_intersection.contains(&row.date) {
                let ticker_str = ticker.to_string();
                if res.contains_key(&ticker_str) {
                    let curr = res.get_mut(&ticker_str).unwrap();
                    curr.push(row.adjusted_close);
                } else {
                    let prices = vec![row.adjusted_close];
                    res.insert(ticker_str, prices);
                }
            }
        }
    }
    res
}

pub fn build_dates_from_raw_close_prices(close: &Vec<Vec<EodRow>>) -> (Vec<String>, Vec<i64>) {
    let dates = EodRawCommon::dates_intersect(close);
    let mut epoch_dates = EodRawCommon::convert_dates_to_epoch(&dates);
    epoch_dates.sort();
    (dates, epoch_dates)
}

#[derive(Clone, Copy, Debug)]
pub struct AntevortaInsufficientDataError;

impl fmt::Display for AntevortaInsufficientDataError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Insufficient Data Error")
    }
}

impl Error for AntevortaInsufficientDataError {}

pub type AntevortaPriceInput = HashMap<String, Vec<f64>>;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct EodRawAntevortaInput {
    pub assets: Vec<String>,
    pub close: Vec<Vec<EodRow>>,
    pub weights: HashMap<String, f64>,
    pub sim_length: i64,
    pub runs: i64,
    //JSON, have to convert far down
    pub config: String,
    pub inflation_mu: f64,
    pub inflation_var: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AntevortaResults {
    pub total_end_value: Vec<f64>,
    pub total_value_avg: Vec<f64>,
    pub tax_paid_avg: Vec<f64>,
    pub gross_income_avg: Vec<f64>,
    pub net_income_avg: Vec<f64>,
    pub contribution_avg: Vec<f64>,
    pub expense_avg: Vec<f64>,
    pub sipp_return_dist: Vec<Vec<f64>>,
    pub isa_return_dist: Vec<Vec<f64>>,
    pub gia_return_dist: Vec<Vec<f64>>,
    pub investment_dates: Vec<i64>,
}

fn parse_results(
    trackers: Vec<UKSimulationPerformanceTracker>,
    sim_length_in_years: u8,
) -> AntevortaResults {
    let mut total_end_value = Vec::new();
    let mut total_value_avg = Vec::new();
    let mut tax_paid_avg = Vec::new();
    let mut gross_income_avg = Vec::new();
    let mut net_income_avg = Vec::new();
    let mut contribution_avg = Vec::new();
    let mut expense_avg = Vec::new();

    let investment_dates = trackers.first().unwrap().get_investment_dates();

    for tracker in &trackers {
        total_end_value.push(*tracker.get_final_value());
    }

    for year in 0..sim_length_in_years {
        let mut total_value = Vec::new();
        let mut tax_paid = Vec::new();
        let mut gross_income = Vec::new();
        let mut net_income = Vec::new();
        let mut contribution = Vec::new();
        let mut expense = Vec::new();

        for tracker in &trackers {
            let tracker_year = tracker.get_year(year as usize);

            let value_sum = *tracker_year.isa_snapshot.portfolio_value
                + *tracker_year.gia_snapshot.portfolio_value
                + *tracker_year.sipp_snapshot.portfolio_value
                + *tracker_year.cash;

            total_value.push(value_sum);
            tax_paid.push(*tracker_year.tax_paid);
            gross_income.push(*tracker_year.gross_income);
            net_income.push(*tracker_year.net_income);
            contribution.push(*tracker_year.sipp_contributions);
            expense.push(*tracker_year.expense);
        }
        total_value_avg.push(total_value.sum() / total_value.len() as f64);
        tax_paid_avg.push(tax_paid.sum() / tax_paid.len() as f64);
        gross_income_avg.push(gross_income.sum() / gross_income.len() as f64);
        net_income_avg.push(net_income.sum() / net_income.len() as f64);
        contribution_avg.push(contribution.sum() / contribution.len() as f64);
        expense_avg.push(expense.sum() / expense.len() as f64);
    }

    let mut sipp_returns = Vec::new();
    let mut isa_returns = Vec::new();
    let mut gia_returns = Vec::new();
    for tracker in &trackers {
        let perf = tracker.get_perf();
        sipp_returns.push(perf.sipp.returns);
        isa_returns.push(perf.isa.returns);
        gia_returns.push(perf.gia.returns);
    }

    let mut sipp_return_dist = Vec::new();
    let sipp_returns_trans = DenseMatrix::from_2d_vec(&sipp_returns).transpose();
    let mut isa_return_dist = Vec::new();
    let isa_returns_trans = DenseMatrix::from_2d_vec(&isa_returns).transpose();
    let mut gia_return_dist = Vec::new();
    let gia_returns_trans = DenseMatrix::from_2d_vec(&gia_returns).transpose();
    let rows = sipp_returns_trans.shape().0;
    for i in 0..rows {
        let sipp_year = sipp_returns_trans.get_row(i as usize);
        sipp_return_dist.push(vec![sipp_year.mean_by(), sipp_year.min(), sipp_year.max()]);

        let isa_year = isa_returns_trans.get_row(i as usize);
        isa_return_dist.push(vec![isa_year.mean_by(), isa_year.min(), isa_year.max()]);

        let gia_year = gia_returns_trans.get_row(i as usize);
        gia_return_dist.push(vec![gia_year.mean_by(), gia_year.min(), gia_year.max()]);
    }

    AntevortaResults {
        total_end_value,
        total_value_avg,
        tax_paid_avg,
        gross_income_avg,
        net_income_avg,
        contribution_avg,
        expense_avg,
        sipp_return_dist,
        isa_return_dist,
        gia_return_dist,
        investment_dates,
    }
}

pub fn antevorta_multiple(input: EodRawAntevortaInput) -> Result<AntevortaResults, Box<dyn Error>> {
    //Intersection of overlapping dates
    let (string_dates, epoch_dates) = build_dates_from_raw_close_prices(&input.close);
    let close = build_price_input_from_raw_close_prices(&input.close, &input.assets, &string_dates);

    let mut results = Vec::new();

    for i in 0..input.runs {
        let start_date = epoch_dates.first().unwrap().clone();
        let sim_length_in_days = (input.sim_length * 365) as i64;

        let clock = ClockBuilder::with_length_in_days(start_date, sim_length_in_days - 1)
            .with_frequency(&alator::types::Frequency::Daily)
            .build();

        let mut raw_data: HashMap<DateTime, Vec<Quote>> = HashMap::new();
        if let Some(resampled_close) = build_sample_raw_daily(sim_length_in_days, close.clone()) {
            //The simulator builds its own dates to use an input
            //This will iterate over the prices within the resampled_close, therefore the vectors have to
            //be equal to sim_length_days
            let mut pos = 0;
            for date in clock.borrow().peek() {
                let mut quotes: Vec<Quote> = Vec::new();
                for asset in &input.assets {
                    let asset_closes = resampled_close.get(asset).unwrap();
                    let pos_close = asset_closes[pos as usize];
                    let q = Quote::new(pos_close, pos_close, date.clone(), asset);
                    quotes.push(q);
                }
                raw_data.insert(date.into(), quotes);
                pos += 1;
            }
        } else {
            return Err(Box::new(AntevortaInsufficientDataError));
        }

        let src = build_hashmapsource_with_quotes_with_inflation(
            Rc::clone(&clock),
            raw_data,
            input.inflation_mu,
            input.inflation_var,
        );

        let mut weights = PortfolioAllocation::new();
        for symbol in input.weights.keys() {
            weights.insert(symbol.clone(), *input.weights.get(&symbol.clone()).unwrap());
        }

        let exchange = DefaultExchangeBuilder::new()
            .with_clock(Rc::clone(&clock))
            .with_data_source(src.clone())
            .build();

        let brkr = SimulatedBrokerBuilder::new()
            .with_exchange(exchange)
            .with_data(src.clone())
            .build();

        let strat =
            StaticInvestmentStrategy::new(brkr, Schedule::EveryFriday, weights, Rc::clone(&clock));
        let config = Config::parse(&input.config.clone()).unwrap();

        let mut sim = config.create(Rc::clone(&clock), strat, src);

        while clock.borrow().has_next() {
            sim.update();
            clock.borrow_mut().tick();
        }
        results.push(sim.get_tracker());
    }
    Ok(parse_results(results, input.sim_length as u8))
}

#[cfg(test)]
mod tests {

    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    use crate::{
        eod::EodRow,
        sim::antevorta::{
            build_dates_from_raw_close_prices, build_price_input_from_raw_close_prices,
        },
    };

    use super::{antevorta_multiple, EodRawAntevortaInput};

    #[derive(Deserialize, Serialize)]
    struct TestEodInput {
        data: Vec<EodRow>,
    }

    fn setup() -> EodRawAntevortaInput {
        let text = std::fs::read_to_string("./data/mcd.json").unwrap();
        let json = serde_json::from_str::<TestEodInput>(&text).unwrap();
        let to_vec = vec![json.data];
        let config = r#"
            {
                "flows": [
                    {
                        "person":0,
                        "schedule": {
                            "schedule_type":"EndOfMonth"
                        },
                        "value":4000,
                        "flow_type":"Employment"
                    }
                ],
                "stacks": [
                    {
                        "stack_type":"Gia",
                        "value":0
                    },
                    {
                        "stack_type":"Isa",
                        "value":0
                    },
                    {
                        "stack_type":"Sipp",
                        "value":0
                    }
                ],
                "nic":"A",
                "contribution_pct":0.05,
                "emergency_cash_min":1000,
                "starting_cash":5000,
                "lifetime_pension_contributions":0
            }
        "#;

        let mut weights = HashMap::new();
        weights.insert("100".to_string(), 0.5);

        EodRawAntevortaInput {
            close: to_vec,
            assets: vec!["100".to_string()],
            config: config.to_string(),
            runs: 2,
            sim_length: 2,
            weights,
            inflation_mu: 0.02,
            inflation_var: 0.001,
        }
    }

    #[test]
    pub fn test_antevorta_date_intersection() {
        let abc = vec![
            EodRow {
                date: String::from("2021-10-01"),
                open: 10.0,
                high: 10.0,
                low: 10.0,
                close: 10.0,
                adjusted_close: 10.0,
                volume: 10.0,
            },
            EodRow {
                date: String::from("2021-10-02"),
                open: 10.0,
                high: 10.0,
                low: 10.0,
                close: 10.0,
                adjusted_close: 10.0,
                volume: 10.0,
            },
            EodRow {
                date: String::from("2021-10-03"),
                open: 10.0,
                high: 10.0,
                low: 10.0,
                close: 10.0,
                adjusted_close: 10.0,
                volume: 10.0,
            },
        ];
        let bcd = vec![
            EodRow {
                date: String::from("2021-10-02"),
                open: 10.0,
                high: 10.0,
                low: 10.0,
                close: 10.0,
                adjusted_close: 10.0,
                volume: 10.0,
            },
            EodRow {
                date: String::from("2021-10-03"),
                open: 10.0,
                high: 10.0,
                low: 10.0,
                close: 10.0,
                adjusted_close: 10.0,
                volume: 10.0,
            },
        ];

        let input = EodRawAntevortaInput {
            close: vec![abc, bcd],
            assets: vec!["101".to_string(), "102".to_string()],
            config: "".to_string(),
            runs: 0,
            sim_length: 0,
            weights: HashMap::new(),
            inflation_mu: 0.02,
            inflation_var: 0.01,
        };

        //This function is called at the start of simulation run to find date intersection
        let (dates_string, epoch_dates) = build_dates_from_raw_close_prices(&input.close);
        //This function is called at the start of simulation run to build internal prices input
        let close =
            build_price_input_from_raw_close_prices(&input.close, &input.assets, &dates_string);

        //Queries the length of the price series which should be the length of bcd
        assert_eq!(close.get("101").unwrap().len(), 2);
        //Asserts that the length of the prices series are equal
        assert_eq!(
            close.get("101").unwrap().len(),
            close.get("102").unwrap().len()
        );
        //Asserts date conversion
        assert_eq!(epoch_dates, vec![1633165200, 1633251600]);
    }

    #[test]
    pub fn test_antevorta_load() {
        let antevorta = setup();
        //This is larger dataset, this tests that we load without errors
        let res = antevorta_multiple(antevorta.into()).unwrap();
        dbg!(res);
        assert!(true == false);
    }
}
