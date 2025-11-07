use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() != 3 {
        eprintln!("Usage: cargo run --bin check_password <password> <hash>");
        std::process::exit(1);
    }

    let password = &args[1];
    let hash = &args[2];

    match bcrypt::verify(password, hash) {
        Ok(true) => println!("✅ Password '{}' MATCHES the hash", password),
        Ok(false) => println!("❌ Password '{}' DOES NOT MATCH the hash", password),
        Err(e) => println!("❌ Error verifying password: {}", e),
    }
}