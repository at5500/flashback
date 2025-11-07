use crate::models::{Conversation, Message, MessageTemplate, Setting, TelegramUser, User};
use anyhow::Result;
use storehaus::prelude::*;
use std::fs;
use tracing::info;

/// Initialize StoreHaus with all models and stores
pub async fn initialize_database() -> Result<StoreHaus> {
    info!("Initializing database...");

    // Load storehaus.toml configuration
    let config_content = fs::read_to_string("../../storehaus.toml")
        .or_else(|_| fs::read_to_string("storehaus.toml"))?;
    let config: toml::Value = toml::from_str(&config_content)?;

    // Extract database configuration
    let db_config = config
        .get("database")
        .ok_or_else(|| anyhow::anyhow!("Missing [database] section in storehaus.toml"))?;

    let database_config = DatabaseConfig::new(
        db_config
            .get("host")
            .and_then(|v| v.as_str())
            .unwrap_or("localhost")
            .to_string(),
        db_config
            .get("port")
            .and_then(|v| v.as_integer())
            .unwrap_or(5432) as u16,
        db_config
            .get("database")
            .and_then(|v| v.as_str())
            .unwrap_or("flashback")
            .to_string(),
        db_config
            .get("username")
            .and_then(|v| v.as_str())
            .unwrap_or("postgres")
            .to_string(),
        db_config
            .get("password")
            .and_then(|v| v.as_str())
            .unwrap_or("password")
            .to_string(),
        db_config
            .get("min_connections")
            .and_then(|v| v.as_integer())
            .unwrap_or(1) as u32,
        db_config
            .get("max_connections")
            .and_then(|v| v.as_integer())
            .unwrap_or(10) as u32,
        db_config
            .get("connection_timeout_seconds")
            .and_then(|v| v.as_integer())
            .unwrap_or(30) as u64,
        db_config
            .get("idle_timeout_seconds")
            .and_then(|v| v.as_integer())
            .unwrap_or(600) as u64,
        db_config
            .get("max_lifetime_seconds")
            .and_then(|v| v.as_integer())
            .unwrap_or(3600) as u64,
    );

    // Create StoreHaus instance
    let mut storehaus = StoreHaus::new(database_config).await?;
    info!("StoreHaus instance created");

    // Auto-migrate all models
    info!("Running auto-migrations...");
    storehaus.auto_migrate::<TelegramUser>(false).await?;
    info!("  ✓ TelegramUser table migrated");

    storehaus.auto_migrate::<User>(false).await?;
    info!("  ✓ User table migrated");

    storehaus.auto_migrate::<Conversation>(false).await?;
    info!("  ✓ Conversation table migrated");

    storehaus.auto_migrate::<Message>(false).await?;
    info!("  ✓ Message table migrated");

    storehaus.auto_migrate::<MessageTemplate>(false).await?;
    info!("  ✓ MessageTemplate table migrated");

    storehaus.auto_migrate::<Setting>(false).await?;
    info!("  ✓ Setting table migrated");

    // Register stores
    info!("Registering stores...");
    storehaus.register_store(
        "telegram_users".to_string(),
        GenericStore::<TelegramUser>::new(storehaus.pool().clone(), None, None),
    )?;

    storehaus.register_store(
        "users".to_string(),
        GenericStore::<User>::new(storehaus.pool().clone(), None, None),
    )?;

    storehaus.register_store(
        "conversations".to_string(),
        GenericStore::<Conversation>::new(storehaus.pool().clone(), None, None),
    )?;

    storehaus.register_store(
        "messages".to_string(),
        GenericStore::<Message>::new(storehaus.pool().clone(), None, None),
    )?;

    storehaus.register_store(
        "templates".to_string(),
        GenericStore::<MessageTemplate>::new(storehaus.pool().clone(), None, None),
    )?;

    storehaus.register_store(
        "settings".to_string(),
        GenericStore::<Setting>::new(storehaus.pool().clone(), None, None),
    )?;

    info!("Database initialization complete!");

    Ok(storehaus)
}

/// Seed database with initial data for development
pub async fn seed_database(storehaus: &StoreHaus) -> Result<()> {
    info!("Seeding database with initial data...");

    let user_store = storehaus.get_store::<GenericStore<User>>("users")?;

    // Create admin user
    let admin_password = bcrypt::hash("123456", bcrypt::DEFAULT_COST)?;
    let admin_user = User::new(
        Uuid::new_v4(),
        "admin@example.com".to_string(),
        "Administrator".to_string(),
        admin_password,
        true,
        true,
        true,
        None,
        None,
    );

    // Check if admin already exists
    let query = QueryBuilder::new().filter(QueryFilter::eq("email", serde_json::json!("admin@example.com")));
    match user_store.find_one(query).await {
        Ok(Some(_)) => {
            info!("  ✓ Admin user already exists");
        }
        Ok(None) | Err(_) => {
            user_store.create(admin_user, None).await?;
            info!("  ✓ Admin user created (admin@example.com / 123456)");
        }
    }

    // Create default operator
    let operator_password = bcrypt::hash("123456", bcrypt::DEFAULT_COST)?;
    let operator_user = User::new(
        Uuid::new_v4(),
        "op@example.com".to_string(),
        "Operator".to_string(),
        operator_password,
        true,
        false,
        true,
        None,
        None,
    );

    // Check if operator already exists
    let query = QueryBuilder::new().filter(QueryFilter::eq("email", serde_json::json!("op@example.com")));
    match user_store.find_one(query).await {
        Ok(Some(_)) => {
            info!("  ✓ Default operator already exists");
        }
        Ok(None) | Err(_) => {
            user_store.create(operator_user, None).await?;
            info!("  ✓ Default operator created (op@example.com / 123456)");
        }
    }

    // Create default templates
    let template_store = storehaus.get_store::<GenericStore<MessageTemplate>>("templates")?;

    let templates = vec![
        (
            "Greeting",
            "Hi! How can I help you?",
            "greeting",
        ),
        (
            "farewell",
            "Thank you for your request! Have a nice day!",
            "farewell",
        ),
        (
            "Waiting",
            "Please wait a minute while I clarify the information...",
            "waiting",
        ),
    ];

    for (title, content, category) in templates {
        let template = MessageTemplate::create(
            title.to_string(),
            content.to_string(),
            Some(category.to_string()),
            None,
        );

        // Check if template already exists
        let query = QueryBuilder::new().filter(QueryFilter::eq("title", serde_json::json!(title)));
        match template_store.find_one(query).await {
            Ok(Some(_)) => {}
            Ok(None) | Err(_) => {
                template_store.create(template, None).await?;
                info!("  ✓ Template '{}' created", title);
            }
        }
    }

    info!("Database seeding complete!");

    Ok(())
}
