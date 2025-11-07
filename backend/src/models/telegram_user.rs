use storehaus::prelude::*;

/// Telegram user model
/// Represents a user who interacts with the bot
#[model]
#[table(name = "telegram_users")]
pub struct TelegramUser {
    /// Telegram user ID (same as chat_id in Telegram)
    #[primary_key]
    #[field(create)]
    pub id: i64,

    /// Username (@username)
    #[field(create, update)]
    pub username: Option<String>,

    /// First name
    #[field(create, update)]
    pub first_name: String,

    /// Last name
    #[field(create, update)]
    pub last_name: Option<String>,

    /// Profile photo URL from Telegram
    #[field(create, update)]
    pub photo_url: Option<String>,

    /// User's country code (ISO 3166-1 alpha-2, e.g., "RU", "US")
    #[field(create, update)]
    pub country_code: Option<String>,

    /// Is user blocked from using the bot
    #[field(create, update)]
    pub is_blocked: bool,
}

impl TelegramUser {
    /// Get full name
    pub fn full_name(&self) -> String {
        match &self.last_name {
            Some(last) => format!("{} {}", self.first_name, last),
            None => self.first_name.clone(),
        }
    }

    /// Get display name (username or full name)
    pub fn display_name(&self) -> String {
        self.username
            .as_ref()
            .map(|u| format!("@{}", u))
            .unwrap_or_else(|| self.full_name())
    }
}