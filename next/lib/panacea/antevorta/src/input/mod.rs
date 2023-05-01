use std::collections::HashMap;
use std::rc::Rc;

use alator::{
    broker::{Dividend, Quote},
    clock::Clock,
    input::{DataSource, DividendsHashMap, QuotesHashMap},
    types::DateTime,
};
use rand::thread_rng;
use rand_distr::{Distribution, Normal};
use time::OffsetDateTime;

type SimDataRep = HashMap<DateTime, f64>;

//Data layout always has daily frequency but the series below typically occur at a higher
//frequency. In order to keep these at a daily frequency we downsample them and expect them to
//increment (and be called) on a daily frequency, even in flows which typically only activate per month.
//This is a convoluted way of doing this but it reduces the chances of causing an error by keeping
//all the sources of data at the same frequency.
//
//Trailing queries do not return `Option` because they cannot fail. Iteration over `Clock` through peek
//so if we query a date outside the simulation (for example, calling trailing_year on first day) then
//a nonsense value (zero) will be silently returned. This makes sense because we cannot generate returns
//in this period either so we assume the caller knows what it is doing.
pub trait SimDataSource: Clone + DataSource {
    fn get_current_inflation(&self) -> Option<f64>;
    fn get_trailing_year_inflation(&self) -> f64;
    fn get_trailing_month_inflation(&self) -> f64;
    fn get_current_interest_rate(&self) -> Option<f64>;
    fn get_current_house_price_return(&self) -> Option<f64>;
}

#[derive(Clone, Debug)]
pub struct HashMapSourceSimInner {
    clock: Clock,
    inflation: SimDataRep,
    rates: SimDataRep,
    house_price_rets: SimDataRep,
    quotes: QuotesHashMap,
    dividends: DividendsHashMap,
}

#[derive(Clone, Debug)]
pub struct HashMapSourceSim {
    inner: Rc<HashMapSourceSimInner>,
}

impl SimDataSource for HashMapSourceSim {
    fn get_current_house_price_return(&self) -> Option<f64> {
        let now = self.inner.clock.borrow().now();
        self.inner.house_price_rets.get(&now).copied()
    }

    fn get_trailing_month_inflation(&self) -> f64 {
        let now = self.inner.clock.borrow().now();
        let now_offset: OffsetDateTime = now.clone().into();

        let last_month = now_offset.month().previous();
        let last_month_offset = now_offset.replace_month(last_month).unwrap();
        let last_month_internal: DateTime = last_month_offset.into();

        let mut tmp = 1.0;
        for date in self.inner.clock.borrow().peek() {
            if date > last_month_internal && date < now {
                //peek returns values that definitely exist so we can unwrap safely
                let val = self.inner.inflation.get(&now).unwrap().clone();
                tmp *= 1.0 + val;
            }
        }
        (tmp / 1.0) - 1.0
    }

    fn get_trailing_year_inflation(&self) -> f64 {
        let now = self.inner.clock.borrow().now();
        let now_offset: OffsetDateTime = now.clone().into();
        let last_year = now_offset.replace_year(now_offset.year() - 1).unwrap();
        let last_year_internal: DateTime = last_year.into();

        let mut tmp = 1.0;
        for date in self.inner.clock.borrow().peek() {
            if date > last_year_internal && date < now {
                //peek returns values that definitely exist so we can unwrap safely
                let val = self.inner.inflation.get(&now).unwrap().clone();
                tmp *= 1.0 + val;
            }
        }
        (tmp / 1.0) - 1.0
    }

    fn get_current_inflation(&self) -> Option<f64> {
        let now = self.inner.clock.borrow().now();
        self.inner.inflation.get(&now).copied()
    }

    fn get_current_interest_rate(&self) -> Option<f64> {
        let now = self.inner.clock.borrow().now();
        self.inner.rates.get(&now).copied()
    }
}

impl DataSource for HashMapSourceSim {
    fn get_quote(&self, symbol: &str) -> Option<&Quote> {
        let curr_date = self.inner.clock.borrow().now();
        if let Some(quotes) = self.inner.quotes.get(&curr_date) {
            for quote in quotes {
                if quote.symbol.eq(symbol) {
                    return Some(quote);
                }
            }
        }
        None
    }

    fn get_quotes(&self) -> Option<&Vec<Quote>> {
        let curr_date = self.inner.clock.borrow().now();
        self.inner.quotes.get(&curr_date)
    }

    fn get_dividends(&self) -> Option<&Vec<Dividend>> {
        let curr_date = self.inner.clock.borrow().now();
        self.inner.dividends.get(&curr_date)
    }
}

impl HashMapSourceSim {
    pub fn new(
        clock: Clock,
        inflation: SimDataRep,
        rates: SimDataRep,
        house_price_rets: SimDataRep,
        quotes: QuotesHashMap,
        dividends: DividendsHashMap,
    ) -> Self {
        let tmp = HashMapSourceSimInner {
            clock,
            inflation,
            rates,
            house_price_rets,
            quotes,
            dividends,
        };
        Self {
            inner: Rc::new(tmp),
        }
    }
}

pub struct HashMapSourceSimBuilder {
    clock: Option<Clock>,
    inflation: SimDataRep,
    rates: SimDataRep,
    house_price_rets: SimDataRep,
    quotes: QuotesHashMap,
    dividends: DividendsHashMap,
}

impl HashMapSourceSimBuilder {
    pub fn with_clock(&mut self, clock: Clock) -> &mut Self {
        self.clock = Some(clock);
        self
    }

