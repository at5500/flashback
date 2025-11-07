use anyhow::Result;
use storehaus::prelude::*;
use bcrypt::verify;

#[tokio::main]
async fn main() -> Result<()> {
    println!("Testing login process...\n");

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
    let mut storehaus = StoreHaus::new(database_config).await?;

    // Register the user store
    storehaus.register_store(
        "users".to_string(),
        GenericStore::<flashback_backend::models::User>::new(storehaus.pool().clone(), None, None),
    )?;

    let user_store = storehaus.get_store::<GenericStore<flashback_backend::models::User>>("users")?;

    // Test email and password
    let test_email = "op@example.com";
    let test_password = "Excalibur9";

    println!("1. Looking for user with email: {}", test_email);

    // Find user by email (exactly as in auth.rs)
    let query = QueryBuilder::new()
        .filter(QueryFilter::eq("email", serde_json::json!(test_email)));

    let user_result = user_store.find_one(query).await;

    match user_result {
        Ok(Some(user)) => {
            println!("✅ User found!");
            println!("   ID: {}", user.id);
            println!("   Email: {}", user.email);
            println!("   Name: {}", user.name);
            println!("   Active: {}", user.is_active);
            println!("   Password hash length: {}", user.password_hash.len());
            println!("   Password hash preview: {}...", &user.password_hash[..20]);

            println!("\n2. Checking if user is active...");
            if !user.is_active {
                println!("❌ User is NOT active!");
                return Ok(());
            }
            println!("✅ User is active");

            println!("\n3. Verifying password: '{}'", test_password);
            match verify(test_password, &user.password_hash) {
                Ok(true) => {
                    println!("✅ Password verification SUCCESSFUL!");
                    println!("\n🎉 Login would succeed!");
                }
                Ok(false) => {
                    println!("❌ Password verification FAILED - password does not match");
                    println!("\n⚠️  This is the problem - bcrypt says passwords don't match");
                }
                Err(e) => {
                    println!("❌ Password verification ERROR: {}", e);
                }
            }
        }
        Ok(None) => {
            println!("❌ User NOT FOUND in database");
        }
        Err(e) => {
            println!("❌ Database error: {}", e);
        }
    }

    Ok(())
}