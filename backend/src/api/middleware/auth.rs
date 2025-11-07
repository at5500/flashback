use axum::{
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use crate::config::AppConfig;
use crate::errors::AppError;
use crate::utils;

/// Auth middleware extension
#[derive(Clone, Debug)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
}

/// JWT authentication middleware
pub async fn auth_middleware(
    State(config): State<AppConfig>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    // Extract Authorization header
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing authorization header".to_string()))?;

    // Extract token (Bearer <token>)
    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::Unauthorized("Invalid authorization format".to_string()))?;

    // Verify token
    let claims = utils::verify_token(token, &config.jwt_secret)?;

    // Add auth user to request extensions
    let auth_user = AuthUser {
        user_id: claims.user_id()?,
        email: claims.email,
    };

    request.extensions_mut().insert(auth_user);

    Ok(next.run(request).await)
}
