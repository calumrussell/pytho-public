use alator::broker::{DividendPayment, Trade, TradeType};
use alator::clock::Clock;
use alator::strategy::StrategyEvent;
use alator::types::{CashValue, DateTime};
use time::{Duration, OffsetDateTime};

use crate::acc::{CanTransfer, TransferResult};
use crate::input::SimDataSource;
use crate::schedule::Schedule;
use crate::strat::InvestmentStrategy;

pub enum Stack<S: InvestmentStrategy, D: SimDataSource> {
    Isa(Isa<S>),
    Sipp(Sipp<S>),
    Gia(Gia<S>),
    BankAcc(BankAcc),
    Mortgage(Mortgage<D>),
}

//Returns (deposit amount, return to client
//Need to split this for testing
fn isa_deposit_logic(
    amount: &f64,
    threshold: &f64,
    current_year_deposits: &f64,
) -> (CashValue, CashValue) {
    let can_deposit = threshold - current_year_deposits;
    if can_deposit <= 0.0 {
        //Over threshold, can't deposit at all
        (CashValue::from(0.0), CashValue::from(*amount))
    } else if amount < &can_deposit {
        //Under threshold, deposit full amount
        (CashValue::from(*amount), CashValue::from(0.0))
    } else {
        //Deposit would take us over the threhold,
        //deposit as much as possible and return
        //the rest
        (
            CashValue::from(can_deposit),
            CashValue::from(*amount - can_deposit),
        )
    }
}

//Calculates capital_gains realised in the current tax year
//Look for any sell orders that closed in the current year
//Calculate average_cost prior to sale
//Capital gain = sell_price - average_cost * number of shares
//Add up all capital gains
//To work out capital gains we need total trading history
fn calculate_capital_gains(all_trades: &[Trade], tax_year_start: &i64) -> CashValue {
    let mut capital_gain = 0.0;

    let current_year_trades: Vec<&Trade> = all_trades
        .iter()
        .filter(|t| t.date > DateTime::from(*tax_year_start))
        .collect();
    for sale in current_year_trades {
        if matches!(sale.typ, TradeType::Buy) {
            continue;
        }
        //Bad idea if we are doing high-frequency trades but this should be good enough
        //for this application
        let symbol_trades: Vec<&Trade> = all_trades
            .iter()
            .filter(|t| t.symbol.eq(&sale.symbol) && t.date < sale.date)
            .collect();
        if symbol_trades.is_empty() {
            continue;
        }
        let mut cum_qty = 0.0;
        let mut cum_val = 0.0;
        for symbol_trade in symbol_trades {
            match symbol_trade.typ {
                TradeType::Buy => {
                    cum_qty += *symbol_trade.quantity;
                    cum_val += *symbol_trade.value;
                }
                TradeType::Sell => {
                    cum_qty -= *symbol_trade.quantity;
                    cum_val -= *symbol_trade.value;
                }
            }
        }
        let avg_price = cum_val / cum_qty;
        let sale_price = *sale.value / *sale.quantity;
        let sale_capital_gain = (sale_price - avg_price) * *sale.quantity;
        capital_gain += sale_capital_gain
    }
    CashValue::from(capital_gain)
}

#[allow(clippy::enum_variant_names)]
pub enum UKAccount {
    IsaAnnualDepositThreshold,
    SippAnnualContributionThreshold,
    SippLifetimeContributionThreshold,
}

