use axum::{extract::{Path, State}, Extension, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use storehaus::prelude::*;
use uuid::Uuid;

use crate::api::middleware::AuthUser;
use crate::errors::{ApiResult, AppError};
use crate::models::MessageTemplate;

/// Template response
#[derive(Debug, Serialize)]
pub struct TemplateResponse {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub category: Option<String>,
    pub user_id: Option<Uuid>,
    pub usage_count: i32,
    pub created_at: DateTime<Utc>,
}

/// GET /api/templates
pub async fn get_templates(
    Extension(_auth_user): Extension<AuthUser>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<Vec<TemplateResponse>>> {
    let template_store = storehaus
        .get_store::<GenericStore<MessageTemplate>>("templates")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let query = QueryBuilder::new()
        .order_by("usage_count", SortOrder::Desc);

    let templates = template_store
        .find(query)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let results = templates
        .into_iter()
        .map(|t| TemplateResponse {
            id: t.id,
            title: t.title,
            content: t.content,
            category: t.category,
            user_id: t.user_id,
            usage_count: t.usage_count,
            created_at: Utc::now(),
        })
        .collect();

    Ok(Json(results))
}

/// GET /api/templates/:id
pub async fn get_template(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<TemplateResponse>> {
    let template_store = storehaus
        .get_store::<GenericStore<MessageTemplate>>("templates")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let template = template_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Template not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Template not found".to_string()))?;

    Ok(Json(TemplateResponse {
        id: template.id,
        title: template.title,
        content: template.content,
        category: template.category,
        user_id: template.user_id,
        usage_count: template.usage_count,
        created_at: Utc::now(),
    }))
}

/// Create template request
#[derive(Debug, Deserialize)]
pub struct CreateTemplateRequest {
    pub title: String,
    pub content: String,
    pub category: Option<String>,
}

/// POST /api/templates
pub async fn create_template(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
    Json(req): Json<CreateTemplateRequest>,
) -> ApiResult<Json<TemplateResponse>> {
    let template_store = storehaus
        .get_store::<GenericStore<MessageTemplate>>("templates")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let template = MessageTemplate::create(
        req.title,
        req.content,
        req.category,
        Some(auth_user.user_id),
    );

    let template = template_store
        .create(template.clone(), None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(TemplateResponse {
        id: template.id,
        title: template.title,
        content: template.content,
        category: template.category,
        user_id: template.user_id,
        usage_count: template.usage_count,
        created_at: Utc::now(),
    }))
}

/// Update template request
#[derive(Debug, Deserialize)]
pub struct UpdateTemplateRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub category: Option<String>,
}

/// PATCH /api/templates/:id
pub async fn update_template(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
    Json(req): Json<UpdateTemplateRequest>,
) -> ApiResult<Json<TemplateResponse>> {
    let template_store = storehaus
        .get_store::<GenericStore<MessageTemplate>>("templates")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get current template
    let mut template = template_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Template not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Template not found".to_string()))?;

    // Update fields
    if let Some(title) = req.title {
        template.title = title;
    }
    if let Some(content) = req.content {
        template.content = content;
    }
    if let Some(category) = req.category {
        template.category = Some(category);
    }

    let template = template_store
        .update(&id, template, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(TemplateResponse {
        id: template.id,
        title: template.title,
        content: template.content,
        category: template.category,
        user_id: template.user_id,
        usage_count: template.usage_count,
        created_at: Utc::now(),
    }))
}

/// DELETE /api/templates/:id
pub async fn delete_template(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<serde_json::Value>> {
    let template_store = storehaus
        .get_store::<GenericStore<MessageTemplate>>("templates")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // delete() returns bool: true if deleted, false if not found
    let deleted = template_store
        .delete(&id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    if !deleted {
        return Err(AppError::NotFound("Template not found".to_string()));
    }

    Ok(Json(json!({ "message": "Template deleted successfully" })))
}

/// PATCH /api/templates/:id/use
pub async fn increment_template_usage(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<TemplateResponse>> {
    let template_store = storehaus
        .get_store::<GenericStore<MessageTemplate>>("templates")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get current template
    let mut template = template_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("Template not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("Template not found".to_string()))?;

    // Increment usage count
    template.usage_count += 1;

    let template = template_store
        .update(&id, template, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(TemplateResponse {
        id: template.id,
        title: template.title,
        content: template.content,
        category: template.category,
        user_id: template.user_id,
        usage_count: template.usage_count,
        created_at: Utc::now(),
    }))
}
