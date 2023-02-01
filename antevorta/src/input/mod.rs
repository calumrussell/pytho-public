use std::cell::RefCell;
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

type SimDataRep = HashMap<DateTime, f64>;

pub trait SimDataSource: Clone + DataSource {
    fn get_current_inflation(&self) -> Option<f64>;
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
    inner: Rc<RefCell<HashMapSourceSimInner>>,
}

impl SimDataSource for HashMapSourceSim {
    fn get_current_house_price_return(&self) -> Option<f64> {
        let now = self.inner.borrow().clock.borrow().now();
        self.inner.borrow().house_price_rets.get(&now).copied()
    }

    fn get_current_inflation(&self) -> Option<f64> {
        let now = self.inner.borrow().clock.borrow().now();
        self.inner.borrow().inflation.get(&now).copied()
    }

    fn get_current_interest_rate(&self) -> Option<f64> {
        let now = self.inner.borrow().clock.borrow().now();
        self.inner.borrow().rates.get(&now).copied()
    }
}

impl DataSource for HashMapSourceSim {
    fn get_quote(&self, symbol: &str) -> Option<Quote> {
        let curr_date = self.inner.borrow().clock.borrow().now();
        if let Some(quotes) = self.inner.borrow().quotes.get(&curr_date) {
            for quote in quotes {
                if quote.symbol.eq(symbol) {
                    return Some(quote.clone());
                }
            }
        }
        None
    }

    fn get_quotes(&self) -> Option<Vec<Quote>> {
        let curr_date = self.inner.borrow().clock.borrow().now();
        self.inner.borrow().quotes.get(&curr_date).cloned()
    }

    fn get_dividends(&self) -> Option<Vec<Dividend>> {
        let curr_date = self.inner.borrow().clock.borrow().now();
        self.inner.borrow().dividends.get(&curr_date).cloned()
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
            inner: Rc::new(RefCell::new(tmp)),
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
    let inflation = monthly_data_generator_parametric_normal(
        annual_inflation_mu,
        annual_inflation_var,
        Rc::clone(&clock),
    );

    let rates = monthly_data_generator_static(0.0, Rc::clone(&clock));
    let house_price_rets = monthly_data_generator_static(0.0, Rc::clone(&clock));

    HashMapSourceSimBuilder::start()
        .with_clock(Rc::clone(&clock))
        .with_rates(rates)
        .with_inflation(inflation)
        .with_house_prices(house_price_rets)
        .with_quotes(quotes)
        .build()
}

pub fn monthly_data_generator_static(mu_annual: f64, clock: Clock) -> SimDataRep {
    let mut res = HashMap::new();

    let mu_monthly: f64;
    if mu_annual == 0.0 {
        mu_monthly = 0.0
    } else {
        mu_monthly = mu_annual / 12.0;
    }

    //Because the source can only be called monthly, we can set the same value for all entries.
    //When it is called, the flow will increment but it won't keep incrementing until the next
    //call.
    for date in clock.borrow().peek() {
        res.insert(date, mu_monthly);
    }
    res
}

pub fn monthly_data_generator_parametric_normal(
    mu_annual: f64,
    var_annual: f64,
    clock: Clock,
) -> SimDataRep {
    let mut res = HashMap::new();

    let mu_monthly: f64;
    if mu_annual == 0.0 {
        mu_monthly = 0.0
    } else {
        mu_monthly = mu_annual / 12.0;
    }
    let var_monthly = var_annual / 12.0_f64.sqrt();

    let mut rng = thread_rng();
    let dist = Normal::new(mu_monthly, var_monthly).unwrap();

    //Date is set for the whole of the month, the expectation is that clients will only call once a
    //month to update their value for inflation.
    let mut month = 0;
    let mut val = dist.sample(&mut rng);
    for date in clock.borrow().peek() {
        //Should only occur on first iteration
        if month.eq(&0) {
            month = date.month().into();
            res.insert(date, val);
            continue;
        }

        let curr_month: u8 = date.month().into();
        if curr_month == month {
            res.insert(date, val);
        } else {
            //We only update on the first day of the new month, for every day of that new month we
            //reuse the value generated here
            month = date.month().into();
            val = dist.sample(&mut rng);
            res.insert(date, val);
        }
    }
    res
}

pub fn build_hashmapsource_random(clock: Clock) -> HashMapSourceSim {
    let mut rng = thread_rng();
    let dist = Normal::new(0.0, 0.015).unwrap();

    let inflation = monthly_data_generator_static(0.0, Rc::clone(&clock));
    let rates = monthly_data_generator_static(0.0, Rc::clone(&clock));
    let house_price_rets = monthly_data_generator_static(0.0, Rc::clone(&clock));

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
