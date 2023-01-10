use std::cell::RefCell;
use std::{collections::HashMap};
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
    inner: Rc<RefCell<HashMapSourceSimInner>>
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

pub struct FakeHashMapSourceSim;

impl FakeHashMapSourceSim {
    pub fn get(clock: Clock) -> HashMapSourceSim {
        let mut rng = thread_rng();
        let dist = Normal::new(0.0, 0.015).unwrap();

        let mut inflation: SimDataRep = HashMap::new();
        for date in clock.borrow().peek() {
            inflation.insert(date, 0.0);
        }

        let mut rates: SimDataRep = HashMap::new();
        for date in clock.borrow().peek() {
            rates.insert(date, 0.0);
        }

        let mut house_price_rets: SimDataRep = HashMap::new();
        for date in clock.borrow().peek() {
            house_price_rets.insert(date, 0.0);
        }

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
}

pub struct FakeHashMapSourceSimWithQuotes;

impl FakeHashMapSourceSimWithQuotes {
    pub fn get(clock: Clock, quotes: QuotesHashMap) -> HashMapSourceSim {
        let mut inflation: SimDataRep = HashMap::new();
        for date in clock.borrow().peek() {
            inflation.insert(date, 0.0);
        }

        let mut rates: SimDataRep = HashMap::new();
        for date in clock.borrow().peek() {
            rates.insert(date, 0.0);
        }

        let mut house_price_rets: SimDataRep = HashMap::new();
        for date in clock.borrow().peek() {
            house_price_rets.insert(date, 0.0);
        }

        HashMapSourceSimBuilder::start()
            .with_clock(Rc::clone(&clock))
            .with_rates(rates)
            .with_inflation(inflation)
            .with_house_prices(house_price_rets)
            .with_quotes(quotes)
            .build()
    }
}

pub struct FakeRatesDataGenerator;

impl FakeRatesDataGenerator {
    pub fn get() -> impl FnMut() -> f64 {
        let mut rng = thread_rng();
        let dist = Normal::new(0.02, 0.1).unwrap();

        move || dist.sample(&mut rng)
    }
}
