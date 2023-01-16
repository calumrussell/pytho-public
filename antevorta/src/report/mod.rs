use alator::types::CashValue;

use crate::{schedule::Schedule, strat::InvestmentStrategy};

pub trait FlowReporter {
    fn paid_gross_income(&mut self, income: &f64);
    fn paid_net_income(&mut self, income: &f64);
    fn paid_tax(&mut self, tax: &f64);
    fn paid_expense(&mut self, expense: &f64);
    fn reset(&mut self);
}

#[derive(Clone, Debug)]
pub struct UKAnnualReport {
    pub isa: CashValue,
    pub sipp: CashValue,
    pub gia: CashValue,
    pub cash: CashValue,
    pub gross_income: CashValue,
    pub net_income: CashValue,
    pub expense: CashValue,
    pub tax_paid: CashValue,
}

//This should run on the same cycle as the tax year. All the state about the stacks is taken from
//an instance of simulation rather than held on this struct. All the state from flows is held on
//this struct and updated through time. The client must reset annually.
//
//Client must call reset. This is to ensure that check doesn't mutate.
#[derive(Clone, Debug)]
pub struct DefaultUKReporter {
    schedule: Schedule,
    gross_income_sum: CashValue,
    net_income_sum: CashValue,
    expense_sum: CashValue,
    tax_paid_sum: CashValue,
}

impl DefaultUKReporter {
    pub fn new(schedule: Schedule) -> Self {
        Self {
            schedule,
            gross_income_sum: 0.0.into(),
            net_income_sum: 0.0.into(),
            expense_sum: 0.0.into(),
            tax_paid_sum: 0.0.into(),
        }
    }

    pub fn check<S: InvestmentStrategy>(&self, isa: &f64, gia: &f64, sipp: &f64, cash: &f64, curr_date: &i64) -> Option<UKAnnualReport> {
        if self.schedule.check(curr_date) {
            let report = UKAnnualReport {
                isa: isa.clone().into(),
                gia: gia.clone().into(),
                sipp: sipp.clone().into(),
                cash: cash.clone().into(),
                gross_income: self.gross_income_sum.clone(),
                net_income: self.net_income_sum.clone(),
                expense: self.expense_sum.clone(),
                tax_paid: self.tax_paid_sum.clone(),
            };

            return Some(report);
        }
        None
    }
}

impl FlowReporter for DefaultUKReporter {
    fn paid_tax(&mut self, tax: &f64) {
        self.tax_paid_sum = CashValue::from(*self.tax_paid_sum + tax);
    }
    
    fn paid_expense(&mut self, expense: &f64) {
        self.expense_sum = CashValue::from(*self.expense_sum + expense);
    }

    fn paid_gross_income(&mut self, income: &f64) {
        self.gross_income_sum = CashValue::from(*self.gross_income_sum + income);
    }

    fn paid_net_income(&mut self, income: &f64) {
        self.net_income_sum = CashValue::from(*self.net_income_sum + income);
    }

    fn reset(&mut self) {
        self.tax_paid_sum = 0.0.into();
        self.gross_income_sum = 0.0.into();
        self.net_income_sum = 0.0.into();
        self.expense_sum = 0.0.into();
    }
}
