// Error handling module

mod api_error;

pub use api_error::{AppError, ErrorResponse};

/// Result type alias for API handlers
pub type ApiResult<T> = Result<T, AppError>;