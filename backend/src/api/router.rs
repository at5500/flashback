use axum::{
    extract::FromRef,
    middleware,
    routing::{delete, get, patch, post},
    Router,
};
use std::sync::Arc;
use storehaus::StoreHaus;
use tower_http::trace::TraceLayer;
use watchtower::prelude::*;

use crate::config::AppConfig;
use crate::telegram::BotManager;
use crate::websocket::{websocket_handler, WebSocketManager};

use super::handlers::{analytics, auth, conversations, export, health, messages, users, settings, telegram_photo, telegram_users, templates, admin};
use super::middleware::{admin_middleware, auth_middleware, create_cors_layer};

/// Application state type
#[derive(Clone)]
pub struct AppState {
    pub config: AppConfig,
    pub storehaus: Arc<StoreHaus>,
    pub ws_manager: Arc<WebSocketManager>,
    pub bot_manager: Arc<BotManager>,
}

impl FromRef<AppState> for AppConfig {
    fn from_ref(state: &AppState) -> Self {
        state.config.clone()
    }
}

impl FromRef<AppState> for Arc<StoreHaus> {
    fn from_ref(state: &AppState) -> Self {
        state.storehaus.clone()
    }
}

impl FromRef<AppState> for Arc<WebSocketManager> {
    fn from_ref(state: &AppState) -> Self {
        state.ws_manager.clone()
    }
}

impl FromRef<AppState> for Arc<WebSocketServerTransport> {
    fn from_ref(state: &AppState) -> Self {
        state.ws_manager.transport()
    }
}

impl FromRef<AppState> for Arc<BotManager> {
    fn from_ref(state: &AppState) -> Self {
        state.bot_manager.clone()
    }
}

/// Create API router
pub fn create_router(
    config: AppConfig,
    storehaus: Arc<StoreHaus>,
    ws_manager: Arc<WebSocketManager>,
    bot_manager: Arc<BotManager>,
) -> Router {
    let app_state = AppState {
        config: config.clone(),
        storehaus: storehaus.clone(),
        ws_manager,
        bot_manager,
    };

    // Public routes (no auth required)
    let public_routes = Router::new()
        .route("/health", get(health::health_check))
        .route("/auth/login", post(auth::login))
        .route("/telegram-photo/:user_id", get(telegram_photo::get_telegram_photo))
        .with_state(app_state.clone());

    // Protected routes (auth required)
    let protected_routes = Router::new()
        .route("/auth/me", get(auth::get_current_user))
        // Bot status
        .route("/bot/status", get(settings::get_bot_status))
        // Conversations
        .route("/conversations", get(conversations::get_conversations))
        // Specific routes first (before generic :id)
        .route("/conversations/:id/assign", patch(conversations::assign_conversation))
        .route("/conversations/:id/status", patch(conversations::update_conversation_status))
        .route("/conversations/:id/close", patch(conversations::close_conversation))
        .route("/conversations/:id/mark-read", patch(conversations::mark_conversation_read))
        .route("/conversations/:id/export", get(export::export_conversation))
        // Generic :id route last
        .route(
            "/conversations/:id",
            get(conversations::get_conversation).delete(conversations::delete_conversation),
        )
        // Messages
        .route("/messages", get(messages::get_messages))
        .route("/messages/search", get(messages::search_messages))
        .route("/messages/send", post(messages::send_message))
        .route("/messages/:id/read", patch(messages::mark_as_read))
        .route("/messages/:id/edit", patch(messages::edit_message))
        .route("/messages/:id/history", get(messages::get_message_history))
        // Telegram Users
        .route("/telegram-users", get(telegram_users::get_telegram_users))
        .route("/telegram-users/:id", get(telegram_users::get_telegram_user))
        .route("/telegram-users/:id/block", patch(telegram_users::block_telegram_user))
        // Templates
        .route("/templates", get(templates::get_templates))
        .route("/templates", post(templates::create_template))
        .route("/templates/:id", get(templates::get_template))
        .route("/templates/:id", patch(templates::update_template))
        .route("/templates/:id", delete(templates::delete_template))
        .route("/templates/:id/use", patch(templates::increment_template_usage))
        // Users
        .route("/users", get(users::get_users))
        .route("/users/me", get(users::get_current_user).patch(users::update_user_profile))
        .route("/users/me/status", patch(users::update_user_status))
        .route("/users/me/password", post(users::change_user_password))
        .route("/users/me/settings", patch(users::update_user_settings))
        .route("/users/stats", get(users::get_user_stats))
        .route("/users/:id/stats", get(users::get_user_stats_by_id))
        // Analytics
        .route("/analytics/overall", get(analytics::get_overall_stats))
        .route("/analytics/users", get(analytics::get_users_stats))
        .route("/analytics/response-times", get(analytics::get_response_time_stats))
        .route("/analytics/message-volume", get(analytics::get_message_volume))
        .route_layer(middleware::from_fn_with_state(
            config.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    // Admin-only routes (auth + admin required)
    let admin_routes = Router::new()
        .route("/admin/users", get(admin::get_users).post(admin::create_user))
        .route("/admin/users/:id", patch(admin::update_user).delete(admin::delete_user))
        .route("/admin/users/:id/toggle-active", patch(admin::toggle_user_active))
        .route("/admin/users/:id/toggle-operator", patch(admin::toggle_user_operator))
        .route("/admin/users/:id/toggle-admin", patch(admin::toggle_user_admin))
        // Settings
        .route("/admin/settings", get(settings::get_settings).put(settings::update_settings))
        .route_layer(middleware::from_fn_with_state(
            storehaus.clone(),
            admin_middleware,
        ))
        .route_layer(middleware::from_fn_with_state(
            config.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    // WebSocket route (handles its own auth via Sec-WebSocket-Protocol)
    let ws_route = Router::new()
        .route("/ws", get(websocket_handler))
        .with_state(app_state);

    // Combine routes
    Router::new()
        .merge(ws_route) // WebSocket at /ws
        .nest("/api", public_routes.merge(protected_routes).merge(admin_routes)) // API routes at /api/*
        .layer(create_cors_layer())
        .layer(TraceLayer::new_for_http())
}