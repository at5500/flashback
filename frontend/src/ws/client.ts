import type { WebSocketEvent } from '@/types';

type EventHandler = (event: WebSocketEvent) => void;
type ConnectionHandler = (connected: boolean) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private handlers: EventHandler[] = [];
  private connectionHandlers: ConnectionHandler[] = [];
  private url: string;
  private token: string | null = null;
  private manualDisconnect: boolean = false;

  constructor(url: string = (import.meta as any).env?.DEV ? 'ws://localhost:8080/ws' : '/ws') {
    this.url = url;
  }

  connect(token?: string) {
    if (token) {
      this.token = token;
    }

    if (!this.token) {
      console.error('[WebSocket] Cannot connect: no token provided');
      return;
    }

    this.manualDisconnect = false;

    const wsUrl = this.url.startsWith('ws')
      ? this.url
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${this.url}`;

    console.log('[WebSocket] Connecting to:', wsUrl);
    console.log('[WebSocket] Token present:', !!this.token);
    console.log('[WebSocket] Token length:', this.token?.length);
    console.log('[WebSocket] Token preview:', this.token?.substring(0, 20) + '...');

    // Add token as Sec-WebSocket-Protocol header
    // Backend expects: ['access_token', '<JWT_TOKEN>']
    try {
      this.ws = new WebSocket(wsUrl, ['access_token', this.token]);
      console.log('[WebSocket] WebSocket created with protocols:', ['access_token', this.token.substring(0, 20) + '...']);
    } catch (error) {
      console.error('[WebSocket] Failed to create WebSocket:', error);
      return;
    }

    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onerror = this.handleError.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
  }

  disconnect() {
    this.manualDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.notifyConnectionHandlers(false);
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.push(handler);

    // Return unsubscribe function
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter((h) => h !== handler);
    };
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Cannot send message: not connected');
    }
  }

  private handleOpen() {
    console.log('[WebSocket] Connected');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.notifyConnectionHandlers(true);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data: WebSocketEvent = JSON.parse(event.data);
      console.log('[WebSocket Client] Received event:', data.type, data);
      this.handlers.forEach((handler) => handler(data));
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  private handleError(error: Event) {
    console.error('[WebSocket] Error event:', error);
    console.error('[WebSocket] Error type:', error.type);
    console.error('[WebSocket] WebSocket readyState:', this.ws?.readyState);
  }

  private handleClose(event: CloseEvent) {
    console.log('[WebSocket] Disconnected.');
    console.log('[WebSocket] Close code:', event.code);
    console.log('[WebSocket] Close reason:', event.reason || 'No reason');
    console.log('[WebSocket] Was clean:', event.wasClean);

    // Common WebSocket close codes:
    // 1000: Normal closure
    // 1001: Going away
    // 1006: Abnormal closure (no close frame)
    // 1008: Policy violation
    // 1011: Server error

    if (event.code === 1006) {
      console.error('[WebSocket] Abnormal closure detected. Possible causes:');
      console.error('  - Authentication failed (invalid JWT token)');
      console.error('  - Network connectivity issue');
      console.error('  - Server rejected connection');
      console.error('  - CORS policy violation');
    }

    this.notifyConnectionHandlers(false);

    // Attempt to reconnect only if not manually disconnected
    if (!this.manualDisconnect && !this.reconnectTimer) {
      console.log(`[WebSocket] Will reconnect in ${this.reconnectInterval / 1000}s...`);
      this.reconnectTimer = setTimeout(() => {
        console.log('[WebSocket] Reconnecting...');
        this.connect();
      }, this.reconnectInterval);
    }
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach((handler) => handler(connected));
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
