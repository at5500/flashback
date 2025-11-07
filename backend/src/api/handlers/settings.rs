use axum::{extract::State, Extension, Json};
use serde_json::json;
use std::sync::Arc;
use storehaus::prelude::*;

use crate::api::middleware::AuthUser;
use crate::errors::{ApiResult, AppError};
use crate::models::{Setting, SettingsResponse, UpdateSettingsRequest, User};
use crate::telegram::{BotManager, BotStatus};

/// GET /api/admin/settings - Get system settings (admin only)
pub async fn get_settings(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<SettingsResponse>> {
    // Check if user is admin
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let user = user_store
        .get_by_id(&auth_user.user_id)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or_else(|| AppError::Unauthorized("User not found".to_string()))?;

    if !user.is_admin {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    // Get settings
    let settings_store = storehaus
        .get_store::<GenericStore<Setting>>("settings")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get telegram bot token
    let query = QueryBuilder::new()
        .filter(QueryFilter::eq("id", json!(Setting::TELEGRAM_BOT_TOKEN)));

    let bot_token = settings_store
        .find_one(query)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .map(|setting| setting.value);

    Ok(Json(SettingsResponse::from_bot_token(bot_token)))
}

/// PUT /api/admin/settings - Update system settings (admin only)
pub async fn update_settings(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<Arc<StoreHaus>>,
    State(bot_manager): State<Arc<BotManager>>,
    Json(req): Json<UpdateSettingsRequest>,
) -> ApiResult<Json<SettingsResponse>> {
    tracing::info!("[SETTINGS] Updating system settings (requested by admin user {})", auth_user.user_id);

    // Check if user is admin
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let user = user_store
        .get_by_id(&auth_user.user_id)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or_else(|| AppError::Unauthorized("User not found".to_string()))?;

    if !user.is_admin {
        return Err(AppError::Forbidden("Admin access required".to_string()));
    }

    let settings_store = storehaus
        .get_store::<GenericStore<Setting>>("settings")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Update telegram bot token
    if let Some(token) = &req.telegram_bot_token {
        let query = QueryBuilder::new()
            .filter(QueryFilter::eq("id", json!(Setting::TELEGRAM_BOT_TOKEN)));

        let existing = settings_store
            .find_one(query)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if let Some(mut setting) = existing {
            // Update existing setting using update_where
            setting.value = token.clone();
            let query = QueryBuilder::new()
                .filter(QueryFilter::eq("id", json!(Setting::TELEGRAM_BOT_TOKEN)));

            settings_store
                .update_where(query, setting)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            tracing::info!("[SETTINGS] Updated telegram bot token");
        } else {
            // Create new setting
            let setting = Setting {
                id: Setting::TELEGRAM_BOT_TOKEN.to_string(),
                value: token.clone(),
                ..Default::default()
            };

            settings_store
                .create(setting, None)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            tracing::info!("[SETTINGS] Created telegram bot token setting");
        }

        // Restart bot with new token in background
        let bot_manager_clone = bot_manager.clone();
        let token_clone = token.clone();
        tokio::spawn(async move {
            match bot_manager_clone.restart(token_clone).await {
                Ok(_) => {
                    tracing::info!("[SETTINGS] Bot restarted successfully");
                }
                Err(e) => {
                    tracing::error!("[SETTINGS] Failed to restart bot: {}", e);
                }
            }
        });

        tracing::info!("[SETTINGS] Bot restart initiated in background");
    }

    // Return updated settings
    Ok(Json(SettingsResponse::from_bot_token(req.telegram_bot_token)))
}

/// GET /api/bot/status - Get bot connection status
pub async fn get_bot_status(
    State(bot_manager): State<Arc<BotManager>>,
) -> ApiResult<Json<serde_json::Value>> {
    let status = bot_manager.status().await;

    let status_str = match status {
        BotStatus::Disconnected => "disconnected",
        BotStatus::Connecting => "connecting",
        BotStatus::Connected => "connected",
        BotStatus::Error => "error",
    };

    Ok(Json(json!({
        "status": status_str
    })))
}