/*
Tests various build configs that should either pass or fail.

We do this here rather than in config because of the hard dependency on needing
a complete config.
*/

use antevorta::country::uk::Config;
use antevorta::input::{FakeHashMapSourceSim, HashMapSourceSim};
use rand::thread_rng;
use rand_distr::{Distribution, Normal};
use std::collections::HashMap;

use alator::broker::Quote;
use alator::clock::{Clock, ClockBuilder};
use alator::input::{HashMapInputBuilder, QuotesHashMap};
use alator::sim::broker::SimulatedBrokerBuilder;
use alator::types::PortfolioAllocation;
use antevorta::schedule::Schedule;
use antevorta::strat::StaticInvestmentStrategy;
use std::rc::Rc;

fn setup() -> (Clock, StaticInvestmentStrategy, HashMapSourceSim) {
    let clock = ClockBuilder::from_length_days(&(1.into()), 100).daily();
    let mut rng = thread_rng();
    let ret_dist = Normal::new(0.02, 0.1).unwrap();

    let mut fake_data: QuotesHashMap = HashMap::new();
    let mut price_abc = 100.0;
    let mut price_bcd = 100.0;
    for date in clock.borrow().peek() {
        let q_abc = Quote {
            symbol: "ABC".to_string(),
            date: date.into(),
            bid: price_abc.into(),
            ask: price_abc.into(),
        };
        let q_bcd = Quote {
            symbol: "BCD".to_string(),
            date: date.into(),
            bid: price_bcd.into(),
            ask: price_bcd.into(),
        };
        fake_data.insert(date.into(), vec![q_abc, q_bcd]);
        price_abc += price_abc * (1.0 + ret_dist.sample(&mut rng));
        price_bcd += price_bcd * (1.0 + ret_dist.sample(&mut rng));
    }
    let source = HashMapInputBuilder::new()
        .with_quotes(fake_data)
        .with_clock(Rc::clone(&clock))
        .build();
    let sim_data = FakeHashMapSourceSim::get(Rc::clone(&clock));

    let mut target_weights = PortfolioAllocation::new();
    target_weights.insert("ABC", &0.5.into());
    target_weights.insert("BCD", &0.5.into());

    let brkr = SimulatedBrokerBuilder::new().with_data(source).build();

    let strat = StaticInvestmentStrategy::new(
        brkr,
        Schedule::EveryFriday,
        target_weights,
        Rc::clone(&clock),
    );
    (clock, strat, sim_data)
}

#[test]
#[should_panic]
fn test_that_build_fails_without_all_stacks() {
    let data = r#"
        {
            "starting_cash": 1000.0,
            "nic": "A",
            "lifetime_pension_contributions": 10.0,
            "emergency_cash_min": 4000.0,
            "contribution_pct": 0.1,
            "stacks": [
                {
                    "stack_type": "Isa",
                    "value": 4000.0
                }
            ]
        }"#;

    let (clock, strat, sim_data) = setup();
    let config = Config::parse(data).unwrap();
    config.create(Rc::clone(&clock), strat, sim_data);
}

#[test]
fn test_that_percent_of_income_expense_can_build() {
    let data = r#"
        {
            "starting_cash": 1000.0,
            "nic": "A",
            "lifetime_pension_contributions": 10.0,
            "contribution_pct": 0.1,
            "emergency_cash_min": 4000.0,
            "flows": [
                {
                    "flow_type": "Employment",
                    "value": 4000.0,
                    "schedule": {
                        "schedule_type": "EndOfMonth"
                    }
                },
                {
                    "flow_type": "PctOfIncomeExpense",
                    "pct": 0.25,
                    "schedule": {
                        "schedule_type": "EndOfMonth"
                    }
                }
            ],
            "stacks": [
                {
                    "stack_type": "Isa",
                    "value": 4000.0
                },
                {
                    "stack_type": "Gia",
                    "value": 4000.0
                },
                {
                    "stack_type": "Sipp",
                    "value": 4000.0
                }
            ]
        }"#;
    let (clock, strat, sim_data) = setup();
    let config = Config::parse(data).unwrap();
    config.create(Rc::clone(&clock), strat, sim_data);
}

#[test]
fn test_that_static_growth_can_build() {
    let data = r#"
        {
            "starting_cash": 1000.0,
            "nic": "A",
            "lifetime_pension_contributions": 10.0,
            "contribution_pct": 0.1,
            "emergency_cash_min": 4000.0,
            "flows": [
                {
                    "flow_type": "EmploymentStaticGrowth",
                    "value": 1000.0,
                    "static_growth": 0.1,
                    "schedule": {
                        "schedule_type": "EndOfMonth"
                    }
                }
            ],
            "stacks": [
                {
                    "stack_type": "Isa",
                    "value": 4000.0
                },
                {
                    "stack_type": "Gia",
                    "value": 4000.0
                },
                {
                    "stack_type": "Sipp",
                    "value": 4000.0
                }
            ]
        }"#;
    let (clock, strat, sim_data) = setup();
    let config = Config::parse(data).unwrap();
    config.create(Rc::clone(&clock), strat, sim_data);
}

#[test]
#[should_panic]
fn test_that_stack_creation_without_value_fails() {
    let data = r#"
        {
            "starting_cash": 1000.0,
            "nic": "A",
            "lifetime_pension_contributions": 10.0,
            "contribution_pct": 0.1,
            "emergency_cash_min": 4000.0,
            "flows": [
                {
                    "flow_type": "EmploymentStaticGrowth",
                    "value": 1000.0,
                    "static_growth": 0.1,
                    "schedule": {
                        "schedule_type": "EndOfMonth"
                    }
                }
            ],
            "stacks": [
                {
                    "stack_type": "Isa",
                },
                {
                    "stack_type": "Gia",
                },
                {
                    "stack_type": "Sipp",
                }
            ]
        }"#;
    let (clock, strat, sim_data) = setup();
    let config = Config::parse(data).unwrap();
    config.create(Rc::clone(&clock), strat, sim_data);
}

#[test]
fn test_that_mortgage_can_build() {
    let data = r#"
        {
            "starting_cash": 1000.0,
            "nic": "A",
            "lifetime_pension_contributions": 10.0,
            "contribution_pct": 0.1,
            "emergency_cash_min": 4000.0,
            "flows": [
                {
                    "flow_type": "EmploymentStaticGrowth",
                    "value": 1000.0,
                    "static_growth": 0.1,
                    "schedule": {
                        "schedule_type": "EndOfMonth"
                    }
                }
            ],
            "stacks": [
                {
                    "stack_type": "Isa",
                    "value": 4000.0
                },
                {
                    "stack_type": "Gia",
                    "value": 4000.0
                },
                {
                    "stack_type": "Sipp",
                    "value": 4000.0
                },
                {
                    "stack_type": "Mortgage",
                    "value": 4000.0,
                    "rate": 0.05,
                    "term": 30,
                    "fix_end": 100,
                    "fix_length": 5
                }
            ]
        }"#;
    let (clock, strat, sim_data) = setup();
    let config = Config::parse(data).unwrap();
    config.create(Rc::clone(&clock), strat, sim_data);
}