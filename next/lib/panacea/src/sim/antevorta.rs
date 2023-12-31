use crate::eod::{EodRawCommon, EodRow};
use crate::stat::build_sample_raw_daily;
use alator::broker::Quote;
use alator::clock::ClockBuilder;
use alator::exchange::DefaultExchangeBuilder;
use alator::sim::SimulatedBrokerBuilder;
use alator::types::{DateTime, PortfolioAllocation};
use antevorta::country::uk::Config;
use antevorta::input::build_hashmapsource_with_quotes_with_inflation;
use antevorta::output::UKSimulationOutput;
use antevorta::schedule::Schedule;
use antevorta::strat::StaticInvestmentStrategy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;
use std::fmt;
use std::rc::Rc;

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
    pub start_date: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AntevortaResults {
    pub results: Vec<UKSimulationOutput>,
    pub sample_start: i64,
    pub sample_end: i64,
}

pub fn antevorta_multiple(input: EodRawAntevortaInput) -> Result<AntevortaResults, Box<dyn Error>> {
    //Intersection of overlapping dates
    let (string_dates, epoch_dates) = build_dates_from_raw_close_prices(&input.close);
    let close = build_price_input_from_raw_close_prices(&input.close, &input.assets, &string_dates);

    let mut results = Vec::new();
    for _i in 0..input.runs {
        let sim_length_in_days = (input.sim_length * 365) as i64;

        //Start date of the simulation is provided by the user, date shouldn't be overlapping with
        //sample dates in data
        let clock = ClockBuilder::with_length_in_days(input.start_date, sim_length_in_days - 1)
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
        results.push(UKSimulationOutput::get_output(&sim));
    }
    Ok(
        AntevortaResults { 
            results,
            sample_start: epoch_dates.first().unwrap().clone(),
            sample_end: epoch_dates.last().unwrap().clone(),
        }
    )
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
                "lifetime_pension_contributions":0,
                "start_date": 1680283254
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
            start_date: 1680283254,
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
            start_date: 1680283254,
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
        let _res = antevorta_multiple(antevorta.into()).unwrap();
    }
}
