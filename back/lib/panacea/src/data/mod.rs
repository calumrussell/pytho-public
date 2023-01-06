use alator::types::DateTime;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use crate::sim::{AntevortaMultipleInput, AntevortaPriceInput};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct EodRow {
    date: String,
    open: f64,
    high: f64,
    low: f64,
    close: f64,
    adjusted_close: f64,
    volume: f64,
}

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
    fn dates_intersect(&self) -> Vec<String> {
        let mut sets = Vec::new();
        for prices in &self.close {
            let mut dates = Vec::new();
            for row in prices {
                dates.push(row.date.clone());
            }
            sets.push(dates);
        }

        let mut intersect_result: Vec<String> = sets[0].clone();
        for temp_vec in sets {
            let unique_a: HashSet<String> = temp_vec.into_iter().collect();
            intersect_result = unique_a
                .intersection(&intersect_result.into_iter().collect())
                .cloned()
                .collect::<Vec<String>>();
        }
        intersect_result
    }

    fn build_map(&self, intersection: Vec<String>) -> AntevortaPriceInput {
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

    fn convert_dates_to_epoch(dates: &Vec<String>) -> Vec<i64> {
        let mut res = Vec::new();
        for date in dates {
            let epoch: i64 = *DateTime::from_date_string(&date, "[year]-[month]-[day]");
            res.push(epoch);
        }
        res
    }
}

impl From<EodRawAntevortaInput> for AntevortaMultipleInput {
    fn from(value: EodRawAntevortaInput) -> Self {
        let dates = value.dates_intersect();
        let mut epoch_dates = EodRawAntevortaInput::convert_dates_to_epoch(&dates);
        epoch_dates.sort();
        let close = value.build_map(dates);

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

#[derive(Deserialize, Serialize)]
struct TestEodInput {
    data: Vec<EodRow>,
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use crate::sim::{antevorta_multiple, AntevortaMultipleInput};

    use super::{EodRawAntevortaInput, EodRow, TestEodInput};

    fn setup() -> EodRawAntevortaInput {
        let text = std::fs::read_to_string("./src/data/data.json").unwrap();
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
    pub fn test_date_intersection() {
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
    pub fn test_load() {
        let val = setup();
        //This is larger dataset, this tests that we load without errors
        let antevorta: AntevortaMultipleInput = val.into();
        let _res = antevorta_multiple(antevorta).unwrap();
    }
}
