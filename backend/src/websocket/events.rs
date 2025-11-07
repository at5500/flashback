use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// WebSocket event types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WebSocketEvent {
    /// New message received from telegram user
    MessageReceived {
        conversation_id: Uuid,
        message_id: Uuid,
        content: String,
        telegram_user_id: i64,
        telegram_user_name: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        media_type: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        media_url: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        file_name: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        file_size: Option<i64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        mime_type: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        duration: Option<i32>,
    },

    /// Message sent by operator
    MessageSent {
        conversation_id: Uuid,
        message_id: Uuid,
        content: String,
        user_id: Uuid,
        user_name: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        media_type: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        media_url: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        file_name: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        file_size: Option<i64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        mime_type: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        duration: Option<i32>,
    },

    /// New conversation created
    ConversationCreated {
        conversation_id: Uuid,
        telegram_user_id: i64,
        telegram_user_name: String,
    },

    /// Conversation status changed
    ConversationStatusChanged {
        conversation_id: Uuid,
        status: String,
        user_id: Option<Uuid>,
    },

    /// Conversation assigned to user
    ConversationAssigned {
        conversation_id: Uuid,
        user_id: Uuid,
        user_name: String,
    },

    /// Conversation closed
    ConversationClosed {
        conversation_id: Uuid,
    },

    /// User typing indicator
    UserTyping {
        conversation_id: Uuid,
        user_id: Uuid,
        user_name: String,
    },

    /// Telegram user typing indicator
    TelegramUserTyping {
        conversation_id: Uuid,
        telegram_user_id: i64,
    },

    /// User online status
    UserOnline {
        user_id: Uuid,
        user_name: String,
    },

    /// User offline status
    UserOffline {
        user_id: Uuid,
    },

    /// Message read
    MessageRead {
        message_id: Uuid,
        conversation_id: Uuid,
    },

    /// Error event
    Error {
        message: String,
        code: String,
    },

    /// Bot status changed
    BotStatus {
        status: String,
    },
}

impl WebSocketEvent {
    /// Get conversation ID from event if applicable
    pub fn conversation_id(&self) -> Option<Uuid> {
        match self {
            Self::MessageReceived { conversation_id, .. }
            | Self::MessageSent { conversation_id, .. }
            | Self::ConversationCreated { conversation_id, .. }
            | Self::ConversationStatusChanged { conversation_id, .. }
            | Self::ConversationAssigned { conversation_id, .. }
            | Self::ConversationClosed { conversation_id }
            | Self::UserTyping { conversation_id, .. }
            | Self::TelegramUserTyping { conversation_id, .. }
            | Self::MessageRead { conversation_id, .. } => Some(*conversation_id),
            _ => None,
        }
    }

    /// Convert event to JSON string
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }
}