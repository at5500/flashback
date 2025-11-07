use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::AppError;

/// JWT Claims
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// User ID
    pub sub: String,
    /// User email
    pub email: String,
    /// Issued at
    pub iat: i64,
    /// Expiration time
    pub exp: i64,
}

impl Claims {
    /// Create new claims for a user
    pub fn new(user_id: Uuid, email: String, expiration_seconds: u64) -> Self {
        let now = Utc::now();
        let exp = now + Duration::seconds(expiration_seconds as i64);

        Self {
            sub: user_id.to_string(),
            email,
            iat: now.timestamp(),
            exp: exp.timestamp(),
        }
    }

    /// Get user ID from claims
    pub fn user_id(&self) -> Result<Uuid, AppError> {
        Uuid::parse_str(&self.sub).map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))
    }
}

/// Generate JWT token for a user
pub fn generate_token(
    user_id: Uuid,
    email: String,
    secret: &str,
    expiration: u64,
) -> Result<String, AppError> {
    let claims = Claims::new(user_id, email, expiration);
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    Ok(token)
}

/// Verify and decode JWT token
pub fn verify_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_and_verify_token() {
        let user_id = Uuid::new_v4();
        let email = "test@example.com".to_string();
        let secret = "test_secret";
        let expiration = 3600;

        let token = generate_token(user_id, email.clone(), secret, expiration).unwrap();
        let claims = verify_token(&token, secret).unwrap();

        assert_eq!(claims.email, email);
        assert_eq!(claims.user_id().unwrap(), user_id);
    }

    #[test]
    fn test_invalid_token() {
        let secret = "test_secret";
        let result = verify_token("invalid_token", secret);
        assert!(result.is_err());
    }

    #[test]
    fn test_wrong_secret() {
        let user_id = Uuid::new_v4();
        let email = "test@example.com".to_string();
        let secret = "test_secret";
        let wrong_secret = "wrong_secret";
        let expiration = 3600;

        let token = generate_token(user_id, email, secret, expiration).unwrap();
        let result = verify_token(&token, wrong_secret);
        assert!(result.is_err());
    }
}