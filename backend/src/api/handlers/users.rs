use axum::{extract::{Path, State}, Extension, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use storehaus::prelude::*;
use tracing::warn;
use uuid::Uuid;

use crate::api::middleware::AuthUser;
use crate::errors::{ApiResult, AppError};
use crate::models::{Conversation, ConversationStatus, Message, User, UserResponse, UserSettings};
use crate::websocket::{WebSocketEvent, WebSocketManager};

/// GET /api/users
pub async fn get_users(
    Extension(_auth_user): Extension<AuthUser>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<Vec<UserResponse>>> {
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let users = user_store
        .find(QueryBuilder::new().order_by("__created_at__", SortOrder::Asc))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let results: Vec<UserResponse> = users
        .into_iter()
        .map(UserResponse::from)
        .collect();

    Ok(Json(results))
}

/// GET /api/users/me
pub async fn get_current_user(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<UserResponse>> {
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let user = user_store
        .get_by_id(&auth_user.user_id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(Json(UserResponse::from(user)))
}

/// User status update request
#[derive(Debug, Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String, // "online", "away", "offline"
}

/// PATCH /api/users/me/status
pub async fn update_user_status(
    Extension(auth_user): Extension<AuthUser>,
    State(ws_manager): State<Arc<WebSocketManager>>,
    Json(req): Json<UpdateStatusRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    // Validate status
    if !["online", "away", "offline"].contains(&req.status.as_str()) {
        return Err(AppError::BadRequest(
            "Invalid status. Must be 'online', 'away', or 'offline'".to_string(),
        ));
    }

    // Broadcast user status event
    let ws_event = if req.status == "online" {
        WebSocketEvent::UserOnline {
            user_id: auth_user.user_id,
            user_name: auth_user.email.clone(),
        }
    } else {
        WebSocketEvent::UserOffline {
            user_id: auth_user.user_id,
        }
    };

    if let Err(e) = ws_manager.broadcast_event(ws_event).await {
        warn!("Failed to broadcast user status event: {}", e);
    }

    Ok(Json(json!({
        "status": req.status,
        "message": "Status updated successfully"
    })))
}

/// User statistics response
#[derive(Debug, Serialize)]
pub struct UserStatsResponse {
    pub user_id: Uuid,
    pub total_conversations: i64,
    pub active_conversations: i64,
    pub closed_conversations: i64,
    pub total_messages_sent: i64,
    pub average_response_time_seconds: Option<f64>,
}

/// GET /api/users/stats
/// Get statistics for the current user
pub async fn get_user_stats(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<UserStatsResponse>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get conversations assigned to this user
    let query = QueryBuilder::new()
        .filter(QueryFilter::eq("user_id", json!(auth_user.user_id)));

    let conversations = conversation_store
        .find(query)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let total_conversations = conversations.len() as i64;
    let active_conversations = conversations
        .iter()
        .filter(|c| c.status == ConversationStatus::Active || c.status == ConversationStatus::Waiting)
        .count() as i64;
    let closed_conversations = conversations
        .iter()
        .filter(|c| c.status == ConversationStatus::Closed)
        .count() as i64;

    // Count messages sent by this user in their conversations
    let mut total_messages_sent = 0i64;
    for conversation in &conversations {
        let msg_query = QueryBuilder::new()
            .filter(QueryFilter::eq("conversation_id", json!(conversation.id)))
            .filter(QueryFilter::eq("from_user", json!(true)));

        let messages = message_store
            .find(msg_query)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        total_messages_sent += messages.len() as i64;
    }

    Ok(Json(UserStatsResponse {
        user_id: auth_user.user_id,
        total_conversations,
        active_conversations,
        closed_conversations,
        total_messages_sent,
        average_response_time_seconds: None, // TODO: implement with real timestamps
    }))
}

/// GET /api/users/:id/stats
/// Get statistics for a specific user (admin only)
pub async fn get_user_stats_by_id(
    Extension(_auth_user): Extension<AuthUser>,
    Path(user_id): Path<Uuid>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<UserStatsResponse>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get conversations assigned to this user
    let query = QueryBuilder::new()
        .filter(QueryFilter::eq("user_id", json!(user_id)));

    let conversations = conversation_store
        .find(query)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let total_conversations = conversations.len() as i64;
    let active_conversations = conversations
        .iter()
        .filter(|c| c.status == ConversationStatus::Active || c.status == ConversationStatus::Waiting)
        .count() as i64;
    let closed_conversations = conversations
        .iter()
        .filter(|c| c.status == ConversationStatus::Closed)
        .count() as i64;

    // Count messages sent by this user
    let mut total_messages_sent = 0i64;
    for conversation in &conversations {
        let msg_query = QueryBuilder::new()
            .filter(QueryFilter::eq("conversation_id", json!(conversation.id)))
            .filter(QueryFilter::eq("from_user", json!(true)));

        let messages = message_store
            .find(msg_query)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        total_messages_sent += messages.len() as i64;
    }

    Ok(Json(UserStatsResponse {
        user_id,
        total_conversations,
        active_conversations,
        closed_conversations,
        total_messages_sent,
        average_response_time_seconds: None,
    }))
}

/// Update user profile request
#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
}

/// PATCH /api/users/me
/// Update current user profile
pub async fn update_user_profile(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<Arc<StoreHaus>>,
    Json(req): Json<UpdateUserRequest>,
) -> ApiResult<Json<UserResponse>> {
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get current user
    let mut user = user_store
        .get_by_id(&auth_user.user_id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Update fields
    if let Some(name) = req.name {
        user.name = name;
    }

    // Save changes
    user_store
        .update(&user.id, user.clone(), None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(UserResponse::from(user)))
}

/// Change password request
#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

/// POST /api/users/me/password
/// Change user password
pub async fn change_user_password(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<Arc<StoreHaus>>,
    Json(req): Json<ChangePasswordRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get current user
    let mut user = user_store
        .get_by_id(&auth_user.user_id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Verify current password
    let is_valid = bcrypt::verify(&req.current_password, &user.password_hash)
        .map_err(|_| AppError::Internal("Password verification failed".to_string()))?;

    if !is_valid {
        return Err(AppError::Unauthorized("Current password is incorrect".to_string()));
    }

    // Validate new password
    if req.new_password.len() < 6 {
        return Err(AppError::BadRequest(
            "New password must be at least 6 characters".to_string(),
        ));
    }

    // Hash new password
    let new_hash = bcrypt::hash(&req.new_password, bcrypt::DEFAULT_COST)
        .map_err(|_| AppError::Internal("Failed to hash password".to_string()))?;

    // Update password
    user.password_hash = new_hash;

    // Save changes
    let user_id = user.id;
    user_store
        .update(&user_id, user, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(json!({
        "message": "Password changed successfully"
    })))
}

/// Update settings request
#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub theme: Option<String>,
    pub language: Option<String>,
    pub notifications_enabled: Option<bool>,
    pub notification_sound_enabled: Option<bool>,
    pub telegram_notifications_user_id: Option<String>,
}

/// PATCH /api/users/me/settings
/// Update user settings
pub async fn update_user_settings(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<Arc<StoreHaus>>,
    Json(req): Json<UpdateSettingsRequest>,
) -> ApiResult<Json<UserResponse>> {
    tracing::info!("Updating settings for user {}: theme={:?}, language={:?}, notifications={:?}, sound={:?}",
        auth_user.user_id, req.theme, req.language, req.notifications_enabled, req.notification_sound_enabled);

    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get current user
    let mut user = user_store
        .get_by_id(&auth_user.user_id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Parse existing settings or create new
    let mut settings: UserSettings = user.settings
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    tracing::info!("Current settings before update: theme={}, language={}", settings.theme, settings.language);

    // Update settings
    if let Some(theme) = req.theme {
        if !["light", "dark"].contains(&theme.as_str()) {
            return Err(AppError::BadRequest(
                "Invalid theme. Must be 'light' or 'dark'".to_string(),
            ));
        }
        settings.theme = theme;
    }

    if let Some(language) = req.language {
        if !["ru", "en"].contains(&language.as_str()) {
            return Err(AppError::BadRequest(
                "Invalid language. Must be 'ru' or 'en'".to_string(),
            ));
        }
        tracing::info!("Updating language to: {}", language);
        settings.language = language;
    }

    if let Some(notifications_enabled) = req.notifications_enabled {
        settings.notifications_enabled = notifications_enabled;
    }

    if let Some(notification_sound_enabled) = req.notification_sound_enabled {
        settings.notification_sound_enabled = notification_sound_enabled;
    }

    if let Some(telegram_user_id) = req.telegram_notifications_user_id {
        if telegram_user_id.is_empty() {
            settings.telegram_notifications_user_id = None;
        } else {
            settings.telegram_notifications_user_id = Some(telegram_user_id);
        }
    }

    tracing::info!("Settings after update: theme={}, language={}", settings.theme, settings.language);

    // Convert settings to JSON string
    let settings_string = serde_json::to_string(&settings)
        .map_err(|e| AppError::Internal(format!("Failed to serialize settings: {}", e)))?;

    tracing::info!("Serialized settings: {}", settings_string);

    user.settings = Some(settings_string);

    // Save changes
    let user_id = user.id;
    user_store
        .update(&user_id, user.clone(), None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    tracing::info!("Settings saved successfully for user {}", auth_user.user_id);

    Ok(Json(UserResponse::from(user)))
}