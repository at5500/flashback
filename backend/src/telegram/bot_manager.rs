use anyhow::Result;
use storehaus::StoreHaus;
use std::sync::Arc;
use teloxide::prelude::*;
use tokio::sync::RwLock;
use tokio::task::JoinHandle;
use tracing::{error, info};

use crate::websocket::{WebSocketManager, WebSocketEvent};
use super::bot::run_bot;

/// Status of the bot connection
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BotStatus {
    /// Bot is not running (no token configured)
    Disconnected,
    /// Bot is attempting to connect
    Connecting,
    /// Bot is connected and running
    Connected,
    /// Bot encountered an error
    Error,
}

/// Manages the Telegram bot lifecycle
pub struct BotManager {
    storehaus: Arc<StoreHaus>,
    ws_manager: Arc<WebSocketManager>,

    /// Current bot task handle
    bot_handle: Arc<RwLock<Option<JoinHandle<()>>>>,

    /// Current bot status
    status: Arc<RwLock<BotStatus>>,

    /// Current bot instance (for API calls)
    bot: Arc<RwLock<Option<Bot>>>,
}

impl BotManager {
    /// Create a new bot manager
    pub fn new(storehaus: Arc<StoreHaus>, ws_manager: Arc<WebSocketManager>) -> Self {
        Self {
            storehaus,
            ws_manager,
            bot_handle: Arc::new(RwLock::new(None)),
            status: Arc::new(RwLock::new(BotStatus::Disconnected)),
            bot: Arc::new(RwLock::new(None)),
        }
    }

    /// Get current bot status
    pub async fn status(&self) -> BotStatus {
        *self.status.read().await
    }

    /// Get bot instance for API calls (if connected)
    pub async fn bot(&self) -> Option<Bot> {
        self.bot.read().await.clone()
    }

    /// Start the bot with given token
    pub async fn start(&self, token: String) -> Result<()> {
        info!("[BOT_MANAGER] Starting bot with token: {}...", &token[..10.min(token.len())]);

        // Stop existing bot if running
        self.stop().await?;

        // Update status to connecting
        *self.status.write().await = BotStatus::Connecting;
        self.broadcast_status_change(BotStatus::Connecting).await;

        // Create bot instance
        let bot = Bot::new(token.clone());

        // Test bot connection with timeout
        match tokio::time::timeout(std::time::Duration::from_secs(5), bot.get_me()).await {
            Ok(Ok(me)) => {
                info!("[BOT_MANAGER] Bot connected successfully: @{}", me.username());
                *self.bot.write().await = Some(bot.clone());
                *self.status.write().await = BotStatus::Connected;
                self.broadcast_status_change(BotStatus::Connected).await;
            }
            Ok(Err(e)) => {
                error!("[BOT_MANAGER] Failed to connect bot: {}", e);
                *self.status.write().await = BotStatus::Error;
                self.broadcast_status_change(BotStatus::Error).await;
                return Err(anyhow::anyhow!("Failed to connect to Telegram: {}", e));
            }
            Err(_) => {
                error!("[BOT_MANAGER] Bot connection timeout");
                *self.status.write().await = BotStatus::Error;
                self.broadcast_status_change(BotStatus::Error).await;
                return Err(anyhow::anyhow!("Telegram connection timeout"));
            }
        }

        // Spawn bot task
        let storehaus = self.storehaus.clone();
        let ws_manager = self.ws_manager.clone();
        let status = self.status.clone();
        let bot_ref = self.bot.clone();

        let handle = tokio::spawn(async move {
            info!("[BOT_MANAGER] Bot task started");

            if let Err(e) = run_bot(token, storehaus, ws_manager).await {
                error!("[BOT_MANAGER] Bot task error: {}", e);
                *status.write().await = BotStatus::Error;
                *bot_ref.write().await = None;
            } else {
                info!("[BOT_MANAGER] Bot task ended gracefully");
                *status.write().await = BotStatus::Disconnected;
                *bot_ref.write().await = None;
            }
        });

        *self.bot_handle.write().await = Some(handle);

        info!("[BOT_MANAGER] Bot started successfully");
        Ok(())
    }

    /// Stop the bot
    pub async fn stop(&self) -> Result<()> {
        info!("[BOT_MANAGER] Stopping bot");

        // Abort existing task if running
        let mut handle = self.bot_handle.write().await;
        if let Some(h) = handle.take() {
            h.abort();
            info!("[BOT_MANAGER] Bot task aborted");
        }

        // Clear bot instance
        *self.bot.write().await = None;

        // Update status
        *self.status.write().await = BotStatus::Disconnected;
        self.broadcast_status_change(BotStatus::Disconnected).await;

        info!("[BOT_MANAGER] Bot stopped");
        Ok(())
    }

    /// Restart bot with new token
    pub async fn restart(&self, token: String) -> Result<()> {
        info!("[BOT_MANAGER] Restarting bot");
        self.stop().await?;

        // Small delay to ensure clean shutdown
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        self.start(token).await
    }

    /// Broadcast status change to all WebSocket clients
    async fn broadcast_status_change(&self, status: BotStatus) {
        let status_str = match status {
            BotStatus::Disconnected => "disconnected",
            BotStatus::Connecting => "connecting",
            BotStatus::Connected => "connected",
            BotStatus::Error => "error",
        };

        let event = WebSocketEvent::BotStatus {
            status: status_str.to_string(),
        };

        if let Err(e) = self.ws_manager.broadcast_event(event).await {
            error!("[BOT_MANAGER] Failed to broadcast status: {}", e);
        }
    }
}