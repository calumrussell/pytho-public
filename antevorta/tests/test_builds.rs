/*
Tests various build configs that should either pass or fail.

We do this here rather than in config because of the hard dependency on needing
a complete config.
*/

use alator::exchange::DefaultExchangeBuilder;
use antevorta::country::uk::Config;
use antevorta::input::{FakeHashMapSourceSimWithQuotes, HashMapSourceSim};
use rand::thread_rng;
use rand_distr::{Distribution, Normal};
use std::collections::HashMap;

use alator::broker::Quote;
use alator::clock::{Clock, ClockBuilder};
use alator::input::QuotesHashMap;
use alator::sim::SimulatedBrokerBuilder;
use alator::types::PortfolioAllocation;
use antevorta::schedule::Schedule;
use antevorta::strat::StaticInvestmentStrategy;
use std::rc::Rc;

fn setup() -> (Clock, StaticInvestmentStrategy, HashMapSourceSim) {
    let clock = ClockBuilder::with_length_in_days(1, 100)
        .with_frequency(&alator::types::Frequency::Daily)
        .build();

    let mut rng = thread_rng();
    let ret_dist = Normal::new(0.02, 0.1).unwrap();

    let mut fake_data: QuotesHashMap = HashMap::new();
    let mut price_abc = 100.0;
    let mut price_bcd = 100.0;
    for date in clock.borrow().peek() {
        let q_abc = Quote::new(price_abc, price_abc, date.clone(), "ABC");
        let q_bcd = Quote::new(price_bcd, price_bcd, date.clone(), "BCD");
        fake_data.insert(date.into(), vec![q_abc, q_bcd]);
        price_abc *= 1.0 + ret_dist.sample(&mut rng);
        price_bcd *= 1.0 + ret_dist.sample(&mut rng);
    }

    let sim_data = FakeHashMapSourceSimWithQuotes::get(Rc::clone(&clock), fake_data);

    let mut target_weights = PortfolioAllocation::new();
    target_weights.insert("ABC", 0.5);
    target_weights.insert("BCD", 0.5);

    let exchange = DefaultExchangeBuilder::new()
        .with_data_source(sim_data.clone())
        .with_clock(Rc::clone(&clock))
        .build();

    let brkr = SimulatedBrokerBuilder::new()
        .with_data(sim_data.clone())
        .with_exchange(exchange)
        .build();

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
    let mut sim = Config::parse(data)
        .unwrap()
        .create(Rc::clone(&clock), strat, sim_data);

    while clock.borrow().has_next() {
        clock.borrow_mut().tick();
        sim.update();
    }

    assert!(*sim.get_state() > 0.0);
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
    let mut sim = Config::parse(data)
        .unwrap()
        .create(Rc::clone(&clock), strat, sim_data);

    while clock.borrow().has_next() {
        clock.borrow_mut().tick();
        sim.update();
    }

    assert!(*sim.get_state() > 0.0);
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
    let mut sim = Config::parse(data)
        .unwrap()
        .create(Rc::clone(&clock), strat, sim_data);

    while clock.borrow().has_next() {
        clock.borrow_mut().tick();
        sim.update();
    }
    assert!(*sim.get_state() > 0.0)
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
    let mut sim = Config::parse(data)
        .unwrap()
        .create(Rc::clone(&clock), strat, sim_data);
    while clock.borrow().has_next() {
        clock.borrow_mut().tick();
        sim.update();
    }
    assert!(*sim.get_state() > 0.0)
}

#[test]
fn test_build_that_orders_income_expense_before_income() {
    //This was triggering an error where the expense was deducted before the income when going
    //through the loop. Which caused issues with calculations downstream.
    let data = r#"
        {
            "flows": [
                {
                    "person":0,
                    "schedule": {
                        "schedule_type":"EndOfMonth"
                    },
                    "pct":0.5,
                    "flow_type":"PctOfIncomeExpense"
                },
                {
                    "person":0,
                    "schedule": {
                        "schedule_type":"EndOfMonth"
                    },
                    "value":4500,
                    "flow_type":"Employment"
                }
            ],
            "stacks": [
                {
                    "stack_type":"Gia",
                    "value":0
                },
                {
                    "stack_type":"Isa"
                    ,"value":0
                },{
                    "stack_type":"Sipp"
                    ,"value":0
                }
            ],
            "nic":"A",
            "contribution_pct":0.05,
            "emergency_cash_min":1000,
            "starting_cash":5000,
            "lifetime_pension_contributions":0
        }
    "#;
    let (clock, strat, sim_data) = setup();
    let mut sim = Config::parse(data)
        .unwrap()
        .create(Rc::clone(&clock), strat, sim_data);

    while clock.borrow().has_next() {
        clock.borrow_mut().tick();
        sim.update();
    }

    assert!(*sim.get_state() > 0.0)
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
    let mut sim = Config::parse(data)
        .unwrap()
        .create(Rc::clone(&clock), strat, sim_data);

    while clock.borrow().has_next() {
        clock.borrow_mut().tick();
        sim.update();
    }

    assert!(*sim.get_state() > 0.0)
}
