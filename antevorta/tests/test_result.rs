use alator::broker::Quote;
use alator::clock::{Clock, ClockBuilder};
use alator::exchange::DefaultExchangeBuilder;
use alator::input::{HashMapInput, HashMapInputBuilder};
use alator::sim::SimulatedBrokerBuilder;
use alator::types::{DateTime, PortfolioAllocation};
use antevorta::input::FakeHashMapSourceSim;
use std::collections::HashMap;
use std::rc::Rc;

use antevorta::country::uk::Config;
use antevorta::schedule::Schedule;
use antevorta::sim::SimRunner;
use antevorta::strat::StaticInvestmentStrategy;

fn build_data(clock: Clock) -> HashMapInput {
    let ret = 0.02;

    let mut fake_data: HashMap<DateTime, Vec<Quote>> = HashMap::new();
    let mut price_abc = 100.0;
    for date in clock.borrow().peek() {
        let q_abc = Quote::new(
            price_abc,
            price_abc,
            date.clone(),
            "ABC"
        );
        fake_data.insert(date.into(), vec![q_abc]);
        price_abc += price_abc * (1.0 + ret);
    }
    let source = HashMapInputBuilder::new()
        .with_quotes(fake_data)
        .with_clock(clock)
        .build();
    source
}

/*
 * Use a fixed positive return to check at a very high level whether the result makes sense
 */
#[test]
fn sim_result_test() {
    let start_date = 1;
    const SIM_LENGTH: i64 = 10;
    let end_date = start_date + ((SIM_LENGTH + 1) * 86_400);
    let clock = ClockBuilder::with_length_in_dates(start_date, end_date)
        .with_frequency(&alator::types::Frequency::Daily)
        .build();

    let source = build_data(Rc::clone(&clock));
    let src = FakeHashMapSourceSim::get(Rc::clone(&clock));

    let mut target_weights = PortfolioAllocation::new();
    target_weights.insert("ABC", 1.0);

    let exchange = DefaultExchangeBuilder::new()
        .with_clock(Rc::clone(&clock))
        .with_data_source(source.clone())
        .build();

    let brkr = SimulatedBrokerBuilder::new()
        .with_data(source)
        .with_exchange(exchange)
        .build();

    let strat =
        StaticInvestmentStrategy::new(brkr, Schedule::EveryDay, target_weights, Rc::clone(&clock));

    let config = r#"{
        "starting_cash": 0.0,
        "nic": "A",
        "contribution_pct": 0.05,
        "emergency_cash_min": 0.0,
        "lifetime_pension_contributions": 0.0,
        "flows": [
            {
                "flow_type": "Employment",
                "value": 4000.0,
                "schedule": {
                    "schedule_type": "EveryDay"
                }
            }
        ],
        "stacks": [
            {
                "stack_type": "Gia",
                "value": 1000.0
            },
            {
                "stack_type": "Sipp",
                "value": 1000.0
            },
            {
                "stack_type": "Isa",
                "value": 1000.0
            }
        ]
    }"#;

    let sim = Config::parse(config).unwrap().create(Rc::clone(&clock), strat, src);
    let mut runner = SimRunner {
        clock: Rc::clone(&clock),
        state: sim,
    };
    let perf = runner.run();
    assert!(perf.0 > 40_000.0);
}
