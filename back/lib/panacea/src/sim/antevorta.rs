use crate::eod::{EodRawCommon, EodRow};
use crate::stat::build_sample_raw_daily;
use alator::broker::Quote;
use alator::clock::ClockBuilder;
use alator::exchange::DefaultExchangeBuilder;
use alator::sim::SimulatedBrokerBuilder;
use alator::types::{DateTime, PortfolioAllocation};
use antevorta::country::uk::Config;
use antevorta::input::FakeHashMapSourceSimWithQuotes;
use antevorta::report::UKAnnualReport;
use antevorta::schedule::Schedule;
use antevorta::strat::StaticInvestmentStrategy;
use serde::{Deserialize, Serialize};
use smartcore::linalg::basic::arrays::ArrayView1;
use std::collections::HashMap;
use std::error::Error;
use std::fmt;
use std::rc::Rc;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct EodRawAntevortaInput {
    pub assets: Vec<String>,
    pub close: Vec<Vec<EodRow>>,
    pub weights: HashMap<String, f64>,
    pub sim_length: i64,
    pub runs: i64,
    pub config: String,
}

impl EodRawAntevortaInput {
    fn build_map(&self, intersection: &Vec<String>) -> AntevortaPriceInput {
        let mut res = AntevortaPriceInput::new();
        for (ticker, prices) in self.assets.iter().zip(&self.close) {
            for row in prices {
                if intersection.contains(&row.date) {
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
}

impl From<EodRawAntevortaInput> for AntevortaMultipleInput {
    fn from(value: EodRawAntevortaInput) -> Self {
        let dates = EodRawCommon::dates_intersect(&value.close);
        let mut epoch_dates = EodRawCommon::convert_dates_to_epoch(&dates);
        epoch_dates.sort();
        let close = value.build_map(&dates);

        Self {
            weights: value.weights,
            close,
            dates: epoch_dates,
            assets: value.assets,
            sim_length: value.sim_length,
            runs: value.runs,
            config: value.config,
        }
    }
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
    pub total_end_value: Vec<f64>,
    pub total_value_avg: Vec<f64>,
    pub tax_paid_avg: Vec<f64>,
    pub gross_income_avg: Vec<f64>,
    pub net_income_avg: Vec<f64>,
}

pub fn antevorta_multiple(
    input: AntevortaMultipleInput,
) -> Result<AntevortaResults, Box<dyn Error>> {
    let mut total_end_value = Vec::new();

    let mut annual_perfs: Vec<Vec<UKAnnualReport>> = Vec::with_capacity(input.runs as usize);
    for _i in 0..input.runs {
        annual_perfs.push(vec![]);
    }

    for i in 0..input.runs {
        let start_date = input.dates.first().unwrap().clone();
        let sim_length = (input.sim_length * 365) as i64;

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

        let mut sim = config.create(Rc::clone(&clock), strat, src);

        while clock.borrow().has_next() {
            clock.borrow_mut().tick();
            sim.update();
            if let Some(annual_perf) = sim.get_annual_report() {
                let curr = annual_perfs.get_mut(i as usize).unwrap();
                curr.push(annual_perf);
            }
        }
        total_end_value.push(*sim.get_state().total_value())
    }

    let mut total_value_avg = Vec::new();
    let mut tax_paid_avg = Vec::new();
    let mut gross_income_avg = Vec::new();
    let mut net_income_avg = Vec::new();
    for i in 0..input.sim_length {
        let mut total_value = Vec::new();
        let mut tax_paid = Vec::new();
        let mut gross_income = Vec::new();
        let mut net_income = Vec::new();

        for j in 0..input.runs {
            let tmp_perf = annual_perfs
                .get(j as usize)
                .unwrap()
                .get(i as usize)
                .unwrap();

            let value_sum = *tmp_perf.isa + *tmp_perf.gia + *tmp_perf.sipp + *tmp_perf.cash;

            total_value.push(value_sum);
            tax_paid.push(*(tmp_perf.tax_paid));
            gross_income.push(*(tmp_perf.gross_income));
            net_income.push(*(tmp_perf.net_income));
        }
        total_value_avg.push(total_value.sum() / total_value.len() as f64);
        tax_paid_avg.push(tax_paid.sum() / tax_paid.len() as f64);
        gross_income_avg.push(gross_income.sum() / gross_income.len() as f64);
        net_income_avg.push(net_income.sum() / net_income.len() as f64);
    }

    Ok(AntevortaResults {
        total_end_value,
        gross_income_avg,
        net_income_avg,
        tax_paid_avg,
        total_value_avg,
    })
}

#[cfg(test)]
mod tests {

    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    use crate::eod::EodRow;

    use super::{antevorta_multiple, AntevortaMultipleInput, EodRawAntevortaInput};

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
        };

        let antevorta: AntevortaMultipleInput = input.into();
        //Queries the length of the price series which should be the length of bcd
        assert_eq!(antevorta.close.get("101").unwrap().len(), 2);
        //Asserts that the length of the prices series are equal
        assert_eq!(
            antevorta.close.get("101").unwrap().len(),
            antevorta.close.get("102").unwrap().len()
        );
        //Asserts date conversion
        assert_eq!(antevorta.dates, vec![1633165200, 1633251600]);
    }

    #[test]
    pub fn test_antevorta_load() {
        let antevorta = setup();
        //This is larger dataset, this tests that we load without errors
        let _res = antevorta_multiple(antevorta.into()).unwrap();
    }
}
