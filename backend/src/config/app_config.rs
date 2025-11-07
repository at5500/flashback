use anyhow::Result;
use dotenv::dotenv;
use serde::{Deserialize, Serialize};
use std::env;

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// Database URL
    pub database_url: String,

    /// JWT secret key
    pub jwt_secret: String,

    /// JWT expiration time in seconds
    pub jwt_expiration: u64,

    /// Server host
    pub host: String,

    /// Server port
    pub port: u16,

    /// Environment (development, production)
    pub environment: String,
}

impl AppConfig {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        // Load .env file if it exists
        dotenv().ok();

        let config = Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://postgres:password@localhost:5432/flashback".to_string()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "development_secret_change_in_production".to_string()),
            jwt_expiration: env::var("JWT_EXPIRATION")
                .unwrap_or_else(|_| "900".to_string())
                .parse()?,
            host: env::var("BACKEND_HOST")
                .unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("BACKEND_PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()?,
            environment: env::var("ENVIRONMENT")
                .unwrap_or_else(|_| "development".to_string()),
        };

        Ok(config)
    }

    /// Check if running in development mode
    pub fn is_development(&self) -> bool {
        self.environment == "development"
    }

    /// Check if running in production mode
    pub fn is_production(&self) -> bool {
        self.environment == "production"
    }

    /// Get server address
    pub fn server_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}