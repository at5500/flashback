use axum::{extract::State, Extension, Json};
use bcrypt::verify;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use storehaus::prelude::*;

use crate::api::middleware::AuthUser;
use crate::config::AppConfig;
use crate::errors::{ApiResult, AppError};
use crate::models::{User, UserResponse};
use crate::utils;

/// Login request
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// Login response
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserResponse,
}

/// POST /api/auth/login
pub async fn login(
    State(config): State<AppConfig>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
    Json(req): Json<LoginRequest>,
) -> ApiResult<Json<LoginResponse>> {
    // Find user by email
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let query = QueryBuilder::new()
        .filter(QueryFilter::eq("email", json!(req.email)));

    let user = user_store
        .find_one(query)
        .await
        .map_err(|e| {
            tracing::error!("Database error finding user: {}", e);
            AppError::Unauthorized("Invalid email or password".to_string())
        })?
        .ok_or_else(|| {
            AppError::Unauthorized("Invalid email or password".to_string())
        })?;

    // Check if user has user access (is_operator OR is_admin)
    if !user.has_operator_access() {
        tracing::warn!("User {} does not have operator access", user.email);
        return Err(AppError::Forbidden(
            "You don't have permission to access this system".to_string(),
        ));
    }

    // Check if user is active
    if !user.is_active {
        tracing::warn!("User {} is not active", user.email);
        return Err(AppError::Forbidden(
            "Your account is disabled".to_string(),
        ));
    }

    // Verify password
    let valid = verify(&req.password, &user.password_hash)
        .map_err(|e| {
            tracing::error!("Bcrypt verify error: {}", e);
            AppError::Internal(e.to_string())
        })?;

    if !valid {
        return Err(AppError::Unauthorized(
            "Invalid email or password".to_string(),
        ));
    }

    // Generate JWT token
    let token = utils::generate_token(
        user.id,
        user.email.clone(),
        &config.jwt_secret,
        config.jwt_expiration,
    )?;

    // Update last seen
    let mut updated_user = user.clone();
    updated_user.last_seen_at = Some(Utc::now());

    user_store
        .update(&user.id, updated_user, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(LoginResponse {
        token,
        user: user.into(),
    }))
}

/// GET /api/auth/me
pub async fn get_current_user(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<UserResponse>> {
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let user = user_store
        .get_by_id(&auth_user.user_id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(Json(user.into()))
}