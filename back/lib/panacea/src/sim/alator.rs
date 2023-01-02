use alator::broker::Quote;
use alator::clock::ClockBuilder;
use alator::exchange::DefaultExchangeBuilder;
use alator::input::HashMapInputBuilder;
use alator::sim::SimulatedBrokerBuilder;
use alator::simcontext::SimContextBuilder;
use alator::strategy::StaticWeightStrategyBuilder;
use alator::types::{DateTime, PortfolioAllocation, Frequency, BacktestOutput};
use std::collections::HashMap;
use std::rc::Rc;
use std::iter::zip;
use serde::{Deserialize, Serialize};


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
    pub returns: Vec<f64>,
    pub dates: Vec<i64>,
}

fn convert_result(res: BacktestOutput) -> AlatorResults {
    AlatorResults {
        ret: res.ret,
        cagr: res.cagr,
        vol: res.vol,
        mdd: res.mdd,
        sharpe: res.sharpe,
        values: res.values,
        returns: res.returns,
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

    let initial_cash = 100_000.0;

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

    use std::collections::HashMap;
    use rand::thread_rng;
    use rand_distr::{Distribution, Normal};
    use alator::clock::ClockBuilder;

    use super::{alator_backtest, AlatorInput};

    #[test]
    fn run_backtest() {
        //Weights is {symbol: weight}
        //Data is {asset_id[i64]: {Open/Close[str]: {date[i64], price[f64]}}}
        let mut rng = thread_rng();
        let ret_dist = Normal::new(0.0, 0.02).unwrap();
        let first_date = 1;
        let last_date = 100 * 86400;
        //Because we are using daily timescales in alator, this needs to be daily too
        let clock = ClockBuilder::with_length_in_dates(first_date, last_date)
            .with_frequency(&alator::types::Frequency::Daily)
            .build();

        let assets = vec![0.to_string(), 1.to_string()];
        let mut price = 100.0;
        let mut price1 = 100.0;
        let mut data: HashMap<i64, Vec<f64>> = HashMap::new();
        for date in clock.borrow().peek() {
            price *= 1.0 + ret_dist.sample(&mut rng);
            price1 *= 1.0 + ret_dist.sample(&mut rng);
            data.insert(date.into(), vec![price, price1]);
        }
        let mut weights: HashMap<String, f64> = HashMap::new();
        weights.insert(String::from("0"), 0.5);
        weights.insert(String::from("1"), 0.5);

        let input = AlatorInput {
            assets,
            weights,
            data,
            first_date,
            last_date,
        };

        let res = alator_backtest(input);
        println!("{:?}", res);
    }
}
