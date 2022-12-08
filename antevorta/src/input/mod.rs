use std::collections::HashMap;
use std::rc::Rc;

use alator::{clock::Clock, types::DateTime};
use rand::thread_rng;
use rand_distr::{Distribution, Normal};

type SimDataRep = HashMap<DateTime, f64>;

pub trait SimDataSource: Clone {
    fn get_current_inflation(&self) -> Option<&f64>;
    fn get_current_interest_rate(&self) -> Option<&f64>;
    fn get_current_house_price_return(&self) -> Option<&f64>;
}

#[derive(Clone)]
pub struct HashMapSourceSim {
    clock: Clock,
    inflation: SimDataRep,
    rates: SimDataRep,
    house_price_rets: SimDataRep,
}

impl SimDataSource for HashMapSourceSim {
    fn get_current_house_price_return(&self) -> Option<&f64> {
        let now = self.clock.borrow().now();
        self.house_price_rets.get(&now)
    }

    fn get_current_inflation(&self) -> Option<&f64> {
        let now = self.clock.borrow().now();
        self.inflation.get(&now)
    }

    fn get_current_interest_rate(&self) -> Option<&f64> {
        let now = self.clock.borrow().now();
        self.rates.get(&now)
    }
}

impl HashMapSourceSim {
    pub fn new(
        clock: Clock,
        inflation: SimDataRep,
        rates: SimDataRep,
        house_price_rets: SimDataRep,
    ) -> Self {
        Self {
            clock,
            inflation,
            rates,
            house_price_rets,
        }
    }
}

pub struct HashMapSourceSimBuilder {
    clock: Option<Clock>,
    inflation: SimDataRep,
    rates: SimDataRep,
    house_price_rets: SimDataRep,
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

    pub fn build(&mut self) -> HashMapSourceSim {
        if self.clock.is_none() {
            panic!("HashMapSourceSimBuilder must set clock with with_clock");
        }

        HashMapSourceSim::new(
            self.clock.as_ref().unwrap().clone(),
            self.inflation.clone(),
            self.rates.clone(),
            self.house_price_rets.clone(),
        )
    }

    pub fn start() -> Self {
        Self {
            clock: None,
            inflation: HashMap::new(),
            rates: HashMap::new(),
            house_price_rets: HashMap::new(),
        }
    }
}

pub struct FakeHashMapSourceSim;

impl FakeHashMapSourceSim {
    pub fn get(clock: Clock) -> HashMapSourceSim {
        let mut rng = thread_rng();
        let dist = Normal::new(0.02, 0.1).unwrap();

        let mut inflation: SimDataRep = HashMap::new();
        for date in clock.borrow().peek() {
            inflation.insert(date, dist.sample(&mut rng));
        }

        let mut rates: SimDataRep = HashMap::new();
        for date in clock.borrow().peek() {
            rates.insert(date, dist.sample(&mut rng));
        }

        let mut house_price_rets: SimDataRep = HashMap::new();
        for date in clock.borrow().peek() {
            house_price_rets.insert(date, dist.sample(&mut rng));
        }

        HashMapSourceSimBuilder::start()
            .with_clock(Rc::clone(&clock))
            .with_rates(rates)
            .with_inflation(inflation)
            .with_house_prices(house_price_rets)
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
