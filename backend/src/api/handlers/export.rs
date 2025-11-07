use axum::{extract::{Path, Query, State}, Extension, response::{IntoResponse, Response}, http::{header, StatusCode}};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use storehaus::prelude::*;
use uuid::Uuid;

use crate::api::middleware::AuthUser;
use crate::errors::AppError;
use crate::models::{Conversation, Message, TelegramUser};

/// Export format
#[derive(Debug, Deserialize)]
pub struct ExportQuery {
    pub format: Option<String>, // json, csv, txt
}

/// Export conversation messages
#[derive(Debug, Serialize)]
pub struct ExportMessage {
    pub id: Uuid,
    pub from_user: bool,
    pub content: String,
    pub created_at: String,
    pub media_type: Option<String>,
    pub file_name: Option<String>,
}

/// GET /api/conversations/:id/export
pub async fn export_conversation(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Query(query): Query<ExportQuery>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> Result<Response, AppError> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get conversation
    let conversation = conversation_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Conversation not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Conversation not found".to_string()))?;

    // Get user info
    let telegram_user = telegram_user_store
        .get_by_id(&conversation.telegram_user_id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Get all messages
    let query_builder = QueryBuilder::new()
        .filter(QueryFilter::eq("conversation_id", json!(id)))
        .order_by("__created_at__", SortOrder::Asc);

    let messages = message_store
        .find(query_builder)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let export_messages: Vec<ExportMessage> = messages
        .into_iter()
        .map(|msg| ExportMessage {
            id: msg.id,
            from_user: msg.from_user,
            content: msg.content,
            created_at: msg.__created_at__.to_rfc3339(),
            media_type: msg.media_type,
            file_name: msg.file_name,
        })
        .collect();

    let format = query.format.as_deref().unwrap_or("json");

    match format {
        "json" => export_as_json(&telegram_user, &conversation, &export_messages),
        "csv" => export_as_csv(&telegram_user, &conversation, &export_messages),
        "txt" => export_as_txt(&telegram_user, &conversation, &export_messages),
        _ => Err(AppError::BadRequest("Unsupported format. Use json, csv, or txt".to_string())),
    }
}

fn export_as_json(
    user: &TelegramUser,
    conversation: &Conversation,
    messages: &[ExportMessage],
) -> Result<Response, AppError> {
    let export_data = json!({
        "conversation_id": conversation.id,
        "user": {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
        },
        "messages": messages,
        "exported_at": Utc::now().to_rfc3339(),
    });

    let json_str = serde_json::to_string_pretty(&export_data)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/json")],
        json_str,
    )
        .into_response())
}

fn export_as_csv(
    user: &TelegramUser,
    _conversation: &Conversation,
    messages: &[ExportMessage],
) -> Result<Response, AppError> {
    let mut csv = String::from("Timestamp,From,Content,Media Type,File Name\n");

    for msg in messages {
        let from = if msg.from_user {
            "Operator"
        } else {
            user.username.as_deref().unwrap_or("User")
        };

        let content = msg.content.replace("\"", "\"\"");
        let media_type = msg.media_type.as_deref().unwrap_or("");
        let file_name = msg.file_name.as_deref().unwrap_or("");

        csv.push_str(&format!(
            "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
            msg.created_at, from, content, media_type, file_name
        ));
    }

    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/csv")],
        csv,
    )
        .into_response())
}

fn export_as_txt(
    user: &TelegramUser,
    conversation: &Conversation,
    messages: &[ExportMessage],
) -> Result<Response, AppError> {
    let mut txt = format!(
        "Conversation Export\n\
         ==================\n\
         Conversation ID: {}\n\
         User: {} ({})\n\
         Exported: {}\n\
         \n\
         Messages:\n\
         =========\n\n",
        conversation.id,
        user.first_name,
        user.username.as_deref().unwrap_or("no username"),
        Utc::now().to_rfc3339()
    );

    for msg in messages {
        let from = if msg.from_user {
            "Operator"
        } else {
            user.username.as_deref().unwrap_or(&user.first_name)
        };

        txt.push_str(&format!(
            "[{}] {}: {}\n",
            msg.created_at, from, msg.content
        ));

        if let Some(ref media) = msg.media_type {
            txt.push_str(&format!("  [Media: {}]\n", media));
        }

        txt.push('\n');
    }

    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        txt,
    )
        .into_response())
}