import { useState } from 'react';
import { color, font, labelStyle, card, pageTitle, pageSub } from '../theme/tokens';
import Chip from '../components/Chip';
import Toggle from '../components/Toggle';
import type { NotificationItem, NotificationKind, NotificationPrefDef, NotificationPrefsState } from '../types';

const KIND: Record<NotificationKind, { bg: string; fg: string; glyph: string }> = {
  match: { bg: color.pinkLine, fg: color.pink, glyph: 'M' },
  price: { bg: color.pinkLine, fg: color.pink, glyph: '฿' },
  order: { bg: '#FFF3E0', fg: '#9A5B00', glyph: 'O' },
  chat: { bg: color.ink, fg: color.white, glyph: 'C' },
  account: { bg: '#F2ECEF', fg: color.body, glyph: '!' },
};

interface NotificationsScreenProps {
  notifications?: NotificationItem[];
  prefs?: NotificationPrefsState;
  prefItems?: NotificationPrefDef[];
  categories?: string[];
  loading?: boolean;
  error?: string | null;
  markingAllRead?: boolean;
  savingPreferences?: boolean;
  onOpen: (notification: NotificationItem) => void;
  onRetry: () => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onTogglePref: (key: string) => Promise<void>;
}

// Notification Center (FR 6.1–6.4).
export default function NotificationsScreen({
  notifications = [], prefs = {}, prefItems = [],
  categories = ['All', 'Auto-match', 'Orders', 'Chat', 'Account'],
  loading = false, error = null, markingAllRead = false, savingPreferences = false,
  onOpen, onRetry, onMarkAllRead, onTogglePref,
}: NotificationsScreenProps) {
  const [filter, setFilter] = useState('All');
  const shown = notifications.filter((n) => filter === 'All' || n.category === filter);
  const unread = notifications.filter((n) => !n.read).length;
  const groups = ([['today', 'Today'], ['earlier', 'Earlier']] as const)
    .map(([k, label]) => [label, shown.filter((n) => (n.group || 'earlier') === k)] as const)
    .filter(([, list]) => list.length);

  const markAllRead = async () => {
    try { await onMarkAllRead(); } catch { /* Parent displays the error. */ }
  };

  const togglePreference = async (key: string) => {
    try { await onTogglePref(key); } catch { /* Parent displays the error. */ }
  };

  return (
    <div style={{ padding: '22px 24px 40px', display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 460px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={pageTitle}>Notifications</div>
            <div style={pageSub}>{unread ? unread + ' unread · orders, chat and auto-match in one place' : 'You’re all caught up.'}</div>
          </div>
          <span onClick={() => { void markAllRead(); }} style={{ font: `600 12.5px/1 ${font}`, color: color.pink, cursor: markingAllRead || !unread ? 'default' : 'pointer', padding: '6px 0', opacity: markingAllRead || !unread ? .55 : 1 }}>
            {markingAllRead ? 'Marking…' : 'Mark all as read'}
          </span>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: '11px 13px', borderRadius: 10, background: '#FFF3E0', color: '#9A5B00', font: `500 12.5px/1.5 ${font}`, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{error}</span>
            <span onClick={() => { void onRetry().catch(() => {}); }} style={{ color: color.pink, cursor: loading ? 'default' : 'pointer', fontWeight: 700 }}>{loading ? 'Loading…' : 'Try again'}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
          {categories.map((c) => (
            <Chip key={c} size="sm" active={filter === c} onClick={() => setFilter(c)}>
              {c} · {c === 'All' ? notifications.length : notifications.filter((n) => n.category === c).length}
            </Chip>
          ))}
        </div>

        <div style={{ ...card, overflow: 'hidden', marginTop: 14 }}>
          {groups.map(([label, list]) => (
            <div key={label}>
              <div style={{ ...labelStyle, padding: '10px 16px', background: '#FCF8FA', borderBottom: '1px solid ' + color.lineSoft }}>{label}</div>
              {list.map((n) => {
                const k = KIND[n.kind] || KIND.account;
                return (
                  <div key={n.id} onClick={() => onOpen(n)} style={{
                    display: 'flex', gap: 12, padding: '14px 16px', alignItems: 'flex-start', cursor: 'pointer',
                    background: n.read ? color.white : '#FFF8FB', borderBottom: '1px solid ' + color.lineSoft,
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', background: k.bg, color: k.fg, flex: 'none',
                      display: 'grid', placeItems: 'center', font: `700 13px/1 ${font}`,
                    }}>{k.glyph}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <div style={{ font: `600 13.5px/1.35 ${font}` }}>{n.title}</div>
                        <div style={{ font: `500 11.5px/1 ${font}`, color: color.faint, whiteSpace: 'nowrap', flex: 'none' }}>{n.time}</div>
                      </div>
                      <div style={{ font: `400 13px/1.55 ${font}`, color: color.body, marginTop: 3, textWrap: 'pretty' }}>{n.body}</div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                        {n.cta && <span style={{ font: `600 12px/1 ${font}`, color: color.pink }}>{n.cta}</span>}
                        {n.channel && <span style={{ font: `500 11px/1 ${font}`, color: color.faint }}>{n.channel}</span>}
                      </div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flex: 'none', background: n.read ? 'transparent' : color.pink }} />
                  </div>
                );
              })}
            </div>
          ))}
          {loading && !shown.length ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', font: `400 13.5px/1.6 ${font}`, color: color.muted }}>Loading notifications…</div>
          ) : !shown.length && (
            <div style={{ padding: '40px 16px', textAlign: 'center', font: `400 13.5px/1.6 ${font}`, color: color.muted }}>No notifications in this category.</div>
          )}
        </div>
      </div>

      <div style={{ ...card, flex: '1 1 260px', maxWidth: '100%', padding: 16 }}>
        <div style={labelStyle}>What we notify you about</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {prefItems.map((p) => (
            <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, font: `500 13px/1.4 ${font}`, color: color.body }}>{p.name}</div>
              <Toggle checked={!!prefs[p.key]} onChange={() => { if (!savingPreferences) void togglePreference(p.key); }} style={{ opacity: savingPreferences ? .55 : 1 }} />
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: color.lineSoft, margin: '14px 0' }} />
        <div style={{ font: `400 12px/1.6 ${font}`, color: color.muted, textWrap: 'pretty' }}>
          Delivered in-app while you're online and by push when you're away. Failed pushes retry up to 3 times.
        </div>
      </div>
    </div>
  );
}
