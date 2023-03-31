use alator::clock::ClockBuilder;
use alator::exchange::DefaultExchangeBuilder;
use alator::sim::SimulatedBrokerBuilder;
use alator::types::PortfolioAllocation;
use antevorta::input::build_hashmapsource_random;
use antevorta::output::UKSimulationOutput;
use std::rc::Rc;

use antevorta::country::uk::Config;
use antevorta::schedule::Schedule;
use antevorta::strat::StaticInvestmentStrategy;

#[test]
fn sim_test() {
    let clock = ClockBuilder::with_length_in_days(1, 1000)
        .with_frequency(&alator::types::Frequency::Daily)
        .build();
    let src = build_hashmapsource_random(Rc::clone(&clock));

    let mut target_weights = PortfolioAllocation::new();
    target_weights.insert("ABC", 0.5);
    target_weights.insert("BCD", 1.5);

    let exchange = DefaultExchangeBuilder::new()
        .with_clock(Rc::clone(&clock))
        .with_data_source(src.clone())
        .build();

    let brkr = SimulatedBrokerBuilder::new()
        .with_exchange(exchange)
        .with_data(src.clone())
        .build();

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
                    "schedule_type": "StartOfMonth"
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

    let mut sim = Config::parse(config)
        .unwrap()
        .create(Rc::clone(&clock), strat, src);

    while clock.borrow().has_next() {
        clock.borrow_mut().tick();
        sim.update();
    }

    let _perf = UKSimulationOutput::get_output(&sim);
}
