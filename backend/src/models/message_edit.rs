use storehaus::prelude::*;
use uuid::Uuid;

/// Message edit history model
/// Represents a historical edit of a message
#[model]
#[table(name = "message_edits")]
pub struct MessageEdit {
    /// Edit ID
    #[primary_key]
    #[field(create)]
    pub id: Uuid,

    /// Message ID that was edited
    #[field(create)]
    pub message_id: Uuid,

    /// Previous content before edit
    #[field(create)]
    pub previous_content: String,

    /// User (operator) who made the edit (None if edited by user)
    #[field(create)]
    pub edited_by_user_id: Option<Uuid>,

    /// Reason for edit (optional)
    #[field(create)]
    pub edit_reason: Option<String>,
}

impl MessageEdit {
    /// Create a new message edit record
    pub fn new_edit(
        message_id: Uuid,
        previous_content: String,
        edited_by_user_id: Option<Uuid>,
        edit_reason: Option<String>,
    ) -> Self {
        Self::new(
            Uuid::new_v4(),
            message_id,
            previous_content,
            edited_by_user_id,
            edit_reason,
        )
    }
}