    pub fn with_rates(&mut self, rates: SimDataRep) -> &mut Self {
        self.rates = rates;
        self
    }

    pub fn with_inflation(&mut self, inflation: SimDataRep) -> &mut Self {
        self.inflation = inflation;
        self
    }

    pub fn with_house_prices(&mut self, house_prices: SimDataRep) -> &mut Self {
        self.house_price_rets = house_prices;
        self
    }

    pub fn with_quotes(&mut self, quotes: QuotesHashMap) -> &mut Self {
        self.quotes = quotes;
        self
    }

    pub fn with_dividends(&mut self, dividends: DividendsHashMap) -> &mut Self {
        self.dividends = dividends;
        self
    }

    pub fn build(&self) -> HashMapSourceSim {
        if self.clock.is_none() {
            panic!("HashMapSourceSimBuilder must set clock with with_clock");
        }

        HashMapSourceSim::new(
            self.clock.as_ref().unwrap().clone(),
            self.inflation.clone(),
            self.rates.clone(),
            self.house_price_rets.clone(),
            self.quotes.clone(),
            self.dividends.clone(),
        )
    }

    pub fn start() -> Self {
        Self {
            clock: None,
            inflation: HashMap::new(),
            rates: HashMap::new(),
            house_price_rets: HashMap::new(),
            quotes: HashMap::new(),
            dividends: HashMap::new(),
        }
    }
}

pub fn build_hashmapsource_with_quotes_with_inflation(
    clock: Clock,
    quotes: QuotesHashMap,
    annual_inflation_mu: f64,
    annual_inflation_var: f64,
) -> HashMapSourceSim {
    let inflation = daily_data_generator_parametric_normal(
        annual_inflation_mu,
        annual_inflation_var,
        Rc::clone(&clock),
    );

    let rates = daily_data_generator_static(0.0, Rc::clone(&clock));
    let house_price_rets = daily_data_generator_static(0.0, Rc::clone(&clock));

    HashMapSourceSimBuilder::start()
        .with_clock(Rc::clone(&clock))
        .with_rates(rates)
        .with_inflation(inflation)
        .with_house_prices(house_price_rets)
        .with_quotes(quotes)
        .build()
}

pub fn daily_data_generator_static(mu_annual: f64, clock: Clock) -> SimDataRep {
    //Inflation data is received at an annual frequency, and then is reduced down to a compounded
    //daily equivalent. This calculates inflation over all days including weekends. This will very
    //slightly understate inflation due to leap years but this approach is used to keep all data
    //sources on the same frequency.

    let mut res = HashMap::new();

    let mu_daily: f64;
    if mu_annual == 0.0 {
        mu_daily = 0.0
    } else {
        mu_daily = ((1.0 + mu_annual).powf(1.0 / 365.0)) - 1.0;
    }

    //Sets value on every day using daily-compounded growth
    for date in clock.borrow().peek() {
        res.insert(date, mu_daily);
    }
    res
}

pub fn daily_data_generator_parametric_normal(
    mu_annual: f64,
    var_annual: f64,
    clock: Clock,
) -> SimDataRep {
    //Inflation data is received at an annual frequency, and then is reduced down to a compounded
    //daily equivalent. This calculates inflation over all days including weekends. This will very
    //slightly understate inflation due to leap years but this approach is used to keep all data
    //sources on the same frequency.
    let mut res = HashMap::new();

    let mu_daily: f64;
    if mu_annual == 0.0 {
        mu_daily = 0.0
    } else {
        mu_daily = ((1.0 + mu_annual).powf(1.0 / 365.0)) - 1.0;
    }

    if var_annual == 0.0 {
        return daily_data_generator_static(mu_annual, clock);
    }

    let var_daily = var_annual / 365.0_f64.sqrt();

    let mut rng = thread_rng();
    let dist = Normal::new(mu_daily, var_daily).unwrap();

    //Sets value on every day using daily-compounded growth
    for date in clock.borrow().peek() {
        let val = dist.sample(&mut rng);
        res.insert(date, val);
    }
    res
}

pub fn build_hashmapsource_random(clock: Clock) -> HashMapSourceSim {
    let mut rng = thread_rng();
    let dist = Normal::new(0.0, 0.015).unwrap();

    let inflation = daily_data_generator_static(0.0, Rc::clone(&clock));
    let rates = daily_data_generator_static(0.0, Rc::clone(&clock));
    let house_price_rets = daily_data_generator_static(0.0, Rc::clone(&clock));

    let mut fake_data: QuotesHashMap = HashMap::new();
    let mut price_abc = 100.0;
    let mut price_bcd = 100.0;
    for date in clock.borrow().peek() {
        let q_abc = Quote::new(price_abc, price_abc, date.clone(), "ABC");
        let q_bcd = Quote::new(price_bcd, price_bcd, date.clone(), "BCD");
        fake_data.insert(date, vec![q_abc, q_bcd]);

        let pct_return_abc = dist.sample(&mut rng);
        let pct_return_bcd = dist.sample(&mut rng);

        price_abc *= 1.0 + pct_return_abc;
        price_bcd *= 1.0 + pct_return_bcd;
    }

    HashMapSourceSimBuilder::start()
        .with_clock(Rc::clone(&clock))
        .with_rates(rates)
        .with_inflation(inflation)
        .with_house_prices(house_price_rets)
        .with_quotes(fake_data)
        .build()
}
