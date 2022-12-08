use alator::broker::Quote;
use alator::clock::{Clock, ClockBuilder};
use alator::input::{HashMapInput, HashMapInputBuilder, QuotesHashMap};
use alator::sim::broker::SimulatedBrokerBuilder;
use alator::types::PortfolioAllocation;
use antevorta::input::{FakeHashMapSourceSim};
use rand::thread_rng;
use rand_distr::{Distribution, Normal};
use std::collections::HashMap;
use std::rc::Rc;

use antevorta::country::uk::Config;
use antevorta::schedule::Schedule;
use antevorta::sim::SimRunner;
use antevorta::strat::StaticInvestmentStrategy;

fn build_data(clock: Clock) -> HashMapInput {
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
        .with_clock(clock)
        .build();
    source
}

#[test]
fn sim_test() {
    let clock = ClockBuilder::from_length_days(&(1.into()), 100).daily();
    let source = build_data(Rc::clone(&clock));
    let src = FakeHashMapSourceSim::get(Rc::clone(&clock));

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

    let config = r#"{
        "starting_cash": 1000.0,
        "nic": "A",
        "contribution_pct": 0.05,
        "emergency_cash_min": 1000.0,
        "lifetime_pension_contributions": 0.0,
        "flows": [
            {
                "flow_type": "EmploymentStaticGrowth",
                "value": 4000.0,
                "static_growth": 0.0001,
                "schedule": {
                    "schedule_type": "EndOfMonth"
                }
            }
        ],
        "stacks": [
            {
                "stack_type": "Gia",
                "value": 0.0
            },
            {
                "stack_type": "Sipp",
                "value": 0.0
            },
            {
                "stack_type": "Isa",
                "value": 0.0
            }
        ]
    }"#;

    let sim = Config::parse(config).unwrap().create(Rc::clone(&clock), strat, src);
    let mut runner = SimRunner {
        clock: Rc::clone(&clock),
        state: sim,
    };

    let result = runner.run();
    result.0;
}
