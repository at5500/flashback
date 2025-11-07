use axum::{
    extract::{Request, State, WebSocketUpgrade},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use std::collections::HashMap;
use std::sync::Arc;
use watchtower::prelude::*;

use crate::config::AppConfig;
use crate::utils;

/// WebSocket connection handler
/// Authentication via Sec-WebSocket-Protocol header
/// Client should send: new WebSocket(url, ['access_token', token])
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(config): State<AppConfig>,
    State(transport): State<Arc<WebSocketServerTransport>>,
    request: Request,
) -> Response {
    tracing::info!("WebSocket connection attempt");

    // Extract token from Sec-WebSocket-Protocol header
    // Format: "access_token, <JWT_TOKEN>"
    let token = match request
        .headers()
        .get("sec-websocket-protocol")
        .and_then(|h| h.to_str().ok())
    {
        Some(protocols) => {
            tracing::info!("WebSocket protocols header: {}", protocols);
            // Parse protocols: "access_token, eyJ0eXAi..."
            let parts: Vec<&str> = protocols.split(',').map(|s| s.trim()).collect();
            tracing::info!("Parsed parts: {:?}", parts);
            if parts.len() == 2 && parts[0] == "access_token" {
                parts[1]
            } else {
                tracing::warn!("Invalid protocol format. Parts count: {}, first part: {:?}", parts.len(), parts.get(0));
                return (
                    StatusCode::UNAUTHORIZED,
                    "Invalid WebSocket protocol format. Expected: ['access_token', '<token>']",
                )
                    .into_response();
            }
        }
        None => {
            tracing::warn!("Missing sec-websocket-protocol header");
            return (
                StatusCode::UNAUTHORIZED,
                "Missing authentication. Use: new WebSocket(url, ['access_token', token])",
            )
                .into_response();
        }
    };

    // Verify JWT token
    tracing::info!("Verifying JWT token...");
    let claims = match utils::verify_token(token, &config.jwt_secret) {
        Ok(claims) => {
            tracing::info!("JWT token verified successfully");
            claims
        }
        Err(e) => {
            tracing::error!("JWT token verification failed: {}", e);
            return (StatusCode::UNAUTHORIZED, "Invalid or expired token").into_response();
        }
    };

    let operator_id = match claims.user_id() {
        Ok(id) => {
            tracing::info!("Extracted user_id: {}", id);
            id.to_string()
        }
        Err(e) => {
            tracing::error!("Failed to extract user_id from claims: {}", e);
            return (StatusCode::UNAUTHORIZED, "Invalid token claims").into_response();
        }
    };
    let operator_email = claims.email.clone();

    tracing::info!("WebSocket authentication successful for operator: {} ({})", operator_email, operator_id);

    tracing::info!("About to call ws.protocols().on_upgrade()");

    // Upgrade the connection with proper subprotocol
    let response = ws.protocols(["access_token"])
        .on_upgrade(move |socket| async move {
            tracing::info!("!!! on_upgrade closure started for operator {}", operator_id);

            // Prepare client metadata
            let mut metadata = HashMap::new();
            metadata.insert("operator_id".to_string(), operator_id.clone());
            metadata.insert("operator_email".to_string(), operator_email.clone());

            tracing::info!("About to call transport.handle_connection for operator {}", operator_id);

            // Handle the connection (Watchtower will manage the full lifecycle)
            // This should block until the connection is closed
            let start = std::time::Instant::now();
            transport.handle_connection(socket, Some(metadata)).await;
            let duration = start.elapsed();

            tracing::info!(
                "!!! transport.handle_connection finished for operator {} after {:?}",
                operator_id,
                duration
            );
        });

    tracing::info!("Returning WebSocket upgrade response");
    response
}