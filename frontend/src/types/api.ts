// API Types matching backend models

export interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  is_blocked: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  telegram_user: TelegramUser;
  user_id?: string;
  status: 'waiting' | 'active' | 'closed';
  last_message_at?: string;
  unread_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  from_user: boolean;
  content: string;
  read: boolean;
  telegram_message_id?: number;
  media_type?: string;
  media_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  duration?: number;
  created_at: string;
}

export interface MessageEdit {
  id: string;
  message_id: string;
  previous_content: string;
  edited_by_user_id?: string;
  edit_reason?: string;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category?: string;
  user_id?: string;
  usage_count: number;
  created_at: string;
}

export interface UserSettings {
  theme: string; // "light" or "dark"
  language: string; // "ru" or "en"
  notifications_enabled: boolean;
  notification_sound_enabled: boolean;
  telegram_notifications_user_id?: string; // Telegram user ID for receiving notifications
}

export interface User {
  id: string;
  email: string;
  name: string;
  is_operator: boolean;
  is_admin: boolean;
  is_active: boolean;
  last_seen_at?: string;
  is_online: boolean;
  created_at: string;
  settings?: UserSettings;
}

export interface UserStats {
  user_id: string;
  total_conversations: number;
  active_conversations: number;
  closed_conversations: number;
  total_messages_sent: number;
  average_response_time_seconds?: number;
}

export interface AnalyticsOverall {
  total_conversations: number;
  active_conversations: number;
  closed_conversations: number;
  total_messages: number;
  total_users: number;
  average_response_time_seconds?: number;
}

// Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface SendMessageRequest {
  conversation_id: string;
  content: string;
}

export interface ConversationListQuery {
  status?: 'waiting' | 'active' | 'closed';
  user_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MessageListQuery {
  conversation_id: string;
  limit?: number;
  offset?: number;
}

export interface SearchMessagesQuery {
  query: string;
  conversation_id?: string;
  limit?: number;
}

export interface CreateTemplateRequest {
  title: string;
  content: string;
  category?: string;
}

export interface UpdateTemplateRequest {
  title?: string;
  content?: string;
  category?: string;
}
