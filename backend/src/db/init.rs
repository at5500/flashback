use crate::models::{Conversation, Message, MessageTemplate, Setting, TelegramUser, User};
use anyhow::{anyhow, Result};
use storehaus::prelude::*;
use std::env;
use std::fs;
use tracing::info;

/// Initialize StoreHaus with all models and stores
pub async fn initialize_database() -> Result<StoreHaus> {
    info!("Initializing database...");

    // Database configuration priority:
    // 1. EXTERNAL_DB_* - for external database on separate server (all required)
    // 2. DB_* - for local database via Docker (all required)
    // 3. storehaus.toml - fallback for local development without Docker

    let (database_config, db_password) = if env::var("EXTERNAL_DB_HOST").ok().filter(|h| !h.is_empty()).is_some() {
        info!("Using external database from environment variables (EXTERNAL_DB_*)");

        // If EXTERNAL_DB_HOST is set and not empty, all other external DB parameters are required
        let host = env::var("EXTERNAL_DB_HOST")
            .map_err(|_| anyhow!("EXTERNAL_DB_HOST is required when using external database"))?;

        let port = env::var("EXTERNAL_DB_PORT")
            .map_err(|_| anyhow!("EXTERNAL_DB_PORT is required when using external database"))?
            .parse::<u16>()
            .map_err(|_| anyhow!("EXTERNAL_DB_PORT must be a valid port number"))?;

        let database = env::var("EXTERNAL_DB_NAME")
            .map_err(|_| anyhow!("EXTERNAL_DB_NAME is required when using external database"))?;

        let username = env::var("EXTERNAL_DB_USER")
            .map_err(|_| anyhow!("EXTERNAL_DB_USER is required when using external database"))?;

        let password = env::var("EXTERNAL_DB_PASSWORD")
            .map_err(|_| anyhow!("EXTERNAL_DB_PASSWORD is required when using external database"))?;

        // Optional connection pool parameters with defaults
        let min_connections = env::var("DB_MIN_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1);
        let max_connections = env::var("DB_MAX_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10);
        let connection_timeout = env::var("DB_CONNECTION_TIMEOUT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30);
        let idle_timeout = env::var("DB_IDLE_TIMEOUT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(600);
        let max_lifetime = env::var("DB_MAX_LIFETIME")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(3600);

        info!("Connecting to external database at {}:{}/{}", host, port, database);

        let config = DatabaseConfig::new(
            host,
            port,
            database,
            username,
            password.clone(),
            min_connections,
            max_connections,
            connection_timeout,
            idle_timeout,
            max_lifetime,
        );

        (config, password)
    } else if env::var("DB_HOST").ok().filter(|h| !h.is_empty()).is_some() {
        info!("Using local database from environment variables (DB_*)");

        // Local database configuration via environment variables (Docker mode)
        // All DB_* parameters are required
        // Note: DB_HOST is checked to be non-empty above (external-db override sets it to "")
        let host = env::var("DB_HOST")
            .map_err(|_| anyhow!("DB_HOST is required when using DB_* configuration"))?;

        let port = env::var("DB_PORT")
            .map_err(|_| anyhow!("DB_PORT is required when using DB_* configuration"))?
            .parse::<u16>()
            .map_err(|_| anyhow!("DB_PORT must be a valid port number"))?;

        let database = env::var("DB_NAME")
            .map_err(|_| anyhow!("DB_NAME is required when using DB_* configuration"))?;

        let username = env::var("DB_USER")
            .map_err(|_| anyhow!("DB_USER is required when using DB_* configuration"))?;

        let password = env::var("DB_PASSWORD")
            .map_err(|_| anyhow!("DB_PASSWORD is required when using DB_* configuration"))?;

        // Optional connection pool parameters with defaults
        let min_connections = env::var("DB_MIN_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1);
        let max_connections = env::var("DB_MAX_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10);
        let connection_timeout = env::var("DB_CONNECTION_TIMEOUT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30);
        let idle_timeout = env::var("DB_IDLE_TIMEOUT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(600);
        let max_lifetime = env::var("DB_MAX_LIFETIME")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(3600);

        info!("Connecting to local database at {}:{}/{}", host, port, database);

        let config = DatabaseConfig::new(
            host,
            port,
            database,
            username,
            password.clone(),
            min_connections,
            max_connections,
            connection_timeout,
            idle_timeout,
            max_lifetime,
        );

        (config, password)
    } else {
        info!("Using local database from storehaus.toml (local development mode)");

        // Load storehaus.toml configuration
        let config_content = fs::read_to_string("../../storehaus.toml")
            .or_else(|_| fs::read_to_string("storehaus.toml"))?;
        let config: toml::Value = toml::from_str(&config_content)?;

        // Extract database configuration
        let db_config = config
            .get("database")
            .ok_or_else(|| anyhow!("Missing [database] section in storehaus.toml"))?;

        let password = db_config
            .get("password")
            .and_then(|v| v.as_str())
            .unwrap_or("password")
            .to_string();

        let config = DatabaseConfig::new(
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
            password.clone(),
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

        (config, password)
    };

    // Security validation for production environment
    let environment = env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string());
    if environment == "production" {
        info!("Running security validation for production environment...");

        // Check database password
        let insecure_passwords = vec!["password", "postgres", "admin", "123456", "12345678"];
        if insecure_passwords.contains(&db_password.as_str()) {
            return Err(anyhow!(
                "SECURITY ERROR: Insecure database password detected in production! \
                Password '{}' is not allowed. Please use a strong, randomly generated password. \
                Use scripts/generate-secrets.sh to generate secure credentials.",
                db_password
            ));
        }

        if db_password.len() < 16 {
            return Err(anyhow!(
                "SECURITY ERROR: Database password is too short for production! \
                Minimum length is 16 characters, current length is {}. \
                Use scripts/generate-secrets.sh to generate secure credentials.",
                db_password.len()
            ));
        }

        // Check JWT secret
        let jwt_secret = env::var("JWT_SECRET").unwrap_or_default();
        let insecure_jwt_secrets = vec![
            "your_secret_key_change_in_production",
            "development_secret_change_in_production",
            "change_me_in_production",
            "secret",
            "jwt_secret",
        ];

        if insecure_jwt_secrets.iter().any(|s| jwt_secret.contains(s)) {
            return Err(anyhow!(
                "SECURITY ERROR: Insecure JWT_SECRET detected in production! \
                The current JWT_SECRET contains default/insecure values. \
                Use scripts/generate-secrets.sh to generate secure credentials."
            ));
        }

        if jwt_secret.len() < 32 {
            return Err(anyhow!(
                "SECURITY ERROR: JWT_SECRET is too short for production! \
                Minimum length is 32 characters, current length is {}. \
                Use scripts/generate-secrets.sh to generate secure credentials.",
                jwt_secret.len()
            ));
        }

        info!("✓ Security validation passed");
    }

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
