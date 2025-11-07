use chrono::Utc;
use serde_json::json;
use std::collections::HashMap;
use std::error::Error;
use storehaus::prelude::*;
use teloxide::{prelude::*, types::{Message as TgMessage, UserId}, ApiError, RequestError};
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::l10n::{format_message, get_locale};
use crate::models::{Conversation, ConversationStatus, Message, TelegramUser};
use crate::websocket::WebSocketEvent;

use super::bot::BotState;
use super::commands::{handle_help_command, handle_start_command};

/// Result of sending a message to user
#[derive(Debug)]
pub enum SendMessageResult {
    /// Message sent successfully with Telegram message ID
    Success(i64),
    /// User blocked the bot
    UserBlocked,
    /// Other error occurred
    Error(String),
}

/// Main message handler
pub async fn handle_message(bot: Bot, msg: TgMessage, state: BotState) -> ResponseResult<()> {
    // Handle commands
    if let Some(text) = msg.text() {
        if text.starts_with('/') {
            return match text {
                "/start" => handle_start_command(bot, msg).await,
                "/help" => handle_help_command(bot, msg).await,
                _ => {
                    bot.send_message(msg.chat.id, "Unknown command. Use /help")
                        .await?;
                    Ok(())
                }
            };
        }
    }

    // Handle regular messages
    if let Err(e) = process_user_message(&bot, &msg, &state).await {
        error!("Error processing message: {}", e);
        error!("Error details: {:?}", e);
        // Log the full error chain
        let mut source = e.source();
        let mut depth = 0;
        while let Some(err) = source {
            error!("  Caused by (depth {}): {}", depth, err);
            source = err.source();
            depth += 1;
        }
        bot.send_message(
            msg.chat.id,
            "There was an error processing your message. Please try again later.",
        )
        .await?;
    }

    Ok(())
}

