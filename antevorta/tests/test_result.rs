use alator::clock::ClockBuilder;
use alator::exchange::DefaultExchangeBuilder;
use alator::sim::SimulatedBrokerBuilder;
use alator::types::PortfolioAllocation;
use antevorta::input::build_hashmapsource_random;
use antevorta::output::UKSimulationOutput;
use std::rc::Rc;

use antevorta::config::uk::UKSimConfig;
use antevorta::schedule::Schedule;
use antevorta::strat::StaticInvestmentStrategy;

//Tests simulations longer than one year. This verifies functioning of lower-frequency mutations to
//simulation i.e. taxation.
#[test]
fn sim_result_test() {
    let clock = ClockBuilder::with_length_in_days(1, 365 * 2)
        .with_frequency(&alator::types::Frequency::Daily)
        .build();
    let src = build_hashmapsource_random(Rc::clone(&clock));

    let mut target_weights = PortfolioAllocation::new();
    target_weights.insert("ABC", 1.0);

    let exchange = DefaultExchangeBuilder::new()
        .with_clock(Rc::clone(&clock))
        .with_data_source(src.clone())
        .build();

    let brkr = SimulatedBrokerBuilder::new()
        .with_data(src.clone())
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
                    "schedule_type": "EndOfMonth"
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

    let mut sim = UKSimConfig::parse(config)
        .unwrap()
        .create(Rc::clone(&clock), strat, src);

    while clock.borrow().has_next() {
        clock.borrow_mut().tick();
        sim.update();
    }
    assert!(*UKSimulationOutput::get_final_value(&sim) > 40_000.0);
}
