import { create } from 'zustand';
import type { WebSocketEvent } from '@/types';

interface WebSocketState {
  isConnected: boolean;
  lastEvent: WebSocketEvent | null;
  events: WebSocketEvent[];
  setConnected: (connected: boolean) => void;
  addEvent: (event: WebSocketEvent) => void;
  clearEvents: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  isConnected: false,
  lastEvent: null,
  events: [],

  setConnected: (connected) => set({ isConnected: connected }),

  addEvent: (event) =>
    set((state) => ({
      lastEvent: event,
      events: [...state.events.slice(-99), event], // Keep last 100 events
    })),

  clearEvents: () => set({ events: [], lastEvent: null }),
}));