/// Process regular user message
async fn process_user_message(bot: &Bot, msg: &TgMessage, state: &BotState) -> anyhow::Result<()> {
    let user = msg.from.as_ref().ok_or_else(|| anyhow::anyhow!("No user in message"))?;

    // Detect message type and extract content with metadata
    let (text, media_type, media_url, file_name, file_size, mime_type, duration) = if let Some(photo) = msg.photo() {
        // Handle photo message
        let caption = msg.caption().unwrap_or("");
        let largest_photo = photo.last().ok_or_else(|| anyhow::anyhow!("No photo in message"))?;
        let file_id = largest_photo.file.id.clone();
        let file_size = Some(largest_photo.file.size as i64);

        info!("Photo message from user {}: file_id={}, size={:?}, caption={}", user.id, file_id, file_size, caption);
        (caption.to_string(), Some("photo".to_string()), Some(file_id), None, file_size, None, None)
    } else if let Some(document) = msg.document() {
        // Handle document message
        let caption = msg.caption().unwrap_or("Document");
        let file_id = document.file.id.clone();
        let file_name = document.file_name.clone();
        let file_size = Some(document.file.size as i64);
        let mime_type = document.mime_type.clone();

        info!("Document message from user {}: file_id={}, name={:?}, size={:?}, mime={:?}", user.id, file_id, file_name, file_size, mime_type);
        (caption.to_string(), Some("document".to_string()), Some(file_id), file_name, file_size, mime_type, None)
    } else if let Some(video) = msg.video() {
        // Handle video message
        let caption = msg.caption().unwrap_or("Video");
        let file_id = video.file.id.clone();
        let file_size = Some(video.file.size as i64);
        let mime_type = video.mime_type.clone();
        let duration = Some(video.duration.seconds() as i32);

        info!("Video message from user {}: file_id={}, size={:?}, duration={:?}s", user.id, file_id, file_size, duration);
        (caption.to_string(), Some("video".to_string()), Some(file_id), None, file_size, mime_type, duration)
    } else if let Some(voice) = msg.voice() {
        // Handle voice message
        let file_id = voice.file.id.clone();
        let file_size = Some(voice.file.size as i64);
        let mime_type = voice.mime_type.clone();
        let duration = Some(voice.duration.seconds() as i32);

        info!("Voice message from user {}: file_id={}, duration={}s", user.id, file_id, duration.unwrap_or(0));
        ("Voice message".to_string(), Some("voice".to_string()), Some(file_id), None, file_size, mime_type, duration)
    } else if let Some(audio) = msg.audio() {
        // Handle audio message
        let caption = msg.caption().unwrap_or("Audio");
        let file_id = audio.file.id.clone();
        let file_name = audio.file_name.clone();
        let file_size = Some(audio.file.size as i64);
        let mime_type = audio.mime_type.clone();
        let duration = Some(audio.duration.seconds() as i32);

        info!("Audio message from user {}: file_id={}, name={:?}, duration={:?}s", user.id, file_id, file_name, duration);
        (caption.to_string(), Some("audio".to_string()), Some(file_id), file_name, file_size, mime_type, duration)
    } else if let Some(sticker) = msg.sticker() {
        // Handle sticker message
        let file_id = sticker.file.id.clone();
        let file_size = Some(sticker.file.size as i64);
        let emoji = sticker.emoji.clone().unwrap_or_default();

        info!("Sticker message from user {}: file_id={}, emoji={}", user.id, file_id, emoji);
        (format!("Sticker {}", emoji), Some("sticker".to_string()), Some(file_id), None, file_size, None, None)
    } else if let Some(animation) = msg.animation() {
        // Handle animation (GIF) message
        let caption = msg.caption().unwrap_or("Animation");
        let file_id = animation.file.id.clone();
        let file_name = animation.file_name.clone();
        let file_size = Some(animation.file.size as i64);
        let mime_type = animation.mime_type.clone();
        let duration = Some(animation.duration.seconds() as i32);

        info!("Animation message from user {}: file_id={}, name={:?}", user.id, file_id, file_name);
        (caption.to_string(), Some("animation".to_string()), Some(file_id), file_name, file_size, mime_type, duration)
    } else if let Some(text) = msg.text() {
        // Handle text message
        if text.is_empty() {
            bot.send_message(msg.chat.id, "Please, send text massage or media.")
                .await?;
            return Ok(());
        }
        info!("Text message from user {}: {}", user.id, text);
        (text.to_string(), None, None, None, None, None, None)
    } else {
        // Unsupported message type
        bot.send_message(msg.chat.id, "The message with this type is not supported yet.")
            .await?;
        return Ok(());
    };

    // Get or create Telegram user
    let user_store = state
        .storehaus
        .get_store::<GenericStore<TelegramUser>>("telegram_users")?;

    // Extract country code from language_code (e.g., "ru" -> "RU", "en-US" -> "US")
    let country_code = user.language_code.as_ref().and_then(|lang| {
        if lang.contains('-') {
            // Format: "en-US" -> "US"
            lang.split('-').nth(1).map(|s| s.to_uppercase())
        } else {
            // Format: "ru" -> "RU"
            Some(lang.to_uppercase())
        }
    });

    let telegram_user = match user_store.get_by_id(&(user.id.0 as i64)).await {
        Ok(Some(u)) => u,
        Ok(None) | Err(_) => {
            // Create new user
            let new_user = TelegramUser::new(
                user.id.0 as i64,
                user.username.clone(),
                user.first_name.clone(),
                user.last_name.clone(),
                None, // photo_url - will be fetched separately
                country_code.clone(),
                false,
            );
            user_store.create(new_user.clone(), Some(vec!["new_user".to_string()])).await?;
            info!("Created new Telegram user: {} with country_code: {:?}", user.id, country_code);
            new_user
        }
    };

    // Fetch and update profile photo if not already set
    if telegram_user.photo_url.is_none() {
        info!("Fetching profile photo for user {}", telegram_user.id);
        match update_user_profile_photo(&bot, telegram_user.id, &user_store).await {
            Ok(_) => info!("Profile photo updated for user {}", telegram_user.id),
            Err(e) => warn!("Failed to update profile photo for user {}: {}", telegram_user.id, e),
        }
    }

    // Get user's locale
    let locale = get_locale(telegram_user.country_code.as_deref());

    // Check if user is blocked
    if telegram_user.is_blocked {
        bot.send_message(msg.chat.id, &locale.bot.error)
            .await?;
        return Ok(());
    }

    // Get or create conversation
    let conversation_store = state
        .storehaus
        .get_store::<GenericStore<Conversation>>("conversations")?;

    // Try to find active or waiting conversation
    let query = QueryBuilder::new()
        .filter(QueryFilter::eq("telegram_user_id", json!(telegram_user.id)))
        .filter(QueryFilter::or(vec![
            QueryFilter::eq("status", json!(ConversationStatus::Waiting.as_str())),
            QueryFilter::eq("status", json!(ConversationStatus::Active.as_str())),
        ]));

    let (conversation, is_new_conversation) = match conversation_store.find_one(query).await {
        Ok(Some(conv)) => (conv, false),
        Ok(None) | Err(_) => {
            // Create new conversation
            let new_conv = Conversation::new(
                Uuid::new_v4(),
                telegram_user.id,
                None,
                ConversationStatus::Waiting,
                Some(Utc::now()),
                0,
            );
            conversation_store
                .create(new_conv.clone(), Some(vec!["new_conversation".to_string()]))
                .await?;
            info!("Created new conversation for user {}", telegram_user.id);
            (new_conv, true)
        }
    };

    // Send WebSocket event for new conversation
    if is_new_conversation {
        let ws_event = WebSocketEvent::ConversationCreated {
            conversation_id: conversation.id,
            telegram_user_id: telegram_user.id,
            telegram_user_name: telegram_user.full_name(),
        };
        info!("Broadcasting ConversationCreated event: conversation_id={}, user_id={}, user_name={}",
              conversation.id, telegram_user.id, telegram_user.full_name());
        match state.ws_manager.broadcast_event(ws_event).await {
            Ok(_) => info!("ConversationCreated event broadcast successfully"),
            Err(e) => error!("Failed to broadcast ConversationCreated event: {}", e),
        }

        // Send Telegram notifications to users with telegram_notifications_user_id set
        if let Err(e) = send_new_conversation_notifications_to_users(
            &bot,
            &state,
            &telegram_user,
            &text,
        ).await {
            error!("Failed to send Telegram notifications to users: {}", e);
        }
    }

    // Save message
    let message_store = state
        .storehaus
        .get_store::<GenericStore<Message>>("messages")?;

    let message = if let (Some(media_type), Some(media_url)) = (media_type.clone(), media_url.clone()) {
        // Message with media and full metadata
        Message::from_telegram_user_with_full_media(
            conversation.id,
            text.to_string(),
            msg.id.0 as i64,
            media_type,
            media_url,
            file_name.clone(),
            file_size,
            mime_type.clone().map(|m| m.to_string()),
            duration,
        )
    } else {
        // Text-only message
        Message::from_telegram_user(conversation.id, text.to_string(), msg.id.0 as i64)
    };

    message_store
        .create(message.clone(), Some(vec!["user_message".to_string()]))
        .await?;

    // Update conversation
    let conversation_id = conversation.id;
    let mut updated_conv = conversation;
    updated_conv.last_message_at = Some(Utc::now());
    updated_conv.unread_count += 1;

    conversation_store
        .update(&conversation_id, updated_conv, None)
        .await?;

    info!(
        "Message saved: conversation_id={}, message_id={}",
        conversation_id, message.id
    );

    // Send acknowledgment only for new conversations
    if is_new_conversation {
        bot.send_message(msg.chat.id, &locale.bot.welcome)
            .await?;
    }

    // Broadcast MessageReceived event to all connected users
    let telegram_user_name = telegram_user.username
        .clone()
        .or_else(|| Some(telegram_user.first_name.clone()))
        .unwrap_or_else(|| format!("User {}", telegram_user.id));

    let ws_event = WebSocketEvent::MessageReceived {
        conversation_id,
        message_id: message.id,
        content: text.to_string(),
        telegram_user_id: telegram_user.id,
        telegram_user_name,
        media_type: message.media_type.clone(),
        media_url: message.media_url.clone(),
        file_name: message.file_name.clone(),
        file_size: message.file_size,
        mime_type: message.mime_type.clone(),
        duration: message.duration,
    };

    if let Err(e) = state.ws_manager.broadcast_event(ws_event).await {
        warn!("Failed to broadcast MessageReceived event: {}", e);
    }

    Ok(())
}

