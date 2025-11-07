use axum::{
    body::Body,
    extract::{Path, State},
    http::{Response, StatusCode},
};
use reqwest;
use std::sync::Arc;
use storehaus::prelude::*;
use tracing::{error, info};

use crate::errors::{ApiResult, AppError};
use crate::models::TelegramUser;

/// GET /api/telegram-photo/:user_id
/// Proxy endpoint to fetch Telegram user profile photo
pub async fn get_telegram_photo(
    Path(user_id): Path<i64>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Response<Body>> {
    info!("Fetching photo for user {}", user_id);

    // Get user from database
    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let telegram_user = telegram_user_store
        .get_by_id(&user_id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Check if user has photo URL
    let photo_url = telegram_user
        .photo_url
        .ok_or_else(|| AppError::NotFound("User has no profile photo".to_string()))?;

    info!("Downloading photo from: {}", photo_url);

    // Fetch photo from Telegram
    let client = reqwest::Client::new();
    let response = client
        .get(&photo_url)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to fetch photo from Telegram: {}", e);
            AppError::Internal(format!("Failed to fetch photo: {}", e))
        })?;

    if !response.status().is_success() {
        error!("Telegram API returned error: {}", response.status());
        return Err(AppError::Internal(
            "Failed to fetch photo from Telegram".to_string(),
        ));
    }

    // Get content type
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    // Get image bytes
    let bytes = response.bytes().await.map_err(|e| {
        error!("Failed to read photo bytes: {}", e);
        AppError::Internal(format!("Failed to read photo: {}", e))
    })?;

    info!(
        "Successfully fetched photo for user {}, size: {} bytes",
        user_id,
        bytes.len()
    );

    // Return image
    Response::builder()
        .status(StatusCode::OK)
        .header("content-type", content_type)
        .header("cache-control", "public, max-age=3600") // Cache for 1 hour
        .body(Body::from(bytes))
        .map_err(|e| AppError::Internal(format!("Failed to build response: {}", e)))
}