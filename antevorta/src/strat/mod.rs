use alator::broker::{
    BrokerCalculations, BrokerEvent, DividendPayment, EventLog, ExecutesOrder, PositionInfo, Trade,
    TransferCash,
};
use alator::clock::Clock;
use alator::input::HashMapInput;
use alator::perf::{PerfStruct, StrategyPerformance};
use alator::sim::broker::SimulatedBroker;
use alator::strategy::{Strategy, StrategyEvent, TransferFrom, TransferTo};
use alator::types::{CashValue, DateTime, PortfolioAllocation, PortfolioWeight};

use crate::schedule::Schedule;

pub trait InvestmentStrategy: Clone + Strategy + TransferFrom + TransferTo {
    fn get_liquidation_value(&mut self) -> CashValue;
    fn trades_between(&self, start: &DateTime, end: &DateTime) -> Vec<Trade>;
    fn dividends_between(&self, start: &DateTime, end: &DateTime) -> Vec<DividendPayment>;
}

#[derive(Clone)]
pub struct StaticInvestmentStrategy {
    brkr: SimulatedBroker<HashMapInput>,
    rebalance_schedule: Schedule,
    target_weights: PortfolioAllocation<PortfolioWeight>,
    clock: Clock,
    perf: StrategyPerformance,
}

impl Strategy for StaticInvestmentStrategy {
    fn update(&mut self) -> CashValue {
        let date = self.clock.borrow().now();
        if self.rebalance_schedule.check(&date) {
            let orders = BrokerCalculations::diff_brkr_against_target_weights(
                &self.target_weights,
                &mut self.brkr,
            );
            if !orders.is_empty() {
                self.brkr.execute_orders(orders);
            }
        }
        self.get_liquidation_value()
    }

    fn init(&mut self, initial_cash: &CashValue) {
        self.brkr.deposit_cash(*initial_cash);
    }

    fn get_perf(&self) -> PerfStruct {
        self.perf.get_output()
    }
}

impl TransferTo for StaticInvestmentStrategy {
    fn deposit_cash(&mut self, cash: &CashValue) -> StrategyEvent {
        self.brkr.deposit_cash(*cash);
        StrategyEvent::DepositSuccess(*cash)
    }
}

impl TransferFrom for StaticInvestmentStrategy {
    fn withdraw_cash(&mut self, cash: &CashValue) -> StrategyEvent {
        if let BrokerEvent::WithdrawSuccess(amount) = self.brkr.withdraw_cash(*cash) {
            return StrategyEvent::WithdrawSuccess(amount);
        }
        StrategyEvent::WithdrawFailure(*cash)
    }

    fn withdraw_cash_with_liquidation(&mut self, cash: &CashValue) -> StrategyEvent {
        if let BrokerEvent::WithdrawSuccess(amount) =
            BrokerCalculations::withdraw_cash_with_liquidation(cash, &mut self.brkr)
        {
            return StrategyEvent::WithdrawSuccess(amount);
        }
        StrategyEvent::WithdrawFailure(*cash)
    }
}

impl InvestmentStrategy for StaticInvestmentStrategy {
    fn get_liquidation_value(&mut self) -> CashValue {
        self.brkr.get_liquidation_value()
    }

    fn trades_between(&self, start: &DateTime, end: &DateTime) -> Vec<Trade> {
        self.brkr.trades_between(start, end)
    }

    fn dividends_between(&self, start: &DateTime, end: &DateTime) -> Vec<DividendPayment> {
        self.brkr.dividends_between(start, end)
    }
}

impl StaticInvestmentStrategy {
    pub fn new(
        brkr: SimulatedBroker<HashMapInput>,
        rebalance_schedule: Schedule,
        target_weights: PortfolioAllocation<PortfolioWeight>,
        clock: Clock,
    ) -> Self {
        let perf = StrategyPerformance::daily();
        Self {
            brkr,
            rebalance_schedule,
            target_weights,
            clock,
            perf,
        }
    }
}
