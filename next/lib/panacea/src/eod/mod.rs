use alator::types::DateTime;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct EodRow {
    pub date: String,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub adjusted_close: f64,
    pub volume: f64,
}

pub struct EodRawCommon;

impl EodRawCommon {
    pub fn dates_intersect(close: &Vec<Vec<EodRow>>) -> Vec<String> {
        let mut sets = Vec::new();
        for prices in close {
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

    pub fn convert_dates_to_epoch(dates: &Vec<String>) -> Vec<i64> {
        let mut res = Vec::new();
        for date in dates {
            let epoch: i64 = *DateTime::from_date_string(&date, "[year]-[month]-[day]");
            res.push(epoch);
        }
        res
    }

    pub fn filter_monthly(dates: &Vec<i64>) -> Vec<i64> {
        let mut res = Vec::new();
        for date in dates {
            let day = DateTime::from(date.clone()).day();
            if day.eq(&(1 as u8)) {
                res.push(date.clone());
            }
        }
        res
    }
}
