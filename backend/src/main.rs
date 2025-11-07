use anyhow::Result;
use clap::Parser;
use std::sync::Arc;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use flashback_backend::{
    api::create_router,
    config::AppConfig,
    db::{initialize_database, seed_database},
    models::Setting,
    telegram::BotManager,
    websocket::WebSocketManager,
};
use storehaus::prelude::*;
use watchtower::prelude::*;

/// FlashBack Backend - Telegram Support System
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Increase logging verbosity (-v, -vv, -vvv, -vvvv, -vvvvv)
    #[arg(short = 'v', long = "verbose", action = clap::ArgAction::Count)]
    verbose: u8,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Parse command line arguments
    let args = Args::parse();

    // Load configuration
    let config = AppConfig::from_env()?;

    // Determine log level from environment variable or command line flags
    let log_level = std::env::var("LOG_LEVEL")
        .ok()
        .or_else(|| {
            // Map verbosity flags to log levels
            match args.verbose {
                0 => None, // Will use default
                1 => Some("info".to_string()),
                2 => Some("debug".to_string()),
                3 => Some("trace".to_string()),
                4 => Some("trace".to_string()), // -vvvv = trace with more details
                _ => Some("trace".to_string()), // -vvvvv = maximum trace
            }
        });

    // Build log filter based on environment and log level
    let log_filter = if let Some(level) = log_level {
        // Use specified log level for all components
        format!(
            "flashback_backend={},tower_http={},storehaus={},watchtower={}",
            level, level, level, level
        )
    } else if config.is_development() {
        // Development default: debug for flashback, info for libraries
        "flashback_backend=debug,tower_http=info,storehaus=info,watchtower=info".to_string()
    } else {
        // Production default: info only
        "flashback_backend=info,tower_http=info,storehaus=warn,watchtower=warn".to_string()
    };

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| log_filter.into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting Telegram Support System...");
    info!("Configuration loaded");
    info!("Environment: {}", config.environment);
    info!("Server will listen on: {}", config.server_address());

    // Initialize database
    let storehaus = initialize_database().await?;
    info!("Database initialized");

    // Seed database in development
    if config.is_development() {
        if let Err(e) = seed_database(&storehaus).await {
            error!("Error seeding database: {}", e);
        }
    }

    let storehaus = Arc::new(storehaus);

    // Create WebSocket manager
    let ws_config = WebSocketServerConfig::default()
        .with_max_connections(1000)
        .with_broadcast_buffer(500)
        .with_ping_interval(30);
    let ws_manager = Arc::new(WebSocketManager::new(ws_config));
    info!("WebSocket manager initialized");

    // Create Bot Manager
    let bot_manager = Arc::new(BotManager::new(storehaus.clone(), ws_manager.clone()));
    info!("Bot manager initialized");

    // Try to load bot token from database and start bot
    let settings_store = storehaus
        .get_store::<GenericStore<Setting>>("settings")
        .map_err(|e| anyhow::anyhow!("Failed to get settings store: {}", e))?;

    let query = QueryBuilder::new()
        .filter(QueryFilter::eq("id", serde_json::json!(Setting::TELEGRAM_BOT_TOKEN)));

    if let Ok(Some(setting)) = settings_store.find_one(query).await {
        info!("Bot token found in database, starting bot...");
        if let Err(e) = bot_manager.start(setting.value).await {
            error!("Failed to start bot from database token: {}", e);
        }
    } else {
        info!("No bot token found in database. Bot will start when configured via settings.");
    }

    // Create HTTP API router
    let app = create_router(
        config.clone(),
        storehaus.clone(),
        ws_manager.clone(),
        bot_manager.clone(),
    );

    // Start HTTP server
    let listener = tokio::net::TcpListener::bind(&config.server_address()).await?;
    info!("🚀 Server listening on http://{}", config.server_address());
    info!("📡 API available at http://{}/api", config.server_address());

    // Run server with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .map_err(|e| anyhow::anyhow!("Server error: {}", e))?;

    info!("Server shutting down gracefully...");

    // Stop bot manager
    if let Err(e) = bot_manager.stop().await {
        error!("Error stopping bot manager: {}", e);
    }

    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install Ctrl+C handler");
    info!("Ctrl+C received, shutting down...");
}