/// Send message to Telegram user (called by users)
pub async fn send_message_to_telegram_user(
    bot: &Bot,
    chat_id: i64,
    text: &str,
) -> SendMessageResult {
    match bot.send_message(ChatId(chat_id), text).await {
        Ok(sent) => SendMessageResult::Success(sent.id.0 as i64),
        Err(RequestError::Api(api_error)) => {
            // Check if error is due to user blocking the bot
            match api_error {
                ApiError::BotBlocked => {
                    warn!("User {} blocked the bot", chat_id);
                    SendMessageResult::UserBlocked
                }
                ApiError::UserDeactivated => {
                    warn!("User {} deactivated their account", chat_id);
                    SendMessageResult::UserBlocked
                }
                ApiError::ChatNotFound => {
                    warn!("Chat {} not found", chat_id);
                    SendMessageResult::UserBlocked
                }
                _ => {
                    error!("Telegram API error for chat {}: {:?}", chat_id, api_error);
                    SendMessageResult::Error(format!("API error: {:?}", api_error))
                }
            }
        }
        Err(e) => {
            error!("Failed to send message to user {}: {}", chat_id, e);
            SendMessageResult::Error(e.to_string())
        }
    }
}

/// Fetch and update user's profile photo
async fn update_user_profile_photo(
    bot: &Bot,
    user_id: i64,
    user_store: &GenericStore<TelegramUser>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Try getting chat info first (works even with privacy restrictions)
    info!("Attempting to get chat info for user {}", user_id);
    match bot.get_chat(ChatId(user_id)).await {
        Ok(chat) => {
            if let Some(photo) = &chat.photo {
                info!("Found photo in chat info for user {}", user_id);

                // Get big photo file
                let file = match bot.get_file(&photo.big_file_id).await {
                    Ok(file) => {
                        info!("Got file path from chat photo for user {}: {}", user_id, file.path);
                        file
                    }
                    Err(e) => {
                        warn!("Failed to get file info from chat photo for user {}: {}", user_id, e);
                        return Ok(());
                    }
                };

                // Construct photo URL
                let token = bot.token();
                let photo_url = format!("https://api.telegram.org/file/bot{}/{}", token, file.path);
                info!("Constructed photo URL from chat for user {}: {}", user_id, photo_url);

                // Update user with photo URL
                if let Ok(Some(mut user)) = user_store.get_by_id(&user_id).await {
                    user.photo_url = Some(photo_url.clone());
                    info!("Updating user {} with photo_url from chat: {}", user_id, photo_url);
                    if let Err(e) = user_store.update(&user_id, user, None).await {
                        error!("Failed to update user photo URL for {}: {}", user_id, e);
                    } else {
                        info!("Successfully updated user {} with photo URL from chat", user_id);
                    }
                }
                return Ok(());
            }
        }
        Err(e) => {
            warn!("Failed to get chat info for user {}: {}", user_id, e);
        }
    }

    // Fallback: Get user profile photos (requires "Everybody" privacy setting)
    info!("Falling back to getUserProfilePhotos for user {}", user_id);
    let photos = match bot.get_user_profile_photos(UserId(user_id as u64)).await {
        Ok(photos) => {
            info!("Got {} photos for user {}", photos.total_count, user_id);
            photos
        }
        Err(e) => {
            warn!("Failed to fetch profile photos for user {}: {}", user_id, e);
            return Ok(()); // Don't fail the whole operation
        }
    };

    // Get the first photo if available
    if let Some(photo_sizes) = photos.photos.first() {
        info!("User {} has profile photo with {} sizes", user_id, photo_sizes.len());
        if let Some(photo) = photo_sizes.last() {
            // Get the file to construct URL
            let file = match bot.get_file(&photo.file.id).await {
                Ok(file) => {
                    info!("Got file path for user {}: {}", user_id, file.path);
                    file
                }
                Err(e) => {
                    warn!("Failed to get file info for user {}: {}", user_id, e);
                    return Ok(());
                }
            };

            // Construct photo URL
            let token = bot.token();
            let photo_url = format!("https://api.telegram.org/file/bot{}/{}", token, file.path);
            info!("Constructed photo URL for user {}: {}", user_id, photo_url);

            // Update user with photo URL
            if let Ok(Some(mut user)) = user_store.get_by_id(&user_id).await {
                user.photo_url = Some(photo_url.clone());
                info!("Updating user {} with photo_url: {}", user_id, photo_url);
                if let Err(e) = user_store.update(&user_id, user, None).await {
                    error!("Failed to update user photo URL for {}: {}", user_id, e);
                } else {
                    info!("Successfully updated user {} with photo URL", user_id);
                }
            }
        }
    } else {
        info!("User {} has no profile photos", user_id);
    }

    Ok(())
}

