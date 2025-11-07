use axum::{extract::{Path, Query, State}, Extension, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use storehaus::prelude::*;
use tracing::{info, warn, error};
use uuid::Uuid;

use crate::api::middleware::AuthUser;
use crate::errors::{ApiResult, AppError};
use crate::models::{Conversation, ConversationStatus, TelegramUser, User};
use crate::websocket::{WebSocketEvent, WebSocketManager};

/// Conversation list query parameters
#[derive(Debug, Deserialize)]
pub struct ConversationListQuery {
    pub status: Option<String>,
    pub user_id: Option<Uuid>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Conversation with telegram user info
#[derive(Debug, Clone, Serialize)]
pub struct ConversationResponse {
    pub id: Uuid,
    pub telegram_user: TelegramUser,
    pub user_id: Option<Uuid>,
    pub status: String,
    pub last_message_at: Option<DateTime<Utc>>,
    pub unread_count: i32,
    pub created_at: DateTime<Utc>,
}

/// Response for conversation list
#[derive(Debug, Serialize)]
pub struct ConversationListResponse {
    pub conversations: Vec<ConversationResponse>,
    pub total: usize,
}

/// GET /api/conversations
pub async fn get_conversations(
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ConversationListQuery>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<ConversationListResponse>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let system_user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get current user to check admin status
    let current_user = system_user_store
        .get_by_id(&auth_user.user_id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Build query
    let mut query_builder = QueryBuilder::new()
        .order_by("last_message_at", SortOrder::Desc);

    // Handle status filter:
    // - If status is explicitly provided, filter by that status
    // - If status is NOT provided, exclude closed conversations by default (show waiting + active)
    if let Some(status) = query.status {
        query_builder = query_builder.filter(QueryFilter::eq("status", json!(status)));
    } else {
        // When no status filter is provided, exclude closed conversations
        query_builder = query_builder.filter(QueryFilter::ne("status", json!(ConversationStatus::Closed.as_str())));
    }

    // Apply user_id filter based on permissions:
    // - If user_id is explicitly provided in query, use it
    // - If user_id is NOT provided and user is NOT admin, filter by current user's ID
    // - If user_id is NOT provided and user IS admin, show all conversations
    if let Some(user_id) = query.user_id {
        query_builder = query_builder.filter(QueryFilter::eq("user_id", json!(user_id)));
    } else if !current_user.is_admin {
        // Non-admin users can only see their own conversations
        query_builder = query_builder.filter(QueryFilter::eq("user_id", json!(auth_user.user_id)));
    }
    // Admin users with no user_id filter see ALL conversations

    // Don't apply limit/offset when searching, as we need to filter results after joining with users
    if query.search.is_none() {
        if let Some(limit) = query.limit {
            query_builder = query_builder.limit(limit);
        }

        if let Some(offset) = query.offset {
            query_builder = query_builder.offset(offset);
        }
    }

    // Get conversations
    let conversations = conversation_store
        .find(query_builder)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Get user info for each conversation
    let mut results = Vec::new();
    for conv in conversations {
        let telegram_user = telegram_user_store
            .get_by_id(&conv.telegram_user_id)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?
            .ok_or_else(|| AppError::NotFound("Telegram user not found".to_string()))?;

        // Apply search filter if provided
        if let Some(ref search_query) = query.search {
            let search_lower = search_query.to_lowercase();
            let matches = telegram_user.first_name.to_lowercase().contains(&search_lower)
                || telegram_user.last_name.as_ref().map(|l| l.to_lowercase().contains(&search_lower)).unwrap_or(false)
                || telegram_user.username.as_ref().map(|u| u.to_lowercase().contains(&search_lower)).unwrap_or(false);

            if !matches {
                continue; // Skip this conversation if it doesn't match search
            }
        }

        results.push(ConversationResponse {
            id: conv.id,
            telegram_user,
            user_id: conv.user_id,
            status: conv.status.to_string(),
            last_message_at: conv.last_message_at,
            unread_count: conv.unread_count,
            created_at: conv.__created_at__,
        });
    }

    // Store total before applying limit/offset
    let total = results.len();

    // Apply limit/offset after filtering when search is present
    if query.search.is_some() {
        let offset = query.offset.unwrap_or(0) as usize;
        let limit = query.limit.unwrap_or(20) as usize;

        let end = (offset + limit).min(total);

        results = if offset < total {
            results[offset..end].to_vec()
        } else {
            vec![]
        };
    }

    Ok(Json(ConversationListResponse {
        conversations: results,
        total,
    }))
}

/// GET /api/conversations/:id
pub async fn get_conversation(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<ConversationResponse>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let conv = conversation_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Conversation not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;

    let telegram_user = telegram_user_store
        .get_by_id(&conv.telegram_user_id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Telegram user not found".to_string()))?;

    Ok(Json(ConversationResponse {
        id: conv.id,
        telegram_user,
        user_id: conv.user_id,
        status: conv.status.to_string(),
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count,
        created_at: conv.__created_at__,
    }))
}

/// PATCH /api/conversations/:id/assign
#[derive(Debug, Deserialize)]
pub struct AssignRequest {
    pub user_id: Uuid,
}

pub async fn assign_conversation(
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<Arc<StoreHaus>>,
    State(ws_manager): State<Arc<WebSocketManager>>,
    Json(req): Json<AssignRequest>,
) -> ApiResult<Json<ConversationResponse>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get current conversation
    let mut conv = conversation_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Conversation not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;

    // Update conversation
    conv.user_id = Some(req.user_id);
    conv.status = ConversationStatus::Active;

    let conv = conversation_store
        .update(&id, conv, Some(vec!["assigned".to_string()]))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let telegram_user = telegram_user_store
        .get_by_id(&conv.telegram_user_id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Telegram user not found".to_string()))?;

    // Broadcast ConversationAssigned event
    let ws_event = WebSocketEvent::ConversationAssigned {
        conversation_id: conv.id,
        user_id: req.user_id,
        user_name: auth_user.email.clone(),
    };

    if let Err(e) = ws_manager.broadcast_event(ws_event).await {
        warn!("Failed to broadcast ConversationAssigned event: {}", e);
    }

    Ok(Json(ConversationResponse {
        id: conv.id,
        telegram_user,
        user_id: conv.user_id,
        status: conv.status.to_string(),
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count,
        created_at: conv.__created_at__,
    }))
}

/// PATCH /api/conversations/:id/close
pub async fn close_conversation(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<Arc<StoreHaus>>,
    State(ws_manager): State<Arc<WebSocketManager>>,
) -> ApiResult<Json<ConversationResponse>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get current conversation
    let mut conv = conversation_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Conversation not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;

    // Update status
    conv.status = ConversationStatus::Closed;

    let conv = conversation_store
        .update(&id, conv, Some(vec!["closed".to_string()]))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let telegram_user = telegram_user_store
        .get_by_id(&conv.telegram_user_id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Telegram user not found".to_string()))?;

    // Broadcast ConversationClosed event
    let ws_event = WebSocketEvent::ConversationClosed {
        conversation_id: conv.id,
    };

    if let Err(e) = ws_manager.broadcast_event(ws_event).await {
        warn!("Failed to broadcast ConversationClosed event: {}", e);
    }

    Ok(Json(ConversationResponse {
        id: conv.id,
        telegram_user,
        user_id: conv.user_id,
        status: conv.status.to_string(),
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count,
        created_at: conv.__created_at__,
    }))
}

/// PATCH /api/conversations/:id/status
#[derive(Debug, Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
}

pub async fn update_conversation_status(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<Arc<StoreHaus>>,
    State(ws_manager): State<Arc<WebSocketManager>>,
    Json(req): Json<UpdateStatusRequest>,
) -> ApiResult<Json<ConversationResponse>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Validate and parse status
    let new_status = match req.status.as_str() {
        "waiting" => ConversationStatus::Waiting,
        "active" => ConversationStatus::Active,
        "closed" => ConversationStatus::Closed,
        _ => {
            return Err(AppError::BadRequest(
                "Invalid status. Must be 'waiting', 'active', or 'closed'".to_string(),
            ));
        }
    };

    // Get current conversation
    let mut conv = conversation_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Conversation not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;

    // Update status
    conv.status = new_status;

    let conv = conversation_store
        .update(&id, conv, Some(vec!["status_updated".to_string()]))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let telegram_user = telegram_user_store
        .get_by_id(&conv.telegram_user_id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Telegram user not found".to_string()))?;

    // Broadcast status change event
    let ws_event = if req.status == "closed" {
        WebSocketEvent::ConversationClosed {
            conversation_id: conv.id,
        }
    } else {
        WebSocketEvent::ConversationStatusChanged {
            conversation_id: conv.id,
            status: req.status.clone(),
            user_id: conv.user_id,
        }
    };

    if let Err(e) = ws_manager.broadcast_event(ws_event).await {
        warn!("Failed to broadcast status change event: {}", e);
    }

    Ok(Json(ConversationResponse {
        id: conv.id,
        telegram_user,
        user_id: conv.user_id,
        status: conv.status.to_string(),
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count,
        created_at: conv.__created_at__,
    }))
}

/// PATCH /api/conversations/:id/mark-read
pub async fn mark_conversation_read(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<ConversationResponse>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get current conversation
    let mut conv = conversation_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Conversation not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;

    // Reset unread count
    conv.unread_count = 0;

    let conv = conversation_store
        .update(&id, conv, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let telegram_user = telegram_user_store
        .get_by_id(&conv.telegram_user_id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Telegram user not found".to_string()))?;

    Ok(Json(ConversationResponse {
        id: conv.id,
        telegram_user,
        user_id: conv.user_id,
        status: conv.status.to_string(),
        last_message_at: conv.last_message_at,
        unread_count: conv.unread_count,
        created_at: conv.__created_at__,
    }))
}

/// Delete conversation
pub async fn delete_conversation(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<serde_json::Value>> {
    info!("DELETE /conversations/{} called", id);

    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Check if conversation exists
    let conv = conversation_store
        .get_by_id(&id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;

    info!("Found conversation to delete: {:?}", conv.id);

    // Delete the conversation
    conversation_store
        .delete(&id)
        .await
        .map_err(|e| {
            error!("Failed to delete conversation {}: {}", id, e);
            AppError::Database(e.to_string())
        })?;

    info!("Successfully deleted conversation {}", id);

    Ok(Json(json!({
        "success": true,
        "message": "Conversation deleted successfully"
    })))
}
