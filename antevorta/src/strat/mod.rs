use alator::broker::{
    BacktestBroker, BrokerCalculations, BrokerCashEvent, DividendPayment, EventLog, Trade,
    TransferCash,
};
use alator::clock::Clock;
use alator::sim::SimulatedBroker;
use alator::strategy::{Strategy, StrategyEvent, TransferFrom, TransferTo};
use alator::types::{CashValue, PortfolioAllocation};

use crate::input::HashMapSourceSim;
use crate::schedule::Schedule;

//[InvestmentStrategy] supplements the [Strategy] provided by alator with methods that are relevant
//to antevorta simulation strategies.
//
//.check() and .finish() are included here because the antevorta simulation modifies state outside
//of a typical rebalance (and these changes in states have intra-account dependencies) so we need
//to add the lifecycle methods to the strategy, so they can be called through accounts.
pub trait InvestmentStrategy: Clone + Strategy + TransferFrom + TransferTo {
    fn get_liquidation_value(&mut self) -> CashValue;
    fn trades_between(&self, start: &i64, end: &i64) -> Vec<Trade>;
    fn dividends_between(&self, start: &i64, end: &i64) -> Vec<DividendPayment>;
    fn check(&mut self);
    fn finish(&mut self);
}

#[derive(Clone)]
pub struct StaticInvestmentStrategy {
    brkr: SimulatedBroker<HashMapSourceSim>,
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
        self.brkr.finish();
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

    //Have to call lifecycle methods here because antevorta simulations have their own lifecycle
    //that aren't hooked into the broker
    fn check(&mut self) {
        self.brkr.check();
    }

    //Have to call lifecycle methods here because antevorta simulations have their own lifecycle
    //that aren't hooked into the broker
    fn finish(&mut self) {
        self.brkr.finish();
    }
}

impl StaticInvestmentStrategy {
    pub fn new(
        brkr: SimulatedBroker<HashMapSourceSim>,
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
