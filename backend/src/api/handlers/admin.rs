use axum::{extract::{Path, State}, Extension, Json};
use bcrypt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use storehaus::prelude::*;
use uuid::Uuid;

use crate::api::middleware::AuthUser;
use crate::errors::{ApiResult, AppError};
use crate::models::{User, UserResponse};

/// User list response
#[derive(Debug, Serialize)]
pub struct UserListResponse {
    pub users: Vec<UserResponse>,
    pub total: usize,
}

/// Create user request
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub name: String,
    pub password: String,
    pub is_operator: bool,
    pub is_admin: bool,
}

/// Update user request
#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub is_operator: Option<bool>,
    pub is_admin: Option<bool>,
    pub is_active: Option<bool>,
}

/// GET /api/admin/users - List all users (admin only)
pub async fn get_users(
    Extension(_auth_user): Extension<AuthUser>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<UserListResponse>> {
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let query = QueryBuilder::new().order_by("__created_at__", SortOrder::Desc);

    let users = user_store
        .find(query)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let total = users.len();
    let user_responses: Vec<UserResponse> = users.into_iter().map(|u| u.into()).collect();

    Ok(Json(UserListResponse {
        users: user_responses,
        total,
    }))
}

/// POST /api/admin/users - Create new user (admin only)
pub async fn create_user(
    Extension(_auth_user): Extension<AuthUser>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
    Json(req): Json<CreateUserRequest>,
) -> ApiResult<Json<UserResponse>> {
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Check if email already exists
    let query = QueryBuilder::new().filter(QueryFilter::eq("email", json!(req.email)));

    if user_store.find_one(query).await.ok().flatten().is_some() {
        return Err(AppError::BadRequest("Email already exists".to_string()));
    }

    // Hash password
    let password_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Create user
    let user = User::new(
        Uuid::new_v4(),
        req.email,
        req.name,
        password_hash,
        req.is_operator,
        req.is_admin,
        true, // is_active = true by default
        None,
        None,
    );

    let user = user_store
        .create(user, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(user.into()))
}

/// PATCH /api/admin/users/:id - Update user (admin only)
pub async fn update_user(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
    Json(req): Json<UpdateUserRequest>,
) -> ApiResult<Json<UserResponse>> {
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Get user
    let mut user = user_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Update fields
    if let Some(name) = req.name {
        user.name = name;
    }
    if let Some(email) = req.email {
        // Check if new email already exists
        let query = QueryBuilder::new().filter(QueryFilter::eq("email", json!(email)));
        if let Some(existing) = user_store.find_one(query).await.ok().flatten() {
            if existing.id != id {
                return Err(AppError::BadRequest("Email already exists".to_string()));
            }
        }
        user.email = email;
    }
    if let Some(is_operator) = req.is_operator {
        user.is_operator = is_operator;
    }
    if let Some(is_admin) = req.is_admin {
        user.is_admin = is_admin;
    }
    if let Some(is_active) = req.is_active {
        user.is_active = is_active;
    }

    // Save
    let user = user_store
        .update(&id, user, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(user.into()))
}

/// DELETE /api/admin/users/:id - Delete user (admin only)
pub async fn delete_user(
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<serde_json::Value>> {
    // Prevent deleting yourself
    if auth_user.user_id == id {
        return Err(AppError::BadRequest("Cannot delete yourself".to_string()));
    }

    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    user_store
        .delete(&id)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(json!({"message": "User deleted successfully"})))
}

/// PATCH /api/admin/users/:id/toggle-active - Toggle user active status (admin only)
pub async fn toggle_user_active(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<UserResponse>> {
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let mut user = user_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    user.is_active = !user.is_active;

    let user = user_store
        .update(&id, user, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(user.into()))
}

/// PATCH /api/admin/users/:id/toggle-operator - Toggle operator privileges (admin only)
pub async fn toggle_user_operator(
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<UserResponse>> {
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let mut user = user_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    user.is_operator = !user.is_operator;

    let user = user_store
        .update(&id, user, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(user.into()))
}

/// PATCH /api/admin/users/:id/toggle-admin - Toggle admin privileges (admin only)
pub async fn toggle_user_admin(
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
) -> ApiResult<Json<UserResponse>> {
    // Prevent removing admin from yourself
    if auth_user.user_id == id {
        return Err(AppError::BadRequest("Cannot modify your own admin privileges".to_string()));
    }

    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let mut user = user_store
        .get_by_id(&id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    user.is_admin = !user.is_admin;

    let user = user_store
        .update(&id, user, None)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(user.into()))
}