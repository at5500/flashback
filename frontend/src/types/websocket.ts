// WebSocket Event Types matching backend

export type WebSocketEvent =
  | MessageReceivedEvent
  | MessageSentEvent
  | ConversationCreatedEvent
  | ConversationStatusChangedEvent
  | ConversationAssignedEvent
  | ConversationClosedEvent
  | UserTypingEvent
  | TelegramUserTypingEvent
  | UserOnlineEvent
  | UserOfflineEvent
  | MessageReadEvent
  | ErrorEvent;

export interface MessageReceivedEvent {
  type: 'message_received';
  conversation_id: string;
  message_id: string;
  content: string;
  telegram_user_id: number;
  telegram_user_name: string;
  media_type?: string;
  media_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  duration?: number;
}

export interface MessageSentEvent {
  type: 'message_sent';
  conversation_id: string;
  message_id: string;
  content: string;
  user_id: string;
  operator_name: string;
  media_type?: string;
  media_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  duration?: number;
}

export interface ConversationCreatedEvent {
  type: 'conversation_created';
  conversation_id: string;
  telegram_user_id: number;
  telegram_user_name: string;
}

export interface ConversationStatusChangedEvent {
  type: 'conversation_status_changed';
  conversation_id: string;
  status: string;
  user_id?: string;
}

export interface ConversationAssignedEvent {
  type: 'conversation_assigned';
  conversation_id: string;
  user_id: string;
  operator_name: string;
}

export interface ConversationClosedEvent {
  type: 'conversation_closed';
  conversation_id: string;
}

export interface UserTypingEvent {
  type: 'user_typing';
  conversation_id: string;
  user_id: string;
  user_name: string;
}

export interface TelegramUserTypingEvent {
  type: 'telegram_user_typing';
  conversation_id: string;
  telegram_user_id: number;
}

export interface UserOnlineEvent {
  type: 'user_online';
  user_id: string;
  user_name: string;
}

export interface UserOfflineEvent {
  type: 'user_offline';
  user_id: string;
}

export interface MessageReadEvent {
  type: 'message_read';
  message_id: string;
  conversation_id: string;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  code: string;
}
