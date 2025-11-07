use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
    Extension,
};
use storehaus::prelude::*;

use crate::api::middleware::AuthUser;
use crate::errors::AppError;
use crate::models::User;

/// Admin authorization middleware
/// Checks if the authenticated user has admin privileges
pub async fn admin_middleware(
    Extension(auth_user): Extension<AuthUser>,
    State(storehaus): State<std::sync::Arc<StoreHaus>>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    // Get user from database
    let user_store = storehaus
        .get_store::<GenericStore<User>>("users")
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let user = user_store
        .get_by_id(&auth_user.user_id)
        .await
        .map_err(|_| AppError::NotFound("User not found".to_string()))?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Check if user has admin access
    if !user.has_admin_access() {
        return Err(AppError::Forbidden(
            "Admin privileges required".to_string(),
        ));
    }

    Ok(next.run(request).await)
}
