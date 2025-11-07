use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::fmt;

/// API error response
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

/// Application error type
#[derive(Debug)]
pub enum AppError {
    /// Database error
    Database(String),

    /// Not found error
    NotFound(String),

    /// Validation error
    Validation(String),

    /// Authentication error
    Unauthorized(String),

    /// Forbidden error
    Forbidden(String),

    /// Internal server error
    Internal(String),

    /// Bad request
    BadRequest(String),

    /// Conflict error
    Conflict(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(msg) => write!(f, "Database error: {}", msg),
            Self::NotFound(msg) => write!(f, "Not found: {}", msg),
            Self::Validation(msg) => write!(f, "Validation error: {}", msg),
            Self::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
            Self::Forbidden(msg) => write!(f, "Forbidden: {}", msg),
            Self::Internal(msg) => write!(f, "Internal error: {}", msg),
            Self::BadRequest(msg) => write!(f, "Bad request: {}", msg),
            Self::Conflict(msg) => write!(f, "Conflict: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_type, message) = match self {
            Self::Database(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "database_error",
                msg,
            ),
            Self::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found", msg),
            Self::Validation(msg) => (StatusCode::BAD_REQUEST, "validation_error", msg),
            Self::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "unauthorized", msg),
            Self::Forbidden(msg) => (StatusCode::FORBIDDEN, "forbidden", msg),
            Self::Internal(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal_error",
                msg,
            ),
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request", msg),
            Self::Conflict(msg) => (StatusCode::CONFLICT, "conflict", msg),
        };

        let error_response = ErrorResponse {
            error: error_type.to_string(),
            message,
            details: None,
        };

        (status, Json(error_response)).into_response()
    }
}

// Conversion from anyhow::Error
impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        Self::Internal(err.to_string())
    }
}

// Conversion from StoreHaus errors
impl From<storehaus::errors::StoreHausError> for AppError {
    fn from(err: storehaus::errors::StoreHausError) -> Self {
        Self::Database(err.to_string())
    }
}

// Conversion from bcrypt errors
impl From<bcrypt::BcryptError> for AppError {
    fn from(err: bcrypt::BcryptError) -> Self {
        Self::Internal(format!("Password hashing error: {}", err))
    }
}

// Conversion from JWT errors
impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        Self::Unauthorized(format!("JWT error: {}", err))
    }
}