/// Send notifications about new conversation to users with telegram_notifications_user_id set
async fn send_new_conversation_notifications_to_users(
    bot: &Bot,
    state: &BotState,
    telegram_user: &TelegramUser,
    first_message: &str,
) -> anyhow::Result<()> {
    use crate::models::{User, UserSettings};

    // Get all active users (operators/admins)
    let user_store = state
        .storehaus
        .get_store::<GenericStore<User>>("users")?;

    let query = QueryBuilder::new()
        .filter(QueryFilter::eq("is_active", json!(true)));

    let users = user_store.find(query).await?;

    info!("Checking {} active users for Telegram notification settings", users.len());

    for user in users {
        // Parse user settings
        let settings: Option<UserSettings> = user.settings
            .and_then(|s| serde_json::from_str(&s).ok());

        // Check if user has telegram_notifications_user_id set
        if let Some(settings) = settings {
            if let Some(telegram_user_id) = settings.telegram_notifications_user_id {
                if !telegram_user_id.is_empty() {
                    // Parse telegram user ID
                    if let Ok(chat_id) = telegram_user_id.parse::<i64>() {
                        // Prepare notification message
                        let message_preview = if first_message.len() > 50 {
                            format!("{}...", &first_message[..50])
                        } else {
                            first_message.to_string()
                        };

                        let notification = format!(
                            "🔔 <b>New conversation</b>\n\n\
                            From: {}\n\
                            Message: {}\n\n\
                            Please log in to the system to respond.",
                            telegram_user.full_name(),
                            message_preview
                        );

                        // Send notification
                        match bot.send_message(ChatId(chat_id), notification)
                            .parse_mode(teloxide::types::ParseMode::Html)
                            .await
                        {
                            Ok(_) => {
                                info!("Sent new conversation notification to user {} (Telegram ID: {})",
                                    user.email, chat_id);
                            }
                            Err(e) => {
                                warn!("Failed to send notification to user {} (Telegram ID: {}): {}",
                                    user.email, chat_id, e);
                            }
                        }
                    } else {
                        warn!("Invalid Telegram user ID format for user {}: {}", user.email, telegram_user_id);
                    }
                }
            }
        }
    }

    Ok(())
}