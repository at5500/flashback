use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use storehaus::prelude::*;
use uuid::Uuid;

/// User model
/// Unified user model with role flags for operators and admins
#[model]
#[table(name = "users")]
pub struct User {
    /// User ID
    #[primary_key]
    #[field(create)]
    pub id: Uuid,

    /// Email for login
    #[field(create, update)]
    #[unique]
    pub email: String,

    /// User name
    #[field(create, update)]
    pub name: String,

    /// Password hash (bcrypt)
    #[field(create, update)]
    pub password_hash: String,

    /// Is user an operator
    #[field(create, update)]
    pub is_operator: bool,

    /// Is user an admin
    #[field(create, update)]
    pub is_admin: bool,

    /// Is user active
    #[field(create, update)]
    pub is_active: bool,

    /// Last seen timestamp
    #[field(create, update)]
    pub last_seen_at: Option<DateTime<Utc>>,

    /// User settings (JSON string)
    #[field(create, update)]
    pub settings: Option<String>,
}

/// User settings structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    #[serde(default = "default_theme")]
    pub theme: String, // "light" or "dark"

    #[serde(default = "default_language")]
    pub language: String, // "ru" or "en"

    #[serde(default = "default_true")]
    pub notifications_enabled: bool,

    #[serde(default = "default_true")]
    pub notification_sound_enabled: bool,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub telegram_notifications_user_id: Option<String>,
}

fn default_theme() -> String {
    "light".to_string()
}

fn default_language() -> String {
    "en".to_string()
}

fn default_true() -> bool {
    true
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            language: default_language(),
            notifications_enabled: true,
            notification_sound_enabled: true,
            telegram_notifications_user_id: None,
        }
    }
}

impl User {
    /// Check if user is online (last seen within 5 minutes)
    pub fn is_online(&self) -> bool {
        if let Some(last_seen) = self.last_seen_at {
            let now = Utc::now();
            let diff = now.signed_duration_since(last_seen);
            diff.num_minutes() < 5
        } else {
            false
        }
    }

    /// Check if user has operator access
    pub fn has_operator_access(&self) -> bool {
        self.is_active && (self.is_operator || self.is_admin)
    }

    /// Check if user has admin access
    pub fn has_admin_access(&self) -> bool {
        self.is_active && self.is_admin
    }
}

/// DTO for user response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub is_operator: bool,
    pub is_admin: bool,
    pub is_active: bool,
    pub last_seen_at: Option<DateTime<Utc>>,
    pub is_online: bool,
    pub created_at: DateTime<Utc>,
    pub settings: Option<UserSettings>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        // Check is_online before moving user fields
        let is_online = user.is_online();

        // Parse settings from JSON string or use default
        let settings = user.settings
            .and_then(|s| serde_json::from_str::<UserSettings>(&s).ok())
            .or(Some(UserSettings::default()));

        Self {
            id: user.id,
            email: user.email,
            name: user.name,
            is_operator: user.is_operator,
            is_admin: user.is_admin,
            is_active: user.is_active,
            last_seen_at: user.last_seen_at,
            is_online,
            created_at: user.__created_at__,
            settings,
        }
    }
}