impl UKAccount {
    pub fn val(&self) -> CashValue {
        match self {
            UKAccount::IsaAnnualDepositThreshold => 20_000.0.into(),
            UKAccount::SippAnnualContributionThreshold => 40_000.0.into(),
            UKAccount::SippLifetimeContributionThreshold => 1_073_100.0.into(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct Isa<S: InvestmentStrategy> {
    strat: S,
    current_tax_year_deposits: CashValue,
}

//Tax year state is controlled from within the simulation.
impl<S: InvestmentStrategy> Isa<S> {
    pub fn zero(&mut self) {
        self.strat.zero();
    }

    pub fn rebalance(&mut self) {
        if *self.strat.get_liquidation_value() > 0.0 {
            self.strat.update();
        }
    }

    pub fn check(&mut self) {
        self.strat.check();
    }

    pub fn finish(&mut self) {
        self.strat.finish();
    }

    pub fn tax_year_end(&mut self) {
        self.current_tax_year_deposits = CashValue::default();
    }

    pub fn liquidation_value(&self) -> CashValue {
        self.strat.get_liquidation_value()
    }

    //We return the deposit amount because we may need to
    //deposit this elsewhere if we are over the limit
    pub fn deposit_wrapper(&mut self, amount: &f64) -> (CashValue, CashValue) {
        let (deposit, returned) = isa_deposit_logic(
            amount,
            &UKAccount::IsaAnnualDepositThreshold.val(),
            &self.current_tax_year_deposits,
        );
        self.deposit(&deposit);
        (deposit, returned)
    }

    pub fn new_with_cash(strat: S, start_cash: &f64) -> Self {
        let mut s = Self::new(strat);
        s.strat.init(start_cash);
        s
    }

    pub fn new(strat: S) -> Self {
        Self {
            strat,
            current_tax_year_deposits: CashValue::from(0.0),
        }
    }
}

impl<S: InvestmentStrategy> CanTransfer for Isa<S> {
    fn deposit(&mut self, amount: &f64) -> TransferResult {
        if let StrategyEvent::DepositSuccess(_amount) = self.strat.deposit_cash(amount) {
            TransferResult::Success
        } else {
            TransferResult::Failure
        }
    }

    fn withdraw(&mut self, amount: &f64) -> TransferResult {
        if let StrategyEvent::WithdrawSuccess(_amount) = self.strat.withdraw_cash(amount) {
            TransferResult::Success
        } else {
            TransferResult::Failure
        }
    }

    fn liquidate(&mut self, amount: &f64) -> TransferResult {
        if let StrategyEvent::WithdrawSuccess(_amount) =
            self.strat.withdraw_cash_with_liquidation(amount)
        {
            TransferResult::Success
        } else {
            TransferResult::Failure
        }
    }
}

#[derive(Clone, Debug)]
pub struct Gia<S: InvestmentStrategy> {
    strat: S,
}

impl<S: InvestmentStrategy> Gia<S> {
    pub fn zero(&mut self) {
        self.strat.zero();
    }

    pub fn get_capital_gains(&self, date: &i64, tax_year_start: &i64) -> CashValue {
        //To calculate capital gains we need the whole trade history for that symbol
        let all_trades: Vec<Trade> = self.strat.trades_between(&0, date);
        calculate_capital_gains(&all_trades, tax_year_start)
    }

    pub fn check(&mut self) {
        self.strat.check();
    }

    pub fn finish(&mut self) {
        self.strat.finish();
    }

    //broker
    pub fn get_dividends(&self, date: &i64, tax_year_start: &i64) -> CashValue {
        let all_dividends: Vec<DividendPayment> =
            self.strat.dividends_between(tax_year_start, date);
        let mut sum = 0.0;
        for divi in all_dividends {
            sum += *divi.value;
        }
        CashValue::from(sum)
    }

    pub fn liquidation_value(&self) -> CashValue {
        self.strat.get_liquidation_value()
    }

    pub fn rebalance(&mut self) {
        if *self.strat.get_liquidation_value() > 0.0 {
            self.strat.update();
        }
    }

    pub fn new_with_cash(strat: S, start_cash: &f64) -> Self {
        let mut s = Self::new(strat);
        s.strat.init(start_cash);
        s
    }

    pub fn new(strat: S) -> Self {
        Self { strat }
    }
}

impl<S: InvestmentStrategy> CanTransfer for Gia<S> {
    fn deposit(&mut self, amount: &f64) -> TransferResult {
        if let StrategyEvent::DepositSuccess(_amount) = self.strat.deposit_cash(amount) {
            TransferResult::Success
        } else {
            TransferResult::Failure
        }
    }

    fn withdraw(&mut self, amount: &f64) -> TransferResult {
        if let StrategyEvent::WithdrawSuccess(_amount) = self.strat.withdraw_cash(amount) {
            TransferResult::Success
        } else {
            TransferResult::Failure
        }
    }

    fn liquidate(&mut self, amount: &f64) -> TransferResult {
        if let StrategyEvent::WithdrawSuccess(_amount) =
            self.strat.withdraw_cash_with_liquidation(amount)
        {
            TransferResult::Success
        } else {
            TransferResult::Failure
        }
    }
}

//Returns (deposit amount, return to client)
//Need to split this for testing
fn sipp_deposit_logic(
    amount: &f64,
    current_year_contribution_threshold: &f64,
    lifetime_contribution_threshold: &f64,
    current_year_contributions: &f64,
    lifetime_contributions: &f64,
) -> (CashValue, CashValue) {
    let can_deposit_year = *current_year_contribution_threshold - *current_year_contributions;
    let can_deposit_life = *lifetime_contribution_threshold - *lifetime_contributions;

    if can_deposit_year <= 0.0 || can_deposit_life <= 0.0 {
        //Over at least one threshold, can't deposit at all
        (CashValue::from(0.0), CashValue::from(*amount))
    } else if amount < &can_deposit_year && amount < &can_deposit_life {
        //Under both thresholds, deposit full amount
        (CashValue::from(*amount), CashValue::from(0.0))
    } else {
        //Deposit would take us over at least one threshold
        //Find the lowest threshold, deposit as much as possible
        //under that threshold
        if can_deposit_year > can_deposit_life {
            (
                CashValue::from(can_deposit_life),
                CashValue::from(*amount - can_deposit_life),
            )
        } else {
            (
                CashValue::from(can_deposit_year),
                CashValue::from(*amount - can_deposit_year),
            )
        }
    }
}

//Tax year state is controlled from within the simulation.
#[derive(Clone, Debug)]
pub struct Sipp<S: InvestmentStrategy> {
    strat: S,
    lifetime_contributions: CashValue,
    current_tax_year_contributions: CashValue,
}

impl<S: InvestmentStrategy> Sipp<S> {
    pub fn zero(&mut self) {
        self.strat.zero();
    }

    pub fn liquidation_value(&self) -> CashValue {
        self.strat.get_liquidation_value()
    }

    pub fn rebalance(&mut self) {
        if *self.strat.get_liquidation_value() > 0.0 {
            self.strat.update();
        }
    }

    pub fn check(&mut self) {
        self.strat.check();
    }

    pub fn finish(&mut self) {
        self.strat.finish();
    }

    pub fn tax_year_end(&mut self) {
        self.current_tax_year_contributions = CashValue::from(0.0);
    }

    pub fn deposit_wrapper(&mut self, amount: &f64) -> (CashValue, CashValue) {
        let (deposit, returned) = sipp_deposit_logic(
            amount,
            &UKAccount::SippAnnualContributionThreshold.val(),
            &UKAccount::SippLifetimeContributionThreshold.val(),
            &self.current_tax_year_contributions,
            &self.lifetime_contributions,
        );
        self.deposit(&deposit);
        (deposit, returned)
    }

    pub fn new_with_cash(strat: S, lifetime_contributions: &f64, start_cash: &f64) -> Self {
        let mut s = Self::new(strat, CashValue::from(*lifetime_contributions));
        s.strat.init(start_cash);
        s
    }

    pub fn new(strat: S, lifetime_contributions: CashValue) -> Self {
        Self {
            strat,
            lifetime_contributions,
            current_tax_year_contributions: CashValue::default(),
        }
    }
}

impl<S: InvestmentStrategy> CanTransfer for Sipp<S> {
    fn deposit(&mut self, amount: &f64) -> TransferResult {
        if let StrategyEvent::DepositSuccess(_amount) = self.strat.deposit_cash(amount) {
            TransferResult::Success
        } else {
            TransferResult::Failure
        }
    }

    fn withdraw(&mut self, _amount: &f64) -> TransferResult {
        //Cannot withdraw directly from Sipp
        TransferResult::Failure
    }

    fn liquidate(&mut self, _amount: &f64) -> TransferResult {
        //Cannot withdraw directly from Sipp
        TransferResult::Failure
    }
}

#[derive(Clone, Debug)]
pub struct BankAcc {
    pub balance: CashValue,
}

impl BankAcc {
    pub fn zero(&mut self) {
        self.withdraw(&self.balance.clone());
    }
}

impl CanTransfer for BankAcc {
    fn withdraw(&mut self, amount: &f64) -> TransferResult {
        if amount > &self.balance {
            TransferResult::Failure
        } else {
            self.balance = CashValue::from(*self.balance - *amount);
            TransferResult::Success
        }
    }

    fn liquidate(&mut self, amount: &f64) -> TransferResult {
        self.withdraw(amount)
    }

    fn deposit(&mut self, amount: &f64) -> TransferResult {
        self.balance = CashValue::from(*self.balance + *amount);
        TransferResult::Success
    }
}

impl From<BankAcc> for CashValue {
    fn from(val: BankAcc) -> Self {
        val.balance
    }
}

impl Default for BankAcc {
    fn default() -> Self {
        Self::new()
    }
}

impl BankAcc {
    pub fn new() -> Self {
        Self {
            balance: CashValue::default(),
        }
    }
}

pub enum LoanEvent {
    PaymentSuccess(CashValue),
    PaymentFailure(CashValue),
    Completed,
}

struct AmortizingLoanLogic {
    pub balance: CashValue,
    rate: f64,
    amortization_payment_min: CashValue,
}

//Logic implies monthly payments
fn calculate_amortization_payment(balance: &f64, term_yrs: &u8) -> CashValue {
    let term_months = (term_yrs * 12) as f64;
    CashValue::from(*balance / term_months)
}

impl AmortizingLoanLogic {
    //Non-mutating, does not decrement balance
    fn payment_due(&self, amortization_payment: Option<CashValue>) -> CashValue {
        let interest = *self.balance * self.rate;
        //If amortization_payment is `Some` then the client is overpaying mortgage
        if let Some(overpay) = amortization_payment {
            //Check that overpay isn't less than minimum payment, if it is then we default to the
            //main logic
            if overpay > self.amortization_payment_min {
                //If the loan balance is less than the overpay then we pay the balance + interest
                if overpay < self.balance {
                    return CashValue::from(*self.balance + interest);
                } else {
                    return CashValue::from(*overpay + interest);
                }
            }
        }
        //If the loan balance is less than the amortization than we pay the balance + interest
        if self.balance < self.amortization_payment_min {
            return CashValue::from(*self.balance + interest);
        }
        CashValue::from(*self.amortization_payment_min + interest)
    }

    pub fn payment(
        &mut self,
        amortization_payment: Option<CashValue>,
        src: &mut impl CanTransfer,
    ) -> LoanEvent {
        if *self.balance == 0.0 {
            return LoanEvent::Completed;
        }

        let payment_due = self.payment_due(amortization_payment);
        if let TransferResult::Success = src.withdraw(&payment_due) {
            return LoanEvent::PaymentSuccess(payment_due);
        }
        LoanEvent::PaymentFailure(payment_due)
    }

    pub fn new(balance: &f64, rate: f64, term_yrs: u8) -> Self {
        let amortization_payment_min = calculate_amortization_payment(balance, &term_yrs);
        Self {
            balance: CashValue::from(*balance),
            rate,
            amortization_payment_min,
        }
    }
}

pub struct Mortgage<T: SimDataSource> {
    loan: AmortizingLoanLogic,
    payment_schedule: Schedule,
    //We assume that the fix period rolls through term
    fix_period: u8,
    current_fix_end_date: DateTime,
    clock: Clock,
    source: T,
}

impl<T: SimDataSource> Mortgage<T> {
    pub fn start(
        balance: &f64,
        rate: f64,
        start_date: &i64,
        initial_fix_in_yrs: u8,
        clock: Clock,
        source: T,
    ) -> Self {
        let start_offset: OffsetDateTime = DateTime::from(*start_date).into();
        //This isn't totally accurate but it should be very close, the inaccuracy on the final fix
        //should come out if we catch LoanEvent::Completed
        let fix_duration = Duration::weeks(initial_fix_in_yrs as i64 * 52);
        let current_fix_end_date: DateTime = start_offset
            .checked_add(fix_duration)
            .unwrap()
            .unix_timestamp()
            .into();

        let loan = AmortizingLoanLogic::new(balance, rate, initial_fix_in_yrs);
        let payment_schedule = Schedule::EveryMonth(25);
        Self {
            loan,
            payment_schedule,
            fix_period: initial_fix_in_yrs,
            current_fix_end_date,
            clock,
            source,
        }
    }

    //This automatically decrements the minimum payment, if the user supplies a larger amortization value
    //that is used instead. Interest is also paid automatically within the loan logic.
    pub fn pay(
        &mut self,
        amortization_payment: Option<CashValue>,
        src: &mut impl CanTransfer,
    ) -> Option<LoanEvent> {
        let curr_date = self.clock.borrow().now();
        if self.payment_schedule.check(&curr_date) {
            if curr_date > self.current_fix_end_date {
                //Need to reissue using new data
                if let Some(rate) = self.source.get_current_interest_rate() {
                    let mortgage_margin = rate + 0.04;
                    let remaining = &self.loan.balance;
                    self.loan =
                        AmortizingLoanLogic::new(remaining, mortgage_margin, self.fix_period);

                    let curr_offset_date: OffsetDateTime = curr_date.into();
                    let fix_duration = Duration::weeks(self.fix_period as i64 * 52);
                    let current_fix_end_date: DateTime = curr_offset_date
                        .checked_add(fix_duration)
                        .unwrap()
                        .unix_timestamp()
                        .into();
                    self.current_fix_end_date = current_fix_end_date;
                } else {
                    panic!("Missing data for rates, cannot move forward without data so panicking");
                }
            }
            Some(self.loan.payment(amortization_payment, src))
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {

    use alator::broker::{Trade, TradeType};
    use alator::clock::ClockBuilder;
    use alator::types::Frequency;
    use std::rc::Rc;

    use crate::input::{monthly_data_generator_static, HashMapSourceSimBuilder};

    use super::{calculate_capital_gains, isa_deposit_logic, sipp_deposit_logic};
    use super::{BankAcc, LoanEvent, Mortgage};

    #[test]
    fn test_that_isa_threshold() {
        //TODO: this should be tested with mocks
        let res = isa_deposit_logic(&100.0, &50.0, &0.0);
        assert!(*res.0 == 50.0 && *res.1 == 50.0);

        let res1 = isa_deposit_logic(&10.0, &50.0, &0.0);
        assert!(*res1.0 == 10.0 && *res1.1 == 0.0);

        let res2 = isa_deposit_logic(&10.0, &50.0, &40.0);
        assert!(*res2.0 == 10.0 && *res2.1 == 0.0);

        let res3 = isa_deposit_logic(&10.0, &50.0, &45.0);
        assert!(*res3.0 == 5.0 && *res3.1 == 5.0);
    }

    #[test]
    fn test_that_sipp_threshold() {
        //TODO: this should be tested with mocks
        let res = sipp_deposit_logic(&100.0, &50.0, &50.0, &0.0, &0.0);
        assert!(*res.0 == 50.0 && *res.1 == 50.0);

        let res1 = sipp_deposit_logic(&10.0, &50.0, &50.0, &0.0, &0.0);
        assert!(*res1.0 == 10.0 && *res1.1 == 0.0);

        let res2 = sipp_deposit_logic(&10.0, &50.0, &50.0, &40.0, &40.0);
        assert!(*res2.0 == 10.0 && *res2.1 == 0.0);

        let res3 = sipp_deposit_logic(&10.0, &50.0, &50.0, &45.0, &45.0);
        assert!(*res3.0 == 5.0 && *res3.1 == 5.0);

        let res4 = sipp_deposit_logic(&10.0, &50.0, &100.0, &45.0, &45.0);
        assert!(*res4.0 == 5.0 && *res4.1 == 5.0);

        let res5 = sipp_deposit_logic(&10.0, &100.0, &50.0, &45.0, &45.0);
        assert!(*res5.0 == 5.0 && *res5.1 == 5.0);
    }

    #[test]
    fn test_capital_gains_calculation_logic() {
        let t1 = Trade::new("ABC", 1000.0, 100.0, 1, TradeType::Buy);

        let t2 = Trade::new("ABC", 1100.0, 100.0, 10, TradeType::Sell);

        let trades = vec![t1, t2];
        let capital_gains = calculate_capital_gains(&trades, &0);
        assert!(*capital_gains == 100.0);

        let t1 = Trade::new("ABC", 1000.0, 100.0, 1, TradeType::Buy);

        let t2 = Trade::new("ABC", 1100.0, 100.0, 10, TradeType::Sell);

        let trades = vec![t1, t2];
        let capital_gains = calculate_capital_gains(&trades, &5.into());
        assert!(*capital_gains == 100.0);

        let t1 = Trade::new("ABC", 1000.0, 100.0, 1, TradeType::Buy);

        let t2 = Trade::new("ABC", 825.0, 75.0, 10, TradeType::Sell);

        let t3 = Trade::new("ABC", 275.0, 25.0, 10, TradeType::Sell);

        let trades = vec![t1, t2, t3];
        let capital_gains = calculate_capital_gains(&trades, &0.into());
        assert!(*capital_gains == 100.0);

        let t1 = Trade::new("ABC", 1000.0, 100.0, 1, TradeType::Buy);

        let t2 = Trade::new("ABC", 1000.0, 50.0, 10, TradeType::Buy);

        let t3 = Trade::new("ABC", 10.0, 150.0, 15, TradeType::Sell);

        let trades = vec![t1, t2, t3];
        let capital_gains = calculate_capital_gains(&trades, &0.into());
        assert!(*capital_gains > -1991.0 && *capital_gains < -1990.0);
    }

    #[test]
    fn test_that_mortgage_payment_reduces_balance() {
        let clock = ClockBuilder::with_length_in_days(1, 60)
            .with_frequency(&Frequency::Daily)
            .build();

        let rates = monthly_data_generator_static(0.02, Rc::clone(&clock));
        let source = HashMapSourceSimBuilder::start()
            .with_clock(Rc::clone(&clock))
            .with_rates(rates)
            .build();

        let rate = 0.05;
        let mut mortgage = Mortgage::start(&100_000.0, rate, &1, 1, Rc::clone(&clock), source);
        let mut test_acc = BankAcc {
            balance: 10_000.0.into(),
        };

        while clock.borrow().has_next() {
            clock.borrow_mut().tick();
            mortgage.pay(None, &mut test_acc);
        }

        println!("{:?}", test_acc.balance);
        assert!(*test_acc.balance != 20_000.0);
    }

    #[test]
    fn test_that_mortgage_payment_fails_with_insufficient_balance() {
        let clock = ClockBuilder::with_length_in_days(1, 60)
            .with_frequency(&Frequency::Daily)
            .build();

        let rates = monthly_data_generator_static(0.02, Rc::clone(&clock));
        let source = HashMapSourceSimBuilder::start()
            .with_clock(Rc::clone(&clock))
            .with_rates(rates)
            .build();

        let rate = 0.05;
        let mut mortgage = Mortgage::start(&1_000_000.0, rate, &1, 1, Rc::clone(&clock), source);
        let mut test_acc = BankAcc {
            balance: 1_000.0.into(),
        };

        while clock.borrow().has_next() {
            clock.borrow_mut().tick();
            if let Some(event) = mortgage.pay(None, &mut test_acc) {
                matches!(event, LoanEvent::PaymentFailure(_));
            }
        }
    }
}
