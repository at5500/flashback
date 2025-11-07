//! # Analytics Handlers
//!
//! This module provides analytics endpoints for gathering statistics about conversations,
//! messages, users, and response times.

use axum::{extract::{Query, State}, Extension, Json};
use chrono::Timelike;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use storehaus::prelude::*;
use uuid::Uuid;

use crate::api::middleware::AuthUser;
use crate::errors::{ApiResult, AppError};
use crate::models::{Conversation, ConversationStatus, Message};

/// Query parameters for analytics endpoints.
///
/// # Fields
///
/// * `start_date` - Optional start date for filtering (ISO 8601 format)
/// * `end_date` - Optional end date for filtering (ISO 8601 format)
#[derive(Debug, Deserialize)]
pub struct AnalyticsQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// Overall system statistics response.
///
/// # Fields
///
/// * `total_conversations` - Total number of conversations in the system
/// * `active_conversations` - Number of active or waiting conversations
/// * `closed_conversations` - Number of closed conversations
/// * `total_messages` - Total number of messages sent
/// * `total_telegram_users` - Number of unique Telegram users
/// * `average_response_time_seconds` - Average time for first operator response
#[derive(Debug, Serialize)]
pub struct OverallStatsResponse {
    pub total_conversations: i64,
    pub active_conversations: i64,
    pub closed_conversations: i64,
    pub total_messages: i64,
    pub total_telegram_users: i64,
    pub average_response_time_seconds: Option<f64>,
}

/// Statistics for individual operators.
///
/// # Fields
///
/// * `user_id` - UUID of the operator
/// * `user_email` - Email address of the operator
/// * `conversations_handled` - Number of conversations handled by this operator
/// * `messages_sent` - Number of messages sent by this operator
/// * `average_response_time_seconds` - Average response time for this operator
#[derive(Debug, Serialize)]
pub struct UserStats {
    pub user_id: Uuid,
    pub user_email: String,
    pub conversations_handled: i64,
    pub messages_sent: i64,
    pub average_response_time_seconds: Option<f64>,
}

/// Get overall system statistics.
///
/// Returns aggregated statistics including total conversations, messages, users,
/// and average response time.
///
/// # Endpoint
///
/// `GET /api/analytics/overall`
///
/// # Query Parameters
///
/// * `start_date` - Optional start date for filtering (not yet implemented)
/// * `end_date` - Optional end date for filtering (not yet implemented)
///
/// # Returns
///
/// * `OverallStatsResponse` - Overall system statistics
///
/// # Errors
///
/// Returns `AppError::Database` if database operations fail.
pub async fn get_overall_stats(
    Extension(_auth_user): Extension<AuthUser>,
    Query(_query): Query<AnalyticsQuery>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<OverallStatsResponse>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Count total conversations using StoreHaus count
    let total_conversations = conversation_store
        .find(QueryBuilder::new())
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .len() as i64;

    // Count active conversations (Active or Waiting status)
    let active_conversations = conversation_store
        .find(QueryBuilder::new()
            .filter(QueryFilter::or(vec![
                QueryFilter::eq("status", serde_json::json!(ConversationStatus::Active)),
                QueryFilter::eq("status", serde_json::json!(ConversationStatus::Waiting)),
            ])))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .len() as i64;

    // Count closed conversations
    let closed_conversations = conversation_store
        .find(QueryBuilder::new()
            .filter(QueryFilter::eq("status", serde_json::json!(ConversationStatus::Closed))))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .len() as i64;

    // Count total messages
    let total_messages = message_store
        .find(QueryBuilder::new())
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .len() as i64;

    // Count unique telegram users using aggregation
    let unique_users_query = QueryBuilder::new()
        .select_fields(vec![
            SelectField::count_distinct("telegram_user_id").with_alias("unique_users"),
        ]);

    let (select_clause, _, where_clause, _, _, _, _, where_values, _) = unique_users_query.build_full();
    let sql = format!(
        "SELECT {} FROM conversations {}",
        if select_clause.is_empty() { "COUNT(DISTINCT telegram_user_id) as unique_users" } else { &select_clause },
        where_clause
    );

    let mut query_builder = sqlx::query(&sql);
    for value in where_values {
        query_builder = query_builder.bind(value);
    }

    let row = query_builder
        .fetch_one(storehaus.pool())
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let total_telegram_users: i64 = row
        .try_get("unique_users")
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Calculate average first response time for overall stats
    let closed_query = QueryBuilder::new()
        .filter(QueryFilter::eq("status", serde_json::json!(ConversationStatus::Closed)))
        .limit(100); // Limit to last 100 closed conversations for performance

    let closed_conversations_list = conversation_store
        .find(closed_query)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut response_times = Vec::new();

    for conversation in closed_conversations_list {
        // Get first operator message for this conversation
        let first_msg_query = QueryBuilder::new()
            .filter(QueryFilter::eq("conversation_id", serde_json::json!(conversation.id)))
            .filter(QueryFilter::eq("from_user", serde_json::json!(true)))
            .limit(1);

        if let Ok(messages) = message_store.find(first_msg_query).await {
            if let Some(first_msg) = messages.first() {
                let response_time = (first_msg.__created_at__ - conversation.__created_at__).num_seconds();
                if response_time > 0 {
                    response_times.push(response_time as f64);
                }
            }
        }
    }

    let average_response_time_seconds = if !response_times.is_empty() {
        Some(response_times.iter().sum::<f64>() / response_times.len() as f64)
    } else {
        None
    };

    Ok(Json(OverallStatsResponse {
        total_conversations,
        active_conversations,
        closed_conversations,
        total_messages,
        total_telegram_users,
        average_response_time_seconds,
    }))
}

