use anyhow::Result;
use bcrypt::verify;
use sqlx::PgPool;

#[tokio::main]
async fn main() -> Result<()> {
    println!("Testing login process...\n");

    // Connect to PostgreSQL directly
    let database_url = "postgresql://postgres:password@localhost:5432/flashback";
    let pool = PgPool::connect(database_url).await?;

    println!("✅ Connected to database\n");

    // Test credentials
    let test_email = "op@example.com";
    let test_password = "Excalibur9";

    println!("1. Looking for user with email: {}", test_email);

    // Query user from database
    let result = sqlx::query!(
        r#"
        SELECT id, email, name, password_hash, is_active
        FROM users
        WHERE email = $1
        "#,
        test_email
    )
    .fetch_optional(&pool)
    .await?;

    match result {
        Some(user) => {
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

                    // Let's also try with the default password
                    println!("\n4. Trying with default password '123456'...");
                    match verify("123456", &user.password_hash) {
                        Ok(true) => println!("✅ Default password '123456' WORKS!"),
                        Ok(false) => println!("❌ Default password '123456' also doesn't work"),
                        Err(e) => println!("❌ Error: {}", e),
                    }
                }
                Err(e) => {
                    println!("❌ Password verification ERROR: {}", e);
                }
            }
        }
        None => {
            println!("❌ User NOT FOUND in database");
        }
    }

    pool.close().await;
    Ok(())
}