mod alator;
mod antevorta;

pub use self::alator::{alator_backtest, AlatorInput, AlatorResults, EodRawAlatorInput};
pub use self::antevorta::{
    antevorta_multiple, AntevortaInsufficientDataError, AntevortaPriceInput, AntevortaResults,
    EodRawAntevortaInput,
};
