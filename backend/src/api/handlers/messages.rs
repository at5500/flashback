use axum::{extract::{Path, Query, State}, Extension, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use storehaus::prelude::*;
use tracing::warn;
use uuid::Uuid;

use crate::api::middleware::AuthUser;
use crate::errors::{ApiResult, AppError};
use crate::models::{Conversation, Message, MessageEdit, TelegramUser};
use crate::telegram::{send_message_to_telegram_user, SendMessageResult};
use crate::websocket::{WebSocketEvent, WebSocketManager};

/// Message list query
#[derive(Debug, Deserialize)]
pub struct MessageListQuery {
    pub conversation_id: Uuid,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Message response
#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: Uuid,
    pub conversation_id: Uuid,
    pub from_user: bool,
    pub content: String,
    pub read: bool,
    pub telegram_message_id: Option<i64>,
    pub media_type: Option<String>,
    pub media_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_size: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<i32>,
    pub created_at: DateTime<Utc>,
}

/// GET /api/messages
pub async fn get_messages(
    Extension(_auth_user): Extension<AuthUser>,
    Query(query): Query<MessageListQuery>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<Vec<MessageResponse>>> {
    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let mut query_builder = QueryBuilder::new()
        .filter(QueryFilter::eq("conversation_id", json!(query.conversation_id)))
        .order_by("__created_at__", SortOrder::Asc);

    if let Some(limit) = query.limit {
        query_builder = query_builder.limit(limit);
    }

    if let Some(offset) = query.offset {
        query_builder = query_builder.offset(offset);
    }

    let messages = message_store
        .find(query_builder)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let results = messages
        .into_iter()
        .map(|msg| MessageResponse {
            id: msg.id,
            conversation_id: msg.conversation_id,
            from_user: msg.from_user,
            content: msg.content,
            read: msg.read,
            telegram_message_id: msg.telegram_message_id,
            media_type: msg.media_type,
            media_url: msg.media_url,
            file_name: msg.file_name,
            file_size: msg.file_size,
            mime_type: msg.mime_type,
            duration: msg.duration,
            created_at: msg.__created_at__,
        })
        .collect();

    Ok(Json(results))
}

/// Send message request
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub conversation_id: Uuid,
    pub content: String,
}

/// POST /api/messages/send
pub async fn send_message(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<Arc<StoreHaus>>,
    State(ws_manager): State<Arc<WebSocketManager>>,
    State(bot_manager): State<Arc<crate::telegram::BotManager>>,
    Json(req): Json<SendMessageRequest>,
) -> ApiResult<Json<MessageResponse>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get conversation
    let mut conversation = conversation_store
        .get_by_id(&req.conversation_id)
        .await
        .map_err(|_| AppError::NotFound("Conversation not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;

    // Create message
    let mut message = Message::from_user_message(req.conversation_id, req.content.clone());

    // Get bot from bot manager
    let bot = bot_manager.bot().await
        .ok_or_else(|| AppError::Internal("Bot is not connected. Please configure bot token in settings.".to_string()))?;

    // Send message to Telegram user
    let send_result = send_message_to_telegram_user(&bot, conversation.telegram_user_id, &req.content).await;

    // Handle send result
    match send_result {
        SendMessageResult::Success(telegram_message_id) => {
            // Update message with Telegram message ID
            message.telegram_message_id = Some(telegram_message_id);
        }
        SendMessageResult::UserBlocked => {
            // User blocked the bot - mark user as blocked in database
            let user_store = storehaus
                .get_store::<GenericStore<TelegramUser>>("telegram_users")
                .map_err(|e| AppError::Internal(e.to_string()))?;

            if let Ok(Some(mut user)) = user_store.get_by_id(&conversation.telegram_user_id).await {
                user.is_blocked = true;
                if let Err(e) = user_store.update(&conversation.telegram_user_id, user, None).await {
                    warn!("Failed to update user blocked status: {}", e);
                }
            }

            // Broadcast UserBlocked event to users
            let ws_event = WebSocketEvent::Error {
                message: format!("User {} has blocked the bot. Message was not delivered.", conversation.telegram_user_id),
                code: "USER_BLOCKED".to_string(),
            };

            if let Err(e) = ws_manager.broadcast_event(ws_event).await {
                warn!("Failed to broadcast UserBlocked event: {}", e);
            }

            return Err(AppError::BadRequest("User has blocked the bot".to_string()));
        }
        SendMessageResult::Error(err) => {
            return Err(AppError::Internal(format!("Failed to send Telegram message: {}", err)));
        }
    }

    let message = message_store
        .create(message.clone(), Some(vec!["user_message".to_string()]))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Update conversation
    let conversation_id = conversation.id;
    conversation.last_message_at = Some(Utc::now());
    conversation.unread_count = 0;

    conversation_store
        .update(&conversation_id, conversation, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Broadcast MessageSent event to all connected users
    let ws_event = WebSocketEvent::MessageSent {
        conversation_id: message.conversation_id,
        message_id: message.id,
        content: message.content.clone(),
        user_id: auth_user.user_id,
        user_name: auth_user.email.clone(),
        media_type: message.media_type.clone(),
        media_url: message.media_url.clone(),
        file_name: message.file_name.clone(),
        file_size: message.file_size,
        mime_type: message.mime_type.clone(),
        duration: message.duration,
    };

    if let Err(e) = ws_manager.broadcast_event(ws_event).await {
        warn!("Failed to broadcast MessageSent event: {}", e);
    }

    Ok(Json(MessageResponse {
        id: message.id,
        conversation_id: message.conversation_id,
        from_user: message.from_user,
        content: message.content,
        read: message.read,
        telegram_message_id: message.telegram_message_id,
        media_type: message.media_type,
        media_url: message.media_url,
        file_name: message.file_name,
        file_size: message.file_size,
        mime_type: message.mime_type,
        duration: message.duration,
        created_at: message.__created_at__,
    }))
}

/// PATCH /api/messages/:id/read
pub async fn mark_as_read(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<Arc<StoreHaus>>,
    State(ws_manager): State<Arc<WebSocketManager>>,
) -> ApiResult<Json<MessageResponse>> {
    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get message
    let mut message = message_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Message not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Message not found".to_string()))?;

    // Update read status
    message.read = true;

    let message = message_store
        .update(&id, message, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Broadcast MessageRead event
    let ws_event = WebSocketEvent::MessageRead {
        message_id: message.id,
        conversation_id: message.conversation_id,
    };

    if let Err(e) = ws_manager.broadcast_event(ws_event).await {
        warn!("Failed to broadcast MessageRead event: {}", e);
    }

    Ok(Json(MessageResponse {
        id: message.id,
        conversation_id: message.conversation_id,
        from_user: message.from_user,
        content: message.content,
        read: message.read,
        telegram_message_id: message.telegram_message_id,
        media_type: message.media_type,
        media_url: message.media_url,
        file_name: message.file_name,
        file_size: message.file_size,
        mime_type: message.mime_type,
        duration: message.duration,
        created_at: message.__created_at__,
    }))
}

/// Edit message request
#[derive(Debug, Deserialize)]
pub struct EditMessageRequest {
    pub content: String,
    pub edit_reason: Option<String>,
}

/// PATCH /api/messages/:id/edit
pub async fn edit_message(
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<Arc<StoreHaus>>,
    State(ws_manager): State<Arc<WebSocketManager>>,
    Json(req): Json<EditMessageRequest>,
) -> ApiResult<Json<MessageResponse>> {
    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let edit_store = storehaus
        .get_store::<GenericStore<MessageEdit>>("message_edits")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get message
    let mut message = message_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Message not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Message not found".to_string()))?;

    // Only users can edit messages, and only their own messages
    if !message.from_user {
        return Err(AppError::Forbidden("Cannot edit user messages".to_string()));
    }

    // Save edit history
    let edit_record = MessageEdit::new_edit(
        message.id,
        message.content.clone(),
        Some(auth_user.user_id),
        req.edit_reason.clone(),
    );

    edit_store
        .create(edit_record, Some(vec!["message_edit".to_string()]))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Update message content
    message.content = req.content.clone();

    let message = message_store
        .update(&id, message, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Broadcast MessageEdited event
    let ws_event = WebSocketEvent::MessageSent {
        conversation_id: message.conversation_id,
        message_id: message.id,
        content: message.content.clone(),
        user_id: auth_user.user_id,
        user_name: auth_user.email.clone(),
        media_type: message.media_type.clone(),
        media_url: message.media_url.clone(),
        file_name: message.file_name.clone(),
        file_size: message.file_size,
        mime_type: message.mime_type.clone(),
        duration: message.duration,
    };

    if let Err(e) = ws_manager.broadcast_event(ws_event).await {
        warn!("Failed to broadcast MessageEdited event: {}", e);
    }

    Ok(Json(MessageResponse {
        id: message.id,
        conversation_id: message.conversation_id,
        from_user: message.from_user,
        content: message.content,
        read: message.read,
        telegram_message_id: message.telegram_message_id,
        media_type: message.media_type,
        media_url: message.media_url,
        file_name: message.file_name,
        file_size: message.file_size,
        mime_type: message.mime_type,
        duration: message.duration,
        created_at: message.__created_at__,
    }))
}

/// Message edit history response
#[derive(Debug, Serialize)]
pub struct MessageEditResponse {
    pub id: Uuid,
    pub message_id: Uuid,
    pub previous_content: String,
    pub edited_by_user_id: Option<Uuid>,
    pub edit_reason: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// GET /api/messages/:id/history
pub async fn get_message_history(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<Vec<MessageEditResponse>>> {
    let edit_store = storehaus
        .get_store::<GenericStore<MessageEdit>>("message_edits")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let query = QueryBuilder::new()
        .filter(QueryFilter::eq("message_id", json!(id)))
        .order_by("__created_at__", SortOrder::Desc);

    let edits = edit_store
        .find(query)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let results = edits
        .into_iter()
        .map(|edit| MessageEditResponse {
            id: edit.id,
            message_id: edit.message_id,
            previous_content: edit.previous_content,
            edited_by_user_id: edit.edited_by_user_id,
            edit_reason: edit.edit_reason,
            created_at: edit.__created_at__,
        })
        .collect();

    Ok(Json(results))
}

/// Search messages request
#[derive(Debug, Deserialize)]
pub struct SearchMessagesQuery {
    pub query: String,
    pub conversation_id: Option<Uuid>,
    pub limit: Option<i64>,
}

/// GET /api/messages/search
pub async fn search_messages(
    Extension(_auth_user): Extension<AuthUser>,
    Query(search_query): Query<SearchMessagesQuery>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<Vec<MessageResponse>>> {
    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Build query with text search filter
    let search_pattern = format!("%{}%", search_query.query);
    let mut query_builder = QueryBuilder::new()
        .filter(QueryFilter::like("content", search_pattern.as_str()))
        .order_by("__created_at__", SortOrder::Desc);

    // Filter by conversation if specified
    if let Some(conversation_id) = search_query.conversation_id {
        query_builder = query_builder.filter(QueryFilter::eq("conversation_id", json!(conversation_id)));
    }

    // Apply limit
    if let Some(limit) = search_query.limit {
        query_builder = query_builder.limit(limit);
    } else {
        query_builder = query_builder.limit(50); // Default limit
    }

    let messages = message_store
        .find(query_builder)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let results = messages
        .into_iter()
        .map(|msg| MessageResponse {
            id: msg.id,
            conversation_id: msg.conversation_id,
            from_user: msg.from_user,
            content: msg.content,
            read: msg.read,
            telegram_message_id: msg.telegram_message_id,
            media_type: msg.media_type,
            media_url: msg.media_url,
            file_name: msg.file_name,
            file_size: msg.file_size,
            mime_type: msg.mime_type,
            duration: msg.duration,
            created_at: msg.__created_at__,
        })
        .collect();

    Ok(Json(results))
}