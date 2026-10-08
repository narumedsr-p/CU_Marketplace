import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { color, font, baht, shortName } from '../theme/tokens';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';
import PhotoSlot from '../components/PhotoSlot';
import Button from '../components/Button';
import type { ChatThread, ChatThreadListing } from '../types';

interface ChatScreenProps {
  threads?: ChatThread[];
  activeId?: number | string | null;
  typingId?: number | string | null;
  compact?: boolean;
  height?: number;
  quickReplies?: string[];
  onSelectThread: (id: number | string) => void;
  onBack: () => void;
  onSend: (threadId: number | string, text: string) => void;
  onAttachPhoto: (threadId: number | string) => void;
  onToggleBlock: (thread: ChatThread) => void;
  onReport: (thread: ChatThread) => void;
  onOpenListing: (listing: ChatThreadListing) => void;
}

// Real-time chat (FR 3.1–3.5, UC-03). Presentational — plug your WebSocket client into the
// callbacks and push incoming messages into `threads`.
export default function ChatScreen({
  threads = [], activeId, typingId, compact = false, height,
  quickReplies = ['Is it still available?', 'Can we meet at the handover spot?', 'What time works for you?'],
  onSelectThread, onBack, onSend, onAttachPhoto, onToggleBlock, onReport, onOpenListing,
}: ChatScreenProps) {
  const resolvedHeight = height ?? (compact ? 640 : 620);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const cur = threads.find((t) => t.id === activeId) || (compact ? null : threads[0]);
  const msgCount = cur ? cur.messages.length : 0;

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur && cur.id, msgCount, typingId]);

  const send = (text: string) => {
    if (!cur || !text.trim()) return;
    onSend(cur.id, text.trim());
    setDraft('');
  };

  const list = threads.filter((t) => !q || (t.name + ' ' + t.listing.title).toLowerCase().includes(q.toLowerCase()));
  const showList = !compact || !cur;
  const showConvo = !!cur;
  const lastMine = cur ? cur.messages.map((m) => m.from).lastIndexOf('me') : -1;

  return (
    <div style={{ padding: compact ? '14px 14px 0' : '22px 24px 40px' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: compact ? 'minmax(0,1fr)' : '300px minmax(0,1fr)',
        border: '1px solid ' + color.line, borderRadius: 14, overflow: 'hidden', height: resolvedHeight, background: color.white,
      }}>
        {showList && (
          <div style={{ borderRight: compact ? 0 : '1px solid ' + color.line, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '16px 14px 10px' }}>
              <div style={{ font: `700 19px/1.2 ${font}` }}>Messages</div>
              <input
                value={q} onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} placeholder="Search people or items"
                style={{
                  width: '100%', marginTop: 11, padding: '9px 12px', border: '1px solid ' + color.field, borderRadius: 9,
                  font: `400 13px/1.3 ${font}`, outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {list.map((t) => {
                const last = t.messages[t.messages.length - 1];
                const on = cur && cur.id === t.id && !compact;
                return (
                  <div key={t.id} onClick={() => onSelectThread(t.id)} style={{
                    display: 'flex', gap: 11, padding: '12px 14px', cursor: 'pointer', alignItems: 'flex-start',
                    background: on ? color.pinkTint : color.white,
                  }}>
                    <Avatar name={t.name} online={t.online} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <div style={{ flex: 1, minWidth: 0, font: `600 13.5px/1.3 ${font}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                        <div style={{ font: `500 11px/1 ${font}`, color: color.faint, flex: 'none' }}>{last?.time || ''}</div>
                      </div>
                      <div style={{
                        font: `400 12.5px/1.4 ${font}`, color: t.unread ? color.ink : color.muted, marginTop: 3,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {t.blocked ? 'Blocked' : (last?.from === 'me' ? 'You: ' : '') + (last?.image ? 'Photo' : last?.text || '')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                        <div style={{ flex: 1, minWidth: 0, font: `500 11.5px/1.3 ${font}`, color: color.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.listing.title} · {baht(t.listing.price)}
                        </div>
                        {t.unread > 0 && (
                          <div style={{ minWidth: 18, padding: '2px 5px', borderRadius: 9, background: color.pink, color: color.white, font: `700 10.5px/1.3 ${font}`, textAlign: 'center' }}>{t.unread}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showConvo && cur && (!compact || !showList) && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 16px', borderBottom: '1px solid ' + color.line }}>
              {compact && (
                <div onClick={onBack} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', font: `600 18px/1 ${font}`, color: color.pink, cursor: 'pointer', flex: 'none' }}>‹</div>
              )}
              <Avatar name={cur.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 14.5px/1.3 ${font}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cur.name}</div>
                <div style={{ font: `500 12px/1.3 ${font}`, color: cur.online && !cur.blocked ? '#1E7A44' : color.faint, marginTop: 2 }}>
                  {cur.blocked ? 'Blocked' : cur.presence || (cur.online ? 'Online now' : 'Offline')}{cur.faculty ? ' · ' + cur.faculty : ''}
                </div>
              </div>
              <span onClick={() => onReport(cur)} style={{ font: `600 12px/1 ${font}`, color: color.muted, cursor: 'pointer' }}>Report</span>
              <span onClick={() => onToggleBlock(cur)} style={{ font: `600 12px/1 ${font}`, color: color.muted, cursor: 'pointer' }}>{cur.blocked ? 'Unblock' : 'Block'}</span>
            </div>

            <div onClick={() => onOpenListing(cur.listing)} style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', cursor: 'pointer',
              background: color.pinkTint, borderBottom: '1px solid ' + color.pinkLine,
            }}>
              <PhotoSlot src={cur.listing.photo} label="" radius={7} style={{ width: 40, flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 13px/1.3 ${font}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cur.listing.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ font: `700 13.5px/1 ${font}`, color: color.pink }}>{baht(cur.listing.price)}</span>
                  <StatusBadge status={cur.listing.status} style={{ fontSize: 10.5, padding: '2px 7px' }} />
                </div>
              </div>
              <div style={{ font: `600 12px/1 ${font}`, color: color.pink, flex: 'none' }}>View listing ›</div>
            </div>

            <div ref={scroller} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: '#FCF8FA' }}>
              {cur.messages.map((m, i) => {
                if (m.from === 'system') {
                  return (
                    <div key={m.id || i} style={{ flex: 'none', alignSelf: 'center', padding: '6px 12px', borderRadius: 8, background: '#F2ECEF', font: `500 11.5px/1.4 ${font}`, color: color.muted, textAlign: 'center' }}>{m.text}</div>
                  );
                }
                const me = m.from === 'me';
                return (
                  <div key={m.id || i} style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: me ? 'flex-end' : 'flex-start', gap: 4 }}>
                    {m.image ? (
                      <PhotoSlot src={typeof m.image === 'string' ? m.image : undefined} radius={12} ratio="17/13" style={{ width: 170, border: '1px solid ' + color.pinkLine }} />
                    ) : (
                      <div style={{
                        maxWidth: '78%', padding: '9px 13px', font: `400 13.5px/1.5 ${font}`, textWrap: 'pretty',
                        borderRadius: me ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: me ? color.pink : color.white, color: me ? color.white : color.ink,
                        border: '1px solid ' + (me ? color.pink : color.line),
                      }}>{m.text}</div>
                    )}
                    {m.time && (
                      <div style={{ font: `500 10.5px/1 ${font}`, color: color.faint }}>
                        {m.time}{i === lastMine && m.status ? ' · ' + m.status : ''}
                      </div>
                    )}
                  </div>
                );
              })}
              {typingId === cur.id && !cur.blocked && (
                <div style={{ flex: 'none', alignSelf: 'flex-start', padding: '9px 14px', borderRadius: '14px 14px 14px 4px', background: color.white, border: '1px solid ' + color.line, font: `500 12.5px/1.4 ${font}`, color: color.faint }}>
                  {shortName(cur.name)} is typing…
                </div>
              )}
            </div>

            {cur.blocked ? (
              <div style={{ padding: 16, borderTop: '1px solid ' + color.line, font: `500 13px/1.5 ${font}`, color: color.muted, textAlign: 'center' }}>
                You blocked this user. Messages can't be sent or received.{' '}
                <span onClick={() => onToggleBlock(cur)} style={{ color: color.pink, fontWeight: 600, cursor: 'pointer' }}>Unblock</span>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid ' + color.line, padding: '10px 12px 12px' }}>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 9 }}>
                  {quickReplies.map((r) => (
                    <div key={r} onClick={() => send(r)} style={{
                      flex: 'none', padding: '6px 11px', borderRadius: 14, border: '1px solid ' + color.field,
                      font: `500 12px/1.3 ${font}`, color: color.body, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>{r}</div>
                  ))}
                </div>
                <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(draft); }} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" aria-label="Attach photo" onClick={() => onAttachPhoto(cur.id)} style={{
                    width: 40, height: 40, borderRadius: 10, border: '1.5px solid ' + color.field, background: color.white,
                    font: `600 18px/1 ${font}`, color: color.muted, cursor: 'pointer', flex: 'none',
                  }}>+</button>
                  <input
                    value={draft} onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)} placeholder="Write a message…"
                    style={{
                      flex: 1, minWidth: 0, height: 40, padding: '0 13px', border: '1px solid ' + color.field,
                      borderRadius: 10, font: `400 14px/1 ${font}`, outline: 'none',
                    }}
                  />
                  <Button type="submit" size="sm" style={{ height: 40, padding: '0 16px', boxShadow: 'none' }}>Send</Button>
                </form>
                <div style={{ font: `400 11px/1.5 ${font}`, color: color.faint, marginTop: 8 }}>
                  Meet at a public campus spot. Never pay before the QR handover.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
