use alator::broker::{
    BrokerCalculations, DividendPayment, Trade, BacktestBroker, TransferCash, EventLog, BrokerCashEvent,
};
use alator::clock::Clock;
use alator::input::HashMapInput;
use alator::sim::SimulatedBroker;
use alator::strategy::{Strategy, StrategyEvent, TransferFrom, TransferTo};
use alator::types::{CashValue, PortfolioAllocation};

use crate::schedule::Schedule;

pub trait InvestmentStrategy: Clone + Strategy + TransferFrom + TransferTo {
    fn get_liquidation_value(&mut self) -> CashValue;
    fn trades_between(&self, start: &i64, end: &i64) -> Vec<Trade>;
    fn dividends_between(&self, start: &i64, end: &i64) -> Vec<DividendPayment>;
}

#[derive(Clone)]
pub struct StaticInvestmentStrategy {
    brkr: SimulatedBroker<HashMapInput>,
    rebalance_schedule: Schedule,
    target_weights: PortfolioAllocation,
    clock: Clock,
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
                self.brkr.send_orders(orders);
            }
        }
        self.get_liquidation_value()
    }

    fn init(&mut self, initial_cash: &f64) {
        self.brkr.deposit_cash(initial_cash);
    }
}

impl TransferTo for StaticInvestmentStrategy {
    fn deposit_cash(&mut self, cash: &f64) -> StrategyEvent {
        self.brkr.deposit_cash(cash);
        StrategyEvent::DepositSuccess(CashValue::from(*cash))
    }
}

impl TransferFrom for StaticInvestmentStrategy {
    fn withdraw_cash(&mut self, cash: &f64) -> StrategyEvent {
        if let BrokerCashEvent::WithdrawSuccess(amount) = self.brkr.withdraw_cash(cash) {
            return StrategyEvent::WithdrawSuccess(amount);
        }
        StrategyEvent::WithdrawFailure(CashValue::from(*cash))
    }

    fn withdraw_cash_with_liquidation(&mut self, cash: &f64) -> StrategyEvent {
        if let BrokerCashEvent::WithdrawSuccess(amount) =
            BrokerCalculations::withdraw_cash_with_liquidation(cash, &mut self.brkr)
        {
            return StrategyEvent::WithdrawSuccess(amount);
        }
        StrategyEvent::WithdrawFailure(CashValue::from(*cash))
    }
}

impl InvestmentStrategy for StaticInvestmentStrategy {
    fn get_liquidation_value(&mut self) -> CashValue {
        self.brkr.get_liquidation_value()
    }

    fn trades_between(&self, start: &i64, end: &i64) -> Vec<Trade> {
        self.brkr.trades_between(start, end)
    }

    fn dividends_between(&self, start: &i64, end: &i64) -> Vec<DividendPayment> {
        self.brkr.dividends_between(start, end)
    }
}

impl StaticInvestmentStrategy {
    pub fn new(
        brkr: SimulatedBroker<HashMapInput>,
        rebalance_schedule: Schedule,
        target_weights: PortfolioAllocation,
        clock: Clock,
    ) -> Self {
        Self {
            brkr,
            rebalance_schedule,
            target_weights,
            clock,
        }
    }
}
