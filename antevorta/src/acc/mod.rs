use alator::types::CashValue;

pub trait CanTransfer {
    fn deposit(&mut self, amount: &CashValue) -> TransferResult;
    fn withdraw(&mut self, amount: &CashValue) -> TransferResult;
    fn liquidate(&mut self, amount: &CashValue) -> TransferResult;
}

pub struct Transfer;

impl Transfer {
    //Only call from sources that implement liquidate
    pub fn force(
        source: &mut impl CanTransfer,
        dest: &mut impl CanTransfer,
        amount: &CashValue,
    ) -> TransferResult {
        let res = source.liquidate(amount);
        match res {
            TransferResult::Success => {
                dest.deposit(amount);
                TransferResult::Success
            }
            TransferResult::Failure => TransferResult::Failure,
        }
    }

    pub fn from(
        source: &mut impl CanTransfer,
        dest: &mut impl CanTransfer,
        amount: &CashValue,
    ) -> TransferResult {
        let res = source.withdraw(amount);
        match res {
            TransferResult::Success => {
                dest.deposit(amount);
                TransferResult::Success
            }
            TransferResult::Failure => TransferResult::Failure,
        }
    }

    pub fn to(dest: &mut impl CanTransfer, amount: &CashValue) -> TransferResult {
        dest.deposit(amount);
        TransferResult::Success
    }
}

pub enum TransferResult {
    Success,
    Failure,
}
