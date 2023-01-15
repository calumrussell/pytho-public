use alator::broker::Quote;
use alator::clock::ClockBuilder;
use alator::exchange::DefaultExchangeBuilder;
use alator::input::QuotesHashMap;
use alator::sim::SimulatedBrokerBuilder;
use alator::types::{DateTime, PortfolioAllocation};
use antevorta::input::FakeHashMapSourceSimWithQuotes;
use std::collections::HashMap;
use std::rc::Rc;

use antevorta::country::uk::Config;
use antevorta::schedule::Schedule;
use antevorta::strat::StaticInvestmentStrategy;

/*
 * This tests if the deposit strategy is making the correct rebalancing. Needs to be tested from
 * top-level because of the hierarchial dependencies in the code. We need to strictly control the
 * data coming in so that the correct sequence of deposits should occur within the strategy.
 * DepositStrategy is only triggered on wage income types.
 */
#[test]
fn sim_depositstrategy() {
    let sim_start: DateTime = 10.into();
    let clock = ClockBuilder::with_length_in_days(sim_start, 3)
        .with_frequency(&alator::types::Frequency::Daily)
        .build();

    let mut fake_data: QuotesHashMap = HashMap::new();
    for date in clock.borrow().peek() {
        fake_data.insert(
            date.clone(),
            vec![Quote {
                date,
                bid: 10.0.into(),
                ask: 10.0.into(),
                symbol: "ABC".to_string(),
            }],
        );
    }

    let src = FakeHashMapSourceSimWithQuotes::get(Rc::clone(&clock), fake_data);

    let mut target_weights = PortfolioAllocation::new();
    target_weights.insert("ABC", 1.0);

    let exchange = DefaultExchangeBuilder::new()
        .with_clock(Rc::clone(&clock))
        .with_data_source(src.clone())
        .build();

    let brkr = SimulatedBrokerBuilder::new()
        .with_exchange(exchange)
        .with_data(src.clone())
        .build();

    let strat =
        StaticInvestmentStrategy::new(brkr, Schedule::EveryDay, target_weights, Rc::clone(&clock));

    let config = r#"{
        "starting_cash": 0.0,
        "nic": "A",
        "contribution_pct": 0.05,
        "emergency_cash_min": 5000.0,
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
    //The value of the bank account should be equal to the emergency fund balance
    //4_000 * SIM_LENGTH = 12_000
    //The total value of the portfolio should be equal to the total amount of wages
    //Note: if costs aren't zero then this isn't true, so no broker costs can be added to this
    //simulation
    while clock.borrow().has_next() {
        clock.borrow_mut().tick();
        sim.update();
    }
    assert!(*sim.get_state() == 12_000.0);
}
