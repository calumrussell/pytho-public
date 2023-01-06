mod alator;
mod antevorta;

pub use self::alator::{alator_backtest, AlatorInput, AlatorResults};
pub use self::antevorta::{
    antevorta_multiple, AntevortaInsufficientDataError, AntevortaMultipleInput,
    AntevortaPriceInput, AntevortaResults,
};
