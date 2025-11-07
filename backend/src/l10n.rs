use once_cell::sync::Lazy;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize, Clone)]
pub struct BotMessages {
    pub welcome: String,
    pub operator_assigned: String,
    pub conversation_closed: String,
    pub operator_typing: String,
    pub message_sent: String,
    pub error: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct LocaleData {
    pub bot: BotMessages,
}

pub static LOCALES: Lazy<HashMap<String, LocaleData>> = Lazy::new(|| {
    let mut locales = HashMap::new();

    // Load Russian locale
    if let Ok(ru_content) = std::fs::read_to_string("locales/backend/ru.json") {
        if let Ok(ru_data) = serde_json::from_str::<LocaleData>(&ru_content) {
            locales.insert("ru".to_string(), ru_data);
        }
    }

    // Load English locale
    if let Ok(en_content) = std::fs::read_to_string("locales/backend/en.json") {
        if let Ok(en_data) = serde_json::from_str::<LocaleData>(&en_content) {
            locales.insert("en".to_string(), en_data);
        }
    }

    locales
});

/// Get locale based on user's country code
/// Russia (RU) -> ru, otherwise -> en
pub fn get_locale(country_code: Option<&str>) -> &'static LocaleData {
    let locale_key = match country_code {
        Some("RU") => "ru",
        _ => "en",
    };

    LOCALES
        .get(locale_key)
        .or_else(|| LOCALES.get("en"))
        .expect("Default English locale must be available")
}

/// Format a message with variables
pub fn format_message(template: &str, vars: &HashMap<&str, &str>) -> String {
    let mut result = template.to_string();
    for (key, value) in vars {
        let placeholder = format!("{{{}}}", key);
        result = result.replace(&placeholder, value);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_locale_ru() {
        let locale = get_locale(Some("RU"));
        assert!(locale.bot.welcome.contains("Здравствуйте"));
    }

    #[test]
    fn test_get_locale_en() {
        let locale = get_locale(Some("US"));
        assert!(locale.bot.welcome.contains("Hello"));
    }

    #[test]
    fn test_format_message() {
        let mut vars = HashMap::new();
        vars.insert("operator_name", "John");
        let result = format_message("Operator {operator_name} has joined.", &vars);
        assert_eq!(result, "Operator John has joined.");
    }
}