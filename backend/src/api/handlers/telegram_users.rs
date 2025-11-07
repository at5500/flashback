use axum::{extract::{Path, Query, State}, Extension, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use storehaus::prelude::*;

use crate::api::middleware::AuthUser;
use crate::errors::{ApiResult, AppError};
use crate::models::TelegramUser;

/// Telegram user list query parameters
#[derive(Debug, Deserialize)]
pub struct TelegramUserListQuery {
    pub is_blocked: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Telegram user response
#[derive(Debug, Serialize)]
pub struct TelegramUserResponse {
    pub id: i64,
    pub username: Option<String>,
    pub first_name: String,
    pub last_name: Option<String>,
    pub is_blocked: bool,
    pub created_at: DateTime<Utc>,
}

/// GET /api/telegram-users
pub async fn get_telegram_users(
    Extension(_auth_user): Extension<AuthUser>,
    Query(query): Query<TelegramUserListQuery>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<Vec<TelegramUserResponse>>> {
    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Build query
    let mut query_builder = QueryBuilder::new()
        .order_by("__created_at__", SortOrder::Desc);

    if let Some(is_blocked) = query.is_blocked {
        query_builder = query_builder.filter(QueryFilter::eq("is_blocked", json!(is_blocked)));
    }

    if let Some(limit) = query.limit {
        query_builder = query_builder.limit(limit);
    }

    if let Some(offset) = query.offset {
        query_builder = query_builder.offset(offset);
    }

    let telegram_users = telegram_user_store
        .find(query_builder)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let results = telegram_users
        .into_iter()
        .map(|user| TelegramUserResponse {
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            is_blocked: user.is_blocked,
            created_at: user.__created_at__,
        })
        .collect();

    Ok(Json(results))
}

/// GET /api/telegram-users/:id
pub async fn get_telegram_user(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<i64>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<TelegramUserResponse>> {
    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let telegram_user = telegram_user_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Telegram user not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Telegram user not found".to_string()))?;

    Ok(Json(TelegramUserResponse {
        id: telegram_user.id,
        username: telegram_user.username,
        first_name: telegram_user.first_name,
        last_name: telegram_user.last_name,
        is_blocked: telegram_user.is_blocked,
        created_at: telegram_user.__created_at__,
    }))
}

/// PATCH /api/telegram-users/:id/block
#[derive(Debug, Deserialize)]
pub struct BlockUserRequest {
    pub is_blocked: bool,
}

pub async fn block_telegram_user(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<i64>,
    State(storehaus): State<Arc<StoreHaus>>,
    Json(req): Json<BlockUserRequest>,
) -> ApiResult<Json<TelegramUserResponse>> {
    let telegram_user_store = storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get user
    let mut telegram_user = telegram_user_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Telegram user not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Telegram user not found".to_string()))?;

    // Update blocked status
    telegram_user.is_blocked = req.is_blocked;

    let telegram_user = telegram_user_store
        .update(&id, telegram_user, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(TelegramUserResponse {
        id: telegram_user.id,
        username: telegram_user.username,
        first_name: telegram_user.first_name,
        last_name: telegram_user.last_name,
        is_blocked: telegram_user.is_blocked,
        created_at: telegram_user.__created_at__,
    }))
}