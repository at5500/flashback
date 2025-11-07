use storehaus::prelude::*;
use uuid::Uuid;

/// Message template model
/// Represents a quick reply template for users (operators)
#[model]
#[table(name = "message_templates")]
pub struct MessageTemplate {
    /// Template ID
    #[primary_key]
    #[field(create)]
    pub id: Uuid,

    /// Template title
    #[field(create, update)]
    pub title: String,

    /// Template content
    #[field(create, update)]
    pub content: String,

    /// Category (optional)
    #[field(create, update)]
    pub category: Option<String>,

    /// User ID who created the template (optional)
    #[field(create)]
    pub user_id: Option<Uuid>,

    /// Usage count
    #[field(create, update)]
    pub usage_count: i32,
}

impl MessageTemplate {
    /// Create a new template with default values
    pub fn create(
        title: String,
        content: String,
        category: Option<String>,
        user_id: Option<Uuid>,
    ) -> Self {
        Self::new(
            Uuid::new_v4(),
            title,
            content,
            category,
            user_id,
            0,
        )
    }

    /// Increment usage count
    pub fn increment_usage(&mut self) {
        self.usage_count += 1;
    }
}