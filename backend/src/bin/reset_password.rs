use anyhow::Result;
use std::env;
use storehaus::prelude::*;

#[tokio::main]
async fn main() -> Result<()> {
    // Get email and new password from command line
    let args: Vec<String> = env::args().collect();

    if args.len() != 3 {
        eprintln!("Usage: cargo run --bin reset_password <email> <new_password>");
        eprintln!("Example: cargo run --bin reset_password op@example.com 123456");
        std::process::exit(1);
    }

    let email = &args[1];
    let new_password = &args[2];

    println!("Resetting password for: {}", email);

    // Load database configuration
    let config_content = std::fs::read_to_string("../../storehaus.toml")
        .or_else(|_| std::fs::read_to_string("storehaus.toml"))?;
    let config: toml::Value = toml::from_str(&config_content)?;

    let db_config = config
        .get("database")
        .ok_or_else(|| anyhow::anyhow!("Missing [database] section"))?;

    let database_config = DatabaseConfig::new(
        db_config.get("host").and_then(|v| v.as_str()).unwrap_or("localhost").to_string(),
        db_config.get("port").and_then(|v| v.as_integer()).unwrap_or(5432) as u16,
        db_config.get("database").and_then(|v| v.as_str()).unwrap_or("flashback").to_string(),
        db_config.get("username").and_then(|v| v.as_str()).unwrap_or("postgres").to_string(),
        db_config.get("password").and_then(|v| v.as_str()).unwrap_or("password").to_string(),
        1,
        5,
        30,
        600,
        3600,
    );

    // Connect to database
    let storehaus = StoreHaus::new(database_config).await?;
    let user_store = storehaus.get_store::<GenericStore<flashback_backend::models::User>>("users")?;

    // Find user by email
    let query = QueryBuilder::new()
        .filter(QueryFilter::eq("email", serde_json::json!(email)));

    let mut user = user_store
        .find_one(query)
        .await?
        .ok_or_else(|| anyhow::anyhow!("User with email '{}' not found", email))?;

    println!("Found user: {} ({})", user.name, user.email);

    // Hash new password
    let password_hash = bcrypt::hash(new_password, bcrypt::DEFAULT_COST)?;
    println!("New password hashed successfully");

    // Update password
    user.password_hash = password_hash;

    // Save to database
    let user_id = user.id.clone();
    user_store.update(&user_id, user, None).await?;

    println!("✅ Password reset successfully!");
    println!("You can now login with:");
    println!("  Email: {}", email);
    println!("  Password: {}", new_password);

    Ok(())
}