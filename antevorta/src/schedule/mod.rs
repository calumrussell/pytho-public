use time::{Duration, OffsetDateTime, Weekday};

use alator::types::DateTime;

type Day = i32;
type Month = i32;
type Year = i32;

#[derive(Clone, Debug)]
pub enum Schedule {
    EveryFriday,
    SpecificDate(Day, Month, Year),
    SpecificEpoch(DateTime),
    EveryYear(Day, Month),
    EveryMonth(Day),
    StartOfMonth,
    EveryDay,
}

impl Schedule {
    pub fn last_period(&self, date: &i64) -> Option<DateTime> {
        let epoch: i64 = *date;
        let real_date = OffsetDateTime::from_unix_timestamp(epoch);
        match real_date {
            Ok(d) => match self {
                Schedule::EveryFriday => {
                    let last_week = d.checked_sub(Duration::weeks(1)).unwrap();
                    Some(DateTime::from(last_week.unix_timestamp()))
                }
                Schedule::SpecificDate(_, _, _) => None,
                Schedule::SpecificEpoch(_) => None,
                Schedule::EveryYear(_, _) => {
                    let last_year = d.replace_year(d.year() - 1).unwrap();
                    Some(DateTime::from(last_year.unix_timestamp()))
                }
                Schedule::EveryMonth(_) | Schedule::StartOfMonth => {
                    let last_month = d.replace_month(d.month().previous()).unwrap();
                    Some(DateTime::from(last_month.unix_timestamp()))
                }
                Schedule::EveryDay => None,
            },
            _ => None,
        }
    }

    pub fn check(&self, epoch_date: &i64) -> bool {
        let real_date = OffsetDateTime::from_unix_timestamp(*epoch_date);
        match real_date {
            Ok(d) => match self {
                Schedule::EveryFriday => d.weekday() == Weekday::Friday,
                Schedule::SpecificDate(day, month, year) => {
                    d.year() == *year && d.day() == *day as u8 && d.month() as u8 == *month as u8
                }
                Schedule::SpecificEpoch(epoch) => i64::from(epoch.clone()) == *epoch_date,
                Schedule::EveryYear(day, month) => {
                    d.day() == *day as u8 && d.month() as u8 == *month as u8
                }
                Schedule::EveryMonth(day) => d.day() == *day as u8,
                Schedule::EveryDay => true,
                Schedule::StartOfMonth => d.date().day() == 1,
            },
            _ => false,
        }
    }
}

pub trait Schedulable {
    fn check(&self, date: &DateTime) -> bool;
}
