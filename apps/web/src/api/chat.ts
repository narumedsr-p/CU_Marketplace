import { api } from './client';

const CHATS = '/api/v1/chats';

export interface ApiChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  isSystemMsg: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiChatRoom {
  id: string;
  participant1: string;
  participant2: string;
  itemId: string;
  createdAt: string;
  updatedAt: string;
  // GET /rooms includes only the latest message per room; full history comes from fetchRoomMessages.
  messages?: ApiChatMessage[];
}

export function fetchRooms() {
  return api<ApiChatRoom[]>(`${CHATS}/rooms`);
}

export function fetchRoomMessages(roomId: string) {
  return api<ApiChatMessage[]>(`${CHATS}/rooms/${roomId}/messages`);
}

// Returns the existing room if this buyer already has one with this seller for this item.
export function startChat(sellerId: string, itemId: string) {
  return api<ApiChatRoom>(`${CHATS}/rooms`, {
    method: 'POST',
    body: JSON.stringify({ participant2: sellerId, itemId }),
  });
}
