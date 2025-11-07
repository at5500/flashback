use std::sync::Arc;
use uuid::Uuid;
use watchtower::prelude::*;

use crate::websocket::events::WebSocketEvent;

/// WebSocket manager using Watchtower WebSocketServerTransport
pub struct WebSocketManager {
    transport: Arc<WebSocketServerTransport>,
}

impl WebSocketManager {
    /// Create new WebSocket manager
    pub fn new(config: WebSocketServerConfig) -> Self {
        let transport = Arc::new(WebSocketServerTransport::new(config));

        Self { transport }
    }

    /// Get transport for use in Axum router
    pub fn transport(&self) -> Arc<WebSocketServerTransport> {
        self.transport.clone()
    }

    /// Broadcast WebSocketEvent to all connected users
    pub async fn broadcast_event(&self, event: WebSocketEvent) -> Result<(), String> {
        let json = serde_json::to_value(&event)
            .map_err(|e| format!("Failed to serialize WebSocketEvent: {}", e))?;

        let watchtower_event = Event::new(event_type_from_ws_event(&event), json);

        self.transport
            .publish(watchtower_event)
            .await
            .map_err(|e| format!("Failed to publish event: {}", e))?;

        Ok(())
    }

    /// Send event to specific user
    pub async fn send_to_user(
        &self,
        user_id: &Uuid,
        event: WebSocketEvent,
    ) -> Result<(), String> {
        let json = serde_json::to_value(&event)
            .map_err(|e| format!("Failed to serialize WebSocketEvent: {}", e))?;

        let watchtower_event = Event::new(event_type_from_ws_event(&event), json);

        let manager = self.transport.connection_manager();

        // Convert user_id to ClientId (both are Uuid)
        manager
            .send_to_client(user_id, &watchtower_event)
            .await
    }

    /// Get count of active connections
    pub async fn active_connections(&self) -> usize {
        self.transport.active_connections().await
    }
}

/// Extract event type from WebSocketEvent
fn event_type_from_ws_event(event: &WebSocketEvent) -> &'static str {
    match event {
        WebSocketEvent::MessageReceived { .. } => "message.received",
        WebSocketEvent::MessageSent { .. } => "message.sent",
        WebSocketEvent::ConversationCreated { .. } => "conversation.created",
        WebSocketEvent::ConversationStatusChanged { .. } => "conversation.status_changed",
        WebSocketEvent::ConversationAssigned { .. } => "conversation.assigned",
        WebSocketEvent::ConversationClosed { .. } => "conversation.closed",
        WebSocketEvent::UserTyping { .. } => "user.typing",
        WebSocketEvent::TelegramUserTyping { .. } => "telegram_user.typing",
        WebSocketEvent::UserOnline { .. } => "user.online",
        WebSocketEvent::UserOffline { .. } => "user.offline",
        WebSocketEvent::MessageRead { .. } => "message.read",
        WebSocketEvent::Error { .. } => "error",
        WebSocketEvent::BotStatus { .. } => "bot.status",
    }
}