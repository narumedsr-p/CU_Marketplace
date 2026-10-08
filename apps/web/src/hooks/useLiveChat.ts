import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUserId } from '../api/client';
import { fetchRoomMessages, fetchRooms, startChat, type ApiChatMessage, type ApiChatRoom } from '../api/chat';
import { fetchListing, type ApiCategory } from '../api/catalog';
import { fetchProfile } from '../api/profiles';
import useChatSocket from './useChatSocket';
import type { ChatMessage, ChatThread, Listing } from '../types';

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function toMessage(m: ApiChatMessage, me: string | null): ChatMessage {
  return {
    id: m.id,
    from: m.isSystemMsg ? 'system' : m.senderId === me ? 'me' : 'them',
    text: m.content,
    time: timeOf(m.createdAt),
  };
}

function lastMessageOf(room: ApiChatRoom): ApiChatMessage[] {
  const last = room.lastMessage;
  if (!last) return [];
  return [{ ...last, id: last.messageId, roomId: room.id, senderId: last.senderId ?? '', updatedAt: last.createdAt }];
}

async function toThread(room: ApiChatRoom, me: string | null, categories: ApiCategory[]): Promise<ChatThread> {
  const peerId = room.participant1 === me ? room.participant2 : room.participant1;
  const [profile, listing] = await Promise.all([
    fetchProfile(peerId),
    fetchListing(room.itemId, categories).catch(() => null),
  ]);
  return {
    id: room.id,
    name: profile?.displayName || 'Student',
    unread: 0,
    blocked: room.isBlocked,
    listing: listing
      ? { id: listing.id, title: listing.title, price: listing.price, status: listing.status, photo: listing.photos?.[0] }
      : { id: room.itemId, title: 'Listing', price: 0, status: 'Available' },
    messages: lastMessageOf(room).map((m) => toMessage(m, me)),
  };
}

// Messages can reach a thread three ways (history fetch, the send ack, the `message:new` push to our own
// room), so everything is merged by message id.
function withMessages(thread: ChatThread, incoming: ChatMessage[]): ChatThread {
  const seen = new Set(thread.messages.map((m) => m.id));
  const added = incoming.filter((m) => !m.id || !seen.has(m.id));
  return added.length ? { ...thread, messages: [...thread.messages, ...added] } : thread;
}

// Chat threads backed by chat-service: rooms + history over REST, live messages over Socket.IO.
export default function useLiveChat(enabled: boolean, categories: ApiCategory[]) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const historyLoaded = useRef(new Set<string>());

  const loadRooms = useCallback(async () => {
    const me = getCurrentUserId();
    const rooms = await fetchRooms();
    const fresh = await Promise.all(rooms.map((r) => toThread(r, me, categories)));
    setThreads((prev) => fresh.map((t) => {
      const old = prev.find((p) => p.id === t.id);
      return old ? withMessages({ ...t, messages: old.messages, unread: old.unread }, t.messages) : t;
    }));
    setActiveId((cur) => cur ?? (fresh[0]?.id as string | undefined) ?? null);
  }, [categories]);

  useEffect(() => {
    if (!enabled) {
      setThreads([]);
      setActiveId(null);
      historyLoaded.current.clear();
      return;
    }
    loadRooms().catch(() => {});
  }, [enabled, loadRooms]);

  // Full history is fetched the first time a room is opened.
  useEffect(() => {
    if (!activeId || historyLoaded.current.has(activeId)) return;
    historyLoaded.current.add(activeId);
    const me = getCurrentUserId();
    fetchRoomMessages(activeId)
      .then((history) => {
        const mapped = history.map((m) => toMessage(m, me));
        setThreads((ts) => ts.map((t) => {
          if (t.id !== activeId) return t;
          const live = t.messages.filter((m) => !mapped.some((h) => h.id === m.id));
          return { ...t, messages: [...mapped, ...live] };
        }));
      })
      .catch(() => historyLoaded.current.delete(activeId));
  }, [activeId]);

  const receive = useCallback((message: ApiChatMessage) => {
    if (!threadsRef.current.some((t) => t.id === message.roomId)) {
      // Someone started a new conversation with us: pick up the new room.
      loadRooms().catch(() => {});
      return;
    }
    const me = getCurrentUserId();
    setThreads((ts) => {
      const target = ts.find((t) => t.id === message.roomId);
      if (!target) return ts;
      const unreadBump = message.senderId !== me && activeRef.current !== target.id ? 1 : 0;
      const updated = withMessages({ ...target, unread: target.unread + unreadBump }, [toMessage(message, me)]);
      return [updated, ...ts.filter((t) => t.id !== target.id)];
    });
  }, [loadRooms]);

  const { send: socketSend } = useChatSocket(enabled, receive);

  const select = useCallback((id: string) => {
    setActiveId(id);
    setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
  }, []);

  const send = useCallback(async (roomId: string, text: string) => {
    const ack = await socketSend(roomId, text);
    if (ack.ok) receive(ack.message);
    return ack;
  }, [socketSend, receive]);

  const openChatFor = useCallback(async (listing: Listing) => {
    if (!listing.sellerId) throw new Error('This listing has no seller to chat with.');
    const room = await startChat(listing.sellerId, listing.id);
    if (!threadsRef.current.some((t) => t.id === room.id)) {
      const thread = await toThread(room, getCurrentUserId(), categories);
      setThreads((ts) => [thread, ...ts.filter((t) => t.id !== thread.id)]);
    }
    select(room.id);
  }, [categories, select]);

  return { threads, setThreads, activeId, setActiveId, select, send, openChatFor };
}
