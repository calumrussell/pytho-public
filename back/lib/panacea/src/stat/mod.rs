use std::collections::HashMap;

use rand::distributions::Uniform;
use rand::thread_rng;
use rand_distr::Distribution;

//Wrapper is used to allow easier testing of inner function whilst maintaining an external default
//func for clients
pub fn build_sample_raw_daily(
    sim_length: i64,
    raw_data: HashMap<String, Vec<f64>>,
) -> Option<HashMap<String, Vec<f64>>> {
    build_sample_raw_inner(sim_length, raw_data, 365)
}

fn build_sample_raw_inner(
    sim_length: i64,
    raw_data: HashMap<String, Vec<f64>>,
    minimum_sample_length: i64,
) -> Option<HashMap<String, Vec<f64>>> {
    let mut resampled_data: HashMap<String, Vec<f64>> = HashMap::new();
    let sample_count = sim_length / minimum_sample_length;

    for (symbol, prices) in raw_data.iter() {
        //If there is insufficient data to create an accurate resample then we return with None
        let data_length = prices.len() as i64;
        if data_length <= minimum_sample_length {
            return None;
        }
        //Sample sim_length_yrs number of values from uniform distribution from 0 to length of data
        //- minimum_sample_length - 1
        //
        //Start from one so we have the extra space at the start to create a return for the full
        //price series
        let sim_length_dist = Uniform::new(1, data_length - minimum_sample_length + 1);
        let mut rng = thread_rng();
        let mut sample_start_positions: Vec<i64> = Vec::new();
        for _date in 0..sample_count {
            let sample_pos = sim_length_dist.sample(&mut rng);
            sample_start_positions.push(sample_pos as i64);
        }
        //Take price sample from data, then convert into a return
        //This is just a flat vec because we are removing ordering from the price series
        let mut resampled_rets: Vec<f64> = Vec::new();
        for start_pos in &sample_start_positions {
            let end_pos = *start_pos + minimum_sample_length;
            for pos in *start_pos..end_pos {
                let curr_val = prices[pos as usize];
                let prev_val = prices[(pos - 1) as usize];
                let ret = (curr_val / prev_val) - 1.0;
                resampled_rets.push(ret);
            }
        }
        //Move back into prices
        let mut resampled_prices: Vec<f64> = Vec::new();
        let mut start_price = 100.0;
        for ret in &resampled_rets {
            start_price *= 1.0 + *ret;
            resampled_prices.push(start_price);
        }
        resampled_data.insert(symbol.clone(), resampled_prices);
    }
    Some(resampled_data)
}

#[cfg(test)]
mod tests {
    use alator::clock::ClockBuilder;
    use rand::distributions::Uniform;
    use rand::thread_rng;
    use rand_distr::Distribution;
    use std::collections::HashMap;

    use super::{build_sample_raw_daily, build_sample_raw_inner};

    #[test]
    fn test_sample_generator_with_insufficient_data() {
        let price_dist = Uniform::new(98.0, 102.0);
        let mut rng = thread_rng();
        let clock = ClockBuilder::from_length_seconds(&(10.into()), 7).every_second();

        let mut raw_data: HashMap<String, Vec<f64>> = HashMap::new();
        let mut inner_prices: Vec<f64> = Vec::new();
        //This data length is chosen because it cannot be used to construct a sample
        for _i in clock.borrow().peek() {
            let price = price_dist.sample(&mut rng);
            inner_prices.push(price);
        }
        raw_data.insert("ABC".to_string(), inner_prices);

        let res = build_sample_raw_daily(7, raw_data);
        assert!(res.is_none() == true);
    }

    #[test]
    fn test_that_raw_sample_generator_works() {
        let price_dist = Uniform::new(98.0, 102.0);
        let mut rng = thread_rng();
        let clock = ClockBuilder::from_length_seconds(&(10.into()), 30).every_second();

        let mut raw_data: HashMap<String, Vec<f64>> = HashMap::new();
        let mut inner_prices: Vec<f64> = Vec::new();
        //This data length is chosen specifically because it should be the minimum amount possible
        //to build a sample
        for _i in clock.borrow().peek() {
            let price = price_dist.sample(&mut rng);
            inner_prices.push(price);
        }
        raw_data.insert("ABC".to_string(), inner_prices);
        let res = build_sample_raw_inner(30, raw_data, 5);
        let sample_len = res.as_ref().unwrap().get(&"ABC".to_string()).unwrap().len();
        //Length of the new series should be minimum sample length param * sim length param
        //6 * 5 = 30
        assert!(sample_len == 30);
    }

    #[test]
    fn test_that_raw_sample_generator_returns_different_values_on_each_run() {
        let price_dist = Uniform::new(98.0, 102.0);
        let mut rng = thread_rng();
        let clock = ClockBuilder::from_length_seconds(&(10.into()), 100).every_second();

        let mut raw_data: HashMap<String, Vec<f64>> = HashMap::new();
        let mut inner_prices: Vec<f64> = Vec::new();
        for _date in clock.borrow().peek() {
            let price = price_dist.sample(&mut rng);
            inner_prices.push(price);
        }
        raw_data.insert("ABC".to_string(), inner_prices);
        let res = build_sample_raw_inner(100, raw_data.clone(), 5);
        let res1 = build_sample_raw_inner(100, raw_data, 5);

        let cum_return = |prices: &Vec<f64>| -> f64 {
            let mut log_rets: Vec<f64> = Vec::new();
            for p in 1..(prices.len() as i64) - 1 {
                let curr = prices[p as usize];
                let last = prices[(p as usize) - 1];
                let log_ret = (curr / last).ln();
                log_rets.push(log_ret);
            }
            let cum_log: f64 = log_rets.iter().sum();
            cum_log.exp() - 1.0
        };

        //This tests equality of ordering, the original impl was generating different prices that
        //had the same result every time. By testing for cumulative returns, we are testing for
        //equality of ordering of the result, not just whether the prices returned are different
        let sum: f64 = cum_return(res.unwrap().get(&"ABC".to_string()).unwrap());
        let sum1: f64 = cum_return(res1.unwrap().get(&"ABC".to_string()).unwrap());
        assert!(sum != sum1);
    }
}
