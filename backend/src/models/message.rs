use storehaus::prelude::*;
use uuid::Uuid;

/// Message model
/// Represents a message in a conversation
#[model]
#[table(name = "messages")]
pub struct Message {
    /// Message ID
    #[primary_key]
    #[field(create)]
    pub id: Uuid,

    /// Conversation ID
    #[field(create)]
    pub conversation_id: Uuid,

    /// From operator (true) or from telegram user (false)
    #[field(create)]
    pub from_user: bool,

    /// Message content
    #[field(create)]
    pub content: String,

    /// Is message read
    #[field(create, update)]
    pub read: bool,

    /// Telegram message ID (if sent by bot)
    #[field(create, update)]
    pub telegram_message_id: Option<i64>,

    /// Media type: "photo", "document", "video", "voice", "audio", "sticker", "animation"
    #[field(create)]
    pub media_type: Option<String>,

    /// Media URL or file_id from Telegram
    #[field(create)]
    pub media_url: Option<String>,

    /// File name (for documents)
    #[field(create)]
    pub file_name: Option<String>,

    /// File size in bytes
    #[field(create)]
    pub file_size: Option<i64>,

    /// MIME type (for documents and media)
    #[field(create)]
    pub mime_type: Option<String>,

    /// Duration in seconds (for audio/video/voice)
    #[field(create)]
    pub duration: Option<i32>,
}

impl Message {
    /// Create a text message from telegram user
    pub fn from_telegram_user(
        conversation_id: Uuid,
        content: String,
        telegram_message_id: i64,
    ) -> Self {
        Self::new(
            Uuid::new_v4(),
            conversation_id,
            false,
            content,
            false,
            Some(telegram_message_id),
            None,
            None,
            None,
            None,
            None,
            None,
        )
    }

    /// Create a message from user with simple media (photo)
    pub fn from_telegram_user_with_media(
        conversation_id: Uuid,
        content: String,
        telegram_message_id: i64,
        media_type: String,
        media_url: String,
    ) -> Self {
        Self::new(
            Uuid::new_v4(),
            conversation_id,
            false,
            content,
            false,
            Some(telegram_message_id),
            Some(media_type),
            Some(media_url),
            None,
            None,
            None,
            None,
        )
    }

    /// Create a message from user with full media details
    pub fn from_telegram_user_with_full_media(
        conversation_id: Uuid,
        content: String,
        telegram_message_id: i64,
        media_type: String,
        media_url: String,
        file_name: Option<String>,
        file_size: Option<i64>,
        mime_type: Option<String>,
        duration: Option<i32>,
    ) -> Self {
        Self::new(
            Uuid::new_v4(),
            conversation_id,
            false,
            content,
            false,
            Some(telegram_message_id),
            Some(media_type),
            Some(media_url),
            file_name,
            file_size,
            mime_type,
            duration,
        )
    }

    /// Create a text message from user (operator)
    pub fn from_user_message(
        conversation_id: Uuid,
        content: String,
    ) -> Self {
        Self::new(
            Uuid::new_v4(),
            conversation_id,
            true,
            content,
            true, // User (oepartor) messages are marked as read by default
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
    }
}
