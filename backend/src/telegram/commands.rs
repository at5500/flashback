use teloxide::{prelude::*, types::Message};

/// Handle /start command
pub async fn handle_start_command(bot: Bot, msg: Message) -> ResponseResult<()> {
    let welcome_text = format!(
        "👋 Hello, {}!\n\n\
        Welcome to support.\n\n\
        Write your question and our operators will answer you ASAP.",
        msg.from
            .as_ref()
            .map(|u| &u.first_name)
            .unwrap_or(&"".to_string())
    );

    bot.send_message(msg.chat.id, welcome_text).await?;
    Ok(())
}

/// Handle /help command
pub async fn handle_help_command(bot: Bot, msg: Message) -> ResponseResult<()> {
    let help_text = "📋 Available commands:\n\n\
                     /start - Start dialog\n\
                     /help - Show this help\n\n\
                     Just send your question and we will answer you!";

    bot.send_message(msg.chat.id, help_text).await?;
    Ok(())
}