/// Get statistics for all operators.
///
/// Returns performance metrics for each operator including conversations handled
/// and messages sent.
///
/// # Endpoint
///
/// `GET /api/analytics/users`
///
/// # Query Parameters
///
/// * `start_date` - Optional start date for filtering (not yet implemented)
/// * `end_date` - Optional end date for filtering (not yet implemented)
///
/// # Returns
///
/// * `Vec<UserStats>` - List of operator statistics
///
/// # Errors
///
/// Returns `AppError::Database` if database operations fail.
pub async fn get_users_stats(
    Extension(_auth_user): Extension<AuthUser>,
    Query(_query): Query<AnalyticsQuery>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<Vec<UserStats>>> {
    // Build aggregation query with JOINs using StoreHaus
    // We need to use conditional COUNT for messages_sent
    // SELECT
    //   users.id,
    //   users.email,
    //   COUNT(DISTINCT conversations.id) as conversations_handled,
    //   COUNT(CASE WHEN messages.from_user = true THEN 1 END) as messages_sent
    // FROM users
    // LEFT JOIN conversations ON users.id = conversations.user_id
    // LEFT JOIN messages ON conversations.id = messages.conversation_id
    // WHERE users.is_operator = true OR users.is_admin = true
    // GROUP BY users.id, users.email

    let query = QueryBuilder::new()
        .select_fields(vec![
            SelectField::field("users.id"),
            SelectField::field("users.email"),
            SelectField::count_distinct("conversations.id").with_alias("conversations_handled"),
        ])
        .join(JoinClause::new_on(
            JoinType::Left,
            "conversations",
            "users.id",
            "conversations.user_id",
        ))
        .join(JoinClause::new_on(
            JoinType::Left,
            "messages",
            "conversations.id",
            "messages.conversation_id",
        ))
        .filter(QueryFilter::or(vec![
            QueryFilter::eq("users.is_operator", serde_json::json!(true)),
            QueryFilter::eq("users.is_admin", serde_json::json!(true)),
        ]))
        .group_by(GroupBy::new(vec![
            "users.id".to_string(),
            "users.email".to_string(),
        ]));

    // Build SQL from query
    let (select_clause, join_clause, where_clause, group_by_clause, _, _, _, where_values, _) =
        query.build_full();

    // We need to add COUNT(CASE...) manually since StoreHaus doesn't have this yet
    let custom_select = format!(
        "users.id, users.email, COUNT(DISTINCT conversations.id) as conversations_handled, \
         COUNT(CASE WHEN messages.from_user = true THEN 1 END) as messages_sent"
    );

    let sql = format!(
        "SELECT {} FROM users {} {} {}",
        custom_select,
        join_clause,
        where_clause,
        group_by_clause
    );

    // Execute query and get raw rows
    let mut query_builder = sqlx::query(&sql);
    for value in where_values {
        query_builder = query_builder.bind(value);
    }

    let rows = query_builder
        .fetch_all(storehaus.pool())
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Extract results from rows
    let mut user_stats = Vec::new();
    for row in rows {
        let user_id: Uuid = row.try_get("id")
            .map_err(|e| AppError::Database(e.to_string()))?;
        let user_email: String = row.try_get("email")
            .map_err(|e| AppError::Database(e.to_string()))?;
        let conversations_handled: i64 = row.try_get("conversations_handled")
            .unwrap_or(0);
        let messages_sent: i64 = row.try_get("messages_sent")
            .unwrap_or(0);

        user_stats.push(UserStats {
            user_id,
            user_email,
            conversations_handled,
            messages_sent,
            average_response_time_seconds: None,
        });
    }

    Ok(Json(user_stats))
}

/// Response time statistics.
///
/// # Fields
///
/// * `average_first_response_seconds` - Average time from conversation start to first operator response
/// * `average_response_time_seconds` - Average time between user messages and operator replies
/// * `median_response_time_seconds` - Median response time for all interactions
#[derive(Debug, Serialize)]
pub struct ResponseTimeStats {
    pub average_first_response_seconds: Option<f64>,
    pub average_response_time_seconds: Option<f64>,
    pub median_response_time_seconds: Option<f64>,
}

/// Get detailed response time statistics.
///
/// Calculates average and median response times based on closed conversations.
/// Analyzes both first response time and ongoing response patterns.
///
/// # Endpoint
///
/// `GET /api/analytics/response-times`
///
/// # Query Parameters
///
/// * `start_date` - Optional start date for filtering (not yet implemented)
/// * `end_date` - Optional end date for filtering (not yet implemented)
///
/// # Returns
///
/// * `ResponseTimeStats` - Detailed response time metrics
///
/// # Errors
///
/// Returns `AppError::Database` if database operations fail.
pub async fn get_response_time_stats(
    Extension(_auth_user): Extension<AuthUser>,
    Query(_query): Query<AnalyticsQuery>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<ResponseTimeStats>> {
    let conversation_store = storehaus
        .get_store::<GenericStore<Conversation>>("conversations")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get closed conversations
    let closed_query = QueryBuilder::new()
        .filter(QueryFilter::eq("status", serde_json::json!(ConversationStatus::Closed)));

    let conversations = conversation_store
        .find(closed_query)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut first_response_times = Vec::new();
    let mut all_response_times = Vec::new();

    for conversation in conversations {
        // Get all messages for this conversation
        let messages_query = QueryBuilder::new()
            .filter(QueryFilter::eq("conversation_id", serde_json::json!(conversation.id)));

        let mut messages = message_store
            .find(messages_query)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        // Sort messages by creation time
        messages.sort_by(|a, b| a.__created_at__.cmp(&b.__created_at__));

        if messages.is_empty() {
            continue;
        }

        // Find first operator message (from_user = true)
        if let Some(first_operator_msg) = messages.iter().find(|m| m.from_user) {
            // Calculate time from conversation start to first operator response
            let response_time = (first_operator_msg.__created_at__ - conversation.__created_at__).num_seconds();
            if response_time > 0 {
                first_response_times.push(response_time as f64);
            }
        }

        // Calculate response times between user messages and operator replies
        for i in 0..messages.len() {
            if !messages[i].from_user {
                // This is a user message, find next operator message
                if let Some(operator_msg) = messages.iter().skip(i + 1).find(|m| m.from_user) {
                    let response_time = (operator_msg.__created_at__ - messages[i].__created_at__).num_seconds();
                    if response_time > 0 {
                        all_response_times.push(response_time as f64);
                    }
                }
            }
        }
    }

    // Calculate statistics
    let average_first_response_seconds = if !first_response_times.is_empty() {
        Some(first_response_times.iter().sum::<f64>() / first_response_times.len() as f64)
    } else {
        None
    };

    let average_response_time_seconds = if !all_response_times.is_empty() {
        Some(all_response_times.iter().sum::<f64>() / all_response_times.len() as f64)
    } else {
        None
    };

    // Calculate median
    let median_response_time_seconds = if !all_response_times.is_empty() {
        let mut sorted_times = all_response_times.clone();
        sorted_times.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let mid = sorted_times.len() / 2;
        Some(if sorted_times.len() % 2 == 0 {
            (sorted_times[mid - 1] + sorted_times[mid]) / 2.0
        } else {
            sorted_times[mid]
        })
    } else {
        None
    };

    Ok(Json(ResponseTimeStats {
        average_first_response_seconds,
        average_response_time_seconds,
        median_response_time_seconds,
    }))
}

/// Message volume grouped by hour of day.
///
/// # Fields
///
/// * `hour` - Hour of day (0-23)
/// * `message_count` - Number of messages sent during this hour
#[derive(Debug, Serialize)]
pub struct MessageVolumeByHour {
    pub hour: u32,
    pub message_count: i64,
}

/// Get message volume statistics by hour of day.
///
/// Returns the total number of messages grouped by hour (0-23),
/// useful for identifying peak activity times.
///
/// # Endpoint
///
/// `GET /api/analytics/message-volume`
///
/// # Query Parameters
///
/// * `start_date` - Optional start date for filtering (not yet implemented)
/// * `end_date` - Optional end date for filtering (not yet implemented)
///
/// # Returns
///
/// * `Vec<MessageVolumeByHour>` - Message counts for each hour of the day
///
/// # Errors
///
/// Returns `AppError::Database` if database operations fail.
pub async fn get_message_volume(
    Extension(_auth_user): Extension<AuthUser>,
    Query(_query): Query<AnalyticsQuery>,
    State(storehaus): State<Arc<StoreHaus>>,
) -> ApiResult<Json<Vec<MessageVolumeByHour>>> {
    let message_store = storehaus
        .get_store::<GenericStore<Message>>("messages")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get all messages with timestamps
    let all_messages = message_store
        .find(QueryBuilder::new())
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Group messages by hour of day (0-23)
    let mut hour_counts: std::collections::HashMap<u32, i64> = std::collections::HashMap::new();

    for message in all_messages {
        let hour = message.__created_at__.hour();
        *hour_counts.entry(hour).or_insert(0) += 1;
    }

    // Create result vector with all 24 hours
    let mut results: Vec<MessageVolumeByHour> = (0..24)
        .map(|hour| MessageVolumeByHour {
            hour,
            message_count: *hour_counts.get(&hour).unwrap_or(&0),
        })
        .collect();

    // Sort by hour for consistency
    results.sort_by_key(|v| v.hour);

    Ok(Json(results))
}