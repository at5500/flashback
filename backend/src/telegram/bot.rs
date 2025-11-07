use anyhow::Result;
use storehaus::StoreHaus;
use std::sync::Arc;
use teloxide::prelude::*;
use tracing::info;

use crate::websocket::WebSocketManager;
use super::handlers::handle_message;

/// Telegram bot state
#[derive(Clone)]
pub struct BotState {
    pub storehaus: Arc<StoreHaus>,
    pub ws_manager: Arc<WebSocketManager>,
}

/// Initialize and run the Telegram bot
pub async fn run_bot(bot_token: String, storehaus: Arc<StoreHaus>, ws_manager: Arc<WebSocketManager>) -> Result<()> {
    info!("Initializing Telegram bot...");

    let bot = Bot::new(bot_token);

    // Get bot info (skip if token is invalid to not block the application)
    // Use timeout to avoid blocking if Telegram API is slow
    match tokio::time::timeout(std::time::Duration::from_secs(5), bot.get_me()).await {
        Ok(Ok(me)) => {
            info!("Bot started: @{}", me.username());
        }
        Ok(Err(e)) => {
            info!("Telegram bot initialization skipped (invalid token): {}", e);
            return Ok(()); // Return early but don't fail the application
        }
        Err(_) => {
            info!("Telegram bot initialization skipped (timeout waiting for Telegram API)");
            return Ok(()); // Return early but don't fail the application
        }
    }

    let state = BotState { storehaus, ws_manager };

    // Setup message handler
    let handler = Update::filter_message().endpoint(handle_message);

    // Run the dispatcher
    Dispatcher::builder(bot, handler)
        .dependencies(dptree::deps![state])
        .enable_ctrlc_handler()
        .build()
        .dispatch()
        .await;

    Ok(())
}