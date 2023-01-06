use crate::stat::build_sample_raw_daily;
use alator::broker::Quote;
use alator::clock::ClockBuilder;
use alator::exchange::DefaultExchangeBuilder;
use alator::sim::SimulatedBrokerBuilder;
use alator::types::{DateTime, PortfolioAllocation};
use antevorta::country::uk::Config;
use antevorta::input::FakeHashMapSourceSimWithQuotes;
use antevorta::schedule::Schedule;
use antevorta::sim::SimRunner;
use antevorta::strat::StaticInvestmentStrategy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;
use std::fmt;
use std::rc::Rc;

#[derive(Debug)]
pub struct AntevortaInsufficientDataError;

impl fmt::Display for AntevortaInsufficientDataError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Insufficient Data Error")
    }
}

impl Error for AntevortaInsufficientDataError {}

pub type AntevortaPriceInput = HashMap<String, Vec<f64>>;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AntevortaMultipleInput {
    pub assets: Vec<String>,
    pub weights: HashMap<String, f64>,
    pub dates: Vec<i64>,
    pub close: AntevortaPriceInput,
    pub sim_length: i64,
    pub runs: i64,
    //We wait to convert to SimulationState until we are inside the creation loop
    pub config: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AntevortaResults {
    pub values: Vec<f64>,
}

pub fn antevorta_multiple(
    input: AntevortaMultipleInput,
) -> Result<AntevortaResults, Box<dyn Error>> {
    //Date inputs is misleading, we only use the start_date to resample from
    let start_date = input.dates.first().unwrap().clone();
    let sim_length = (input.sim_length * 365) as i64;
    let mut res: Vec<f64> = Vec::new();

    for _i in 0..input.runs {
        let clock = ClockBuilder::with_length_in_days(start_date, sim_length - 1)
            .with_frequency(&alator::types::Frequency::Daily)
            .build();

        let mut raw_data: HashMap<DateTime, Vec<Quote>> = HashMap::new();
        if let Some(resampled_close) = build_sample_raw_daily(sim_length, input.close.clone()) {
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

        let src = FakeHashMapSourceSimWithQuotes::get(Rc::clone(&clock), raw_data);

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

        let sim = config.create(Rc::clone(&clock), strat, src);
        let mut runner = SimRunner {
            clock: Rc::clone(&clock),
            state: sim,
        };
        let result = runner.run();
        res.push(result.0);
    }
    Ok(AntevortaResults { values: res })
}

#[cfg(test)]
mod tests {

    use rand::distributions::Uniform;
    use rand::thread_rng;
    use rand_distr::Distribution;
    use std::collections::HashMap;

    use super::{antevorta_multiple, AntevortaMultipleInput};

    fn setup() -> (
        HashMap<String, Vec<f64>>,
        Vec<i64>,
        Vec<String>,
        HashMap<String, f64>,
    ) {
        let price_dist = Uniform::new(80.0, 120.0);
        let mut rng = thread_rng();

        let assets = vec![0.to_string(), 1.to_string()];
        let dates: Vec<i64> = (0..399).collect();
        let mut close: HashMap<String, Vec<f64>> = HashMap::new();
        for asset in &assets {
            let mut close_data: Vec<f64> = Vec::new();
            for _date in &dates {
                close_data.push(price_dist.sample(&mut rng));
            }
            close.insert(asset.clone(), close_data);
        }
        let mut weights: HashMap<String, f64> = HashMap::new();
        weights.insert(String::from("0"), 0.5);
        weights.insert(String::from("1"), 0.5);

        (close, dates, assets, weights)
    }

    #[test]
    fn run_income_simulation_mult() {
        //weights is {symbol: weight}
        //data is {asset_id[i64]: {open/close[str]: {date[i64], price[f64]}}}
        let res = setup();
        let close = res.0;
        let dates = res.1;
        let assets = res.2;
        let weights = res.3;
        let data = r#"{
            "starting_cash": 100000.0,
            "nic": "A",
            "contribution_pct": 0.1,
            "emergency_cash_min": 4000.0,
            "lifetime_pension_contributions": 0.0,
            "flows": [
                {
                    "flow_type": "Employment",
                    "value": 4000.0,
                    "schedule": {
                        "schedule_type": "EveryDay"
                    }
                }
            ],
            "stacks": [
                {
                    "stack_type": "Gia",
                    "value": 1000.0
                },
                {
                    "stack_type": "Sipp",
                    "value": 1000.0
                },
                {
                    "stack_type": "Isa",
                    "value": 1000.0
                }
            ]
        }"#;

        let input = AntevortaMultipleInput {
            dates,
            assets,
            close,
            weights,
            sim_length: 2,
            runs: 2,
            config: String::from(data),
        };
        let _res = antevorta_multiple(input).unwrap();
    }
}
