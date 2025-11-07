use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use storehaus::prelude::*;
use uuid::Uuid;

/// Conversation status enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, Default)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum ConversationStatus {
    #[default]
    Waiting,
    Active,
    Closed,
}

impl ConversationStatus {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Waiting => "waiting",
            Self::Active => "active",
            Self::Closed => "closed",
        }
    }
}

impl std::fmt::Display for ConversationStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl From<String> for ConversationStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "waiting" => Self::Waiting,
            "active" => Self::Active,
            "closed" => Self::Closed,
            _ => Self::Waiting,
        }
    }
}

/// Conversation model
/// Represents a dialog between a telegram user and an user
#[model]
#[table(name = "conversations")]
pub struct Conversation {
    /// Conversation ID
    #[primary_key]
    #[field(create)]
    pub id: Uuid,

    /// Telegram user ID
    #[field(create)]
    pub telegram_user_id: i64,

    /// User ID (if assigned)
    #[field(create, update)]
    pub user_id: Option<Uuid>,

    /// Conversation status
    #[field(create, update)]
    pub status: ConversationStatus,

    /// Last message timestamp
    #[field(create, update)]
    pub last_message_at: Option<DateTime<Utc>>,

    /// Unread message count (for user)
    #[field(create, update)]
    pub unread_count: i32,
}

impl Conversation {
    /// Get status as enum (now just returns a reference)
    pub fn get_status(&self) -> &ConversationStatus {
        &self.status
    }

    /// Set status from enum
    pub fn set_status(&mut self, status: ConversationStatus) {
        self.status = status;
    }

    /// Check if conversation is active
    pub fn is_active(&self) -> bool {
        self.status == ConversationStatus::Active
    }

    /// Check if conversation is waiting for assignment
    pub fn is_waiting(&self) -> bool {
        self.status == ConversationStatus::Waiting
    }

    /// Check if conversation is closed
    pub fn is_closed(&self) -> bool {
        self.status == ConversationStatus::Closed
    }
}