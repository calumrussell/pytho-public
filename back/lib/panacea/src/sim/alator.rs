use alator::broker::Quote;
use alator::clock::ClockBuilder;
use alator::exchange::DefaultExchangeBuilder;
use alator::input::HashMapInputBuilder;
use alator::sim::SimulatedBrokerBuilder;
use alator::simcontext::SimContextBuilder;
use alator::strategy::StaticWeightStrategyBuilder;
use alator::types::{BacktestOutput, DateTime, Frequency, PortfolioAllocation};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::iter::zip;
use std::rc::Rc;

use crate::eod::{EodRawCommon, EodRow};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct EodRawAlatorInput {
    pub assets: Vec<String>,
    pub weights: HashMap<String, f64>,
    pub data: Vec<Vec<EodRow>>,
}

impl EodRawAlatorInput {
    fn build_map(&self, epoch_intersection: &Vec<i64>) -> HashMap<i64, Vec<f64>> {
        let mut res: HashMap<i64, Vec<f64>> = HashMap::new();
        for prices in &self.data {
            for row in prices {
                let epoch: i64 = *DateTime::from_date_string(&row.date, "[year]-[month]-[day]");
                if epoch_intersection.contains(&epoch) {
                    if res.contains_key(&epoch) {
                        let mut curr: Vec<f64> = res.get_mut(&epoch).unwrap().to_vec();
                        curr.push(row.adjusted_close);
                    } else {
                        let curr = vec![row.adjusted_close];
                        res.insert(epoch, curr);
                    }
                } else {
                    continue;
                }
            }
        }
        res
    }
}

impl From<EodRawAlatorInput> for AlatorInput {
    fn from(value: EodRawAlatorInput) -> Self {
        let dates = EodRawCommon::dates_intersect(&value.data);
        let mut epoch_dates = EodRawCommon::convert_dates_to_epoch(&dates);
        epoch_dates.sort();
        let first_date = *epoch_dates.first().unwrap();
        let last_date = *epoch_dates.last().unwrap();
        let prices = value.build_map(&epoch_dates);

        AlatorInput {
            first_date,
            last_date,
            weights: value.weights,
            assets: value.assets,
            data: prices,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AlatorInput {
    pub assets: Vec<String>,
    pub weights: HashMap<String, f64>,
    pub data: HashMap<i64, Vec<f64>>,
    pub first_date: i64,
    pub last_date: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct AlatorResults {
    pub ret: f64,
    pub cagr: f64,
    pub vol: f64,
    pub mdd: f64,
    pub sharpe: f64,
    pub values: Vec<f64>,
    pub dates: Vec<i64>,
}

fn convert_result(res: BacktestOutput) -> AlatorResults {
    let rounded_values: Vec<f64> = res
        .values
        .iter()
        .map(|x: &f64| (x * 100.0).round() / 100.0)
        .collect();

    AlatorResults {
        ret: res.ret,
        cagr: res.cagr,
        vol: res.vol,
        mdd: res.mdd,
        sharpe: res.sharpe,
        values: rounded_values,
        dates: res.dates,
    }
}

pub fn alator_backtest(input: AlatorInput) -> AlatorResults {
    let clock = ClockBuilder::with_length_in_dates(input.first_date, input.last_date)
        .with_frequency(&Frequency::Daily)
        .build();

    let mut raw_data: HashMap<DateTime, Vec<Quote>> = HashMap::new();
    //The input data appears to be of the same type, but the source data may not include dates which span the whole
    //period, so we need to span the whole period and insert what we can
    for date in clock.borrow().peek() {
        if let Some(prices) = input.data.get(&(date.clone())) {
            let mut quotes: Vec<Quote> = Vec::new();
            for (asset, price) in zip(&input.assets, prices) {
                let q = Quote {
                    date: date.clone(),
                    bid: (*price).into(),
                    ask: (*price).into(),
                    symbol: asset.clone(),
                };
                quotes.push(q);
            }
            raw_data.insert(date, quotes);
        }
    }
    let source = HashMapInputBuilder::new()
        .with_clock(Rc::clone(&clock))
        .with_quotes(raw_data)
        .build();

    let mut weights = PortfolioAllocation::new();
    for symbol in input.weights.keys() {
        weights.insert(symbol.clone(), *input.weights.get(&symbol.clone()).unwrap());
    }

    let initial_cash = 100.0;

    let exchange = DefaultExchangeBuilder::new()
        .with_data_source(source.clone())
        .with_clock(Rc::clone(&clock))
        .build();

    let brkr = SimulatedBrokerBuilder::new()
        .with_data(source)
        .with_exchange(exchange)
        .build();

    let strat = StaticWeightStrategyBuilder::new()
        .with_brkr(brkr)
        .with_clock(Rc::clone(&clock))
        .with_weights(weights)
        .default();

    let mut sim = SimContextBuilder::new()
        .with_clock(Rc::clone(&clock))
        .with_strategy(strat)
        .init(&(initial_cash.into()));

    sim.run();
    convert_result(sim.perf(Frequency::Daily))
}

#[cfg(test)]
mod tests {

    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    use crate::eod::EodRow;

    use super::{alator_backtest, AlatorInput, EodRawAlatorInput};

    #[derive(Deserialize, Serialize)]
    struct TestEodInput {
        data: Vec<EodRow>,
    }

    fn setup() -> EodRawAlatorInput {
        let text = std::fs::read_to_string("./data/amzn.json").unwrap();
        let json = serde_json::from_str::<TestEodInput>(&text).unwrap();
        let to_vec = vec![json.data];
        let mut weights = HashMap::new();
        weights.insert("100".to_string(), 0.5);

        EodRawAlatorInput {
            data: to_vec,
            assets: vec!["100".to_string()],
            weights: HashMap::new(),
        }
    }

    #[test]
    pub fn test_alator_date_intersection() {
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

        let input = EodRawAlatorInput {
            data: vec![abc, bcd],
            assets: vec!["101".to_string(), "102".to_string()],
            weights: HashMap::new(),
        };

        let alator: AlatorInput = input.into();
        assert_eq!(alator.first_date, 1633165200);
        assert_eq!(alator.last_date, 1633251600);
        //Asserts that the length of the prices series are equal
        assert_eq!(
            alator.data.get(&1633165200).unwrap().len(),
            alator.data.get(&1633165200).unwrap().len()
        );
    }

    #[test]
    pub fn test_alator_load() {
        let alator = setup();
        //This is larger dataset, this tests that we load without errors
        let _res = alator_backtest(alator.into());
    }
}
