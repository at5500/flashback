use serde::{Deserialize, Serialize};
use storehaus::prelude::*;

/// System settings stored as key-value pairs
#[model]
#[table(name = "settings")]
pub struct Setting {
    /// Setting name (unique identifier)
    #[field(create)]
    #[unique]
    pub id: String,

    /// Setting value
    #[field(create, update)]
    pub value: String,
}

impl Setting {
    /// Telegram bot token setting key
    pub const TELEGRAM_BOT_TOKEN: &'static str = "telegram_bot_token";
}

/// Request to update settings
#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub telegram_bot_token: Option<String>,
}

/// Response with settings (without sensitive data for non-admins)
#[derive(Debug, Serialize)]
pub struct SettingsResponse {
    pub has_telegram_bot_token: bool,
    pub telegram_bot_token_preview: Option<String>,
}

impl SettingsResponse {
    /// Create response from optional bot token
    pub fn from_bot_token(token: Option<String>) -> Self {
        let (has_token, preview) = if let Some(ref token) = token {
            let preview = if token.len() > 10 {
                format!("{}...{}", &token[..4], &token[token.len()-4..])
            } else {
                "***".to_string()
            };
            (true, Some(preview))
        } else {
            (false, None)
        };

        Self {
            has_telegram_bot_token: has_token,
            telegram_bot_token_preview: preview,
        }
    }
}