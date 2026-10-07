import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { color, font, baht, labelStyle, card, pageTitle, pageSub } from '../theme/tokens';
import Segmented from '../components/Segmented';
import Button from '../components/Button';
import Field from '../components/Field';
import Toggle from '../components/Toggle';
import PhotoSlot from '../components/PhotoSlot';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import type { AutoMatchAlert, AutoMatchHit, Listing } from '../types';

type WishlistTab = 'saved' | 'alerts';

interface AlertDraft {
  text: string;
  cat: string;
  max: string;
}

interface WishlistScreenProps {
  saved?: Listing[];
  autoRemoved?: Listing[];
  alerts?: AutoMatchAlert[];
  matches?: AutoMatchHit[];
  categories?: string[];
  notifyOn?: boolean;
  onEnableNotify: () => void;
  initialTab?: WishlistTab;
  onOpenListing: (listing: Listing) => void;
  onRemove: (id: string) => void;
  onBrowse: () => void;
  onCreateAlert: (payload: { text: string; cat: string; max: number }) => void;
  onUpdateAlert: (id: string | number, payload: { text: string; cat: string; max: number }) => void;
  onDeleteAlert: (id: string | number) => void;
  onToggleAlert: (id: string | number) => void;
}

// Smart Wishlist & Auto-Matching (FR 4.1–4.7).
export default function WishlistScreen({
  saved = [], autoRemoved = [], alerts = [], matches = [], categories = [],
  notifyOn = true, onEnableNotify, initialTab = 'saved',
  onOpenListing, onRemove, onBrowse,
  onCreateAlert, onUpdateAlert, onDeleteAlert, onToggleAlert,
}: WishlistScreenProps) {
  const [tab, setTab] = useState<WishlistTab>(initialTab);
  const [draft, setDraft] = useState<AlertDraft>({ text: '', cat: 'Any', max: '' });
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const reset = () => { setDraft({ text: '', cat: 'Any', max: '' }); setEditingId(null); };
  const submit = () => {
    const text = draft.text.trim();
    if (!text) return;
    const payload = { text, cat: draft.cat, max: Number(draft.max) || 0 };
    if (editingId !== null) onUpdateAlert(editingId, payload);
    else onCreateAlert(payload);
    reset();
  };

  return (
    <div style={{ padding: '22px 24px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={pageTitle}>Wishlist</div>
          <div style={pageSub}>Saved listings, plus keywords we watch for you on every new post.</div>
        </div>
        <Segmented
          value={tab} onChange={(v) => setTab(v as WishlistTab)}
          options={[{ value: 'saved', label: 'Saved · ' + saved.length }, { value: 'alerts', label: 'Auto-match · ' + alerts.length }]}
        />
      </div>

      {!notifyOn && (
        <div style={{
          marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          padding: '12px 14px', borderRadius: 11, background: '#FFF3E0',
        }}>
          <div style={{ flex: 1, minWidth: 200, font: `500 13px/1.5 ${font}`, color: '#9A5B00' }}>
            Wishlist notifications are off — matches still collect here, but you won't be pinged.
          </div>
          <Button size="sm" variant="ink" onClick={onEnableNotify}>Turn on</Button>
        </div>
      )}

      {tab === 'saved' && (
        <>
          {saved.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginTop: 18 }}>
              {saved.map((l) => (
                <div key={l.id} style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <PhotoSlot src={l.photo} style={{ cursor: 'pointer' }}>
                    <div onClick={() => onOpenListing(l)} style={{ position: 'absolute', inset: 0 }} />
                    <StatusBadge status={l.status} style={{ position: 'absolute', top: 8, left: 8 }} />
                  </PhotoSlot>
                  <div style={{ padding: '10px 11px 12px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                    <div
                      onClick={() => onOpenListing(l)}
                      style={{
                        font: `600 13.5px/1.35 ${font}`, cursor: 'pointer', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}
                    >{l.title}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ font: `700 16px/1 ${font}`, color: color.pink }}>{baht(l.price)}</span>
                      {l.was && <span style={{ font: `400 11.5px/1 ${font}`, color: color.faint, textDecoration: 'line-through' }}>{baht(l.was)}</span>}
                    </div>
                    <div style={{ font: `500 11.5px/1.4 ${font}`, color: color.muted }}>{l.watchers} people wishlisted this</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                      <Button size="sm" onClick={() => onOpenListing(l)} style={{ flex: 1, padding: '8px 0', boxShadow: 'none', fontSize: 12 }}>View</Button>
                      <Button size="sm" variant="ghost" onClick={() => onRemove(l.id)} style={{ flex: 1, padding: '8px 0', fontSize: 12 }}>Remove</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 18 }}>
              <EmptyState title="Nothing saved yet" body="Tap “Add to wishlist” on any listing to keep it here." actionLabel="Browse listings" onAction={onBrowse} />
            </div>
          )}
          {autoRemoved.length > 0 && (
            <div style={{ marginTop: 16, font: `400 12.5px/1.6 ${font}`, color: color.muted }}>
              Removed automatically because they sold:{' '}
              <span style={{ color: color.ink, fontWeight: 600 }}>{autoRemoved.map((l) => l.title).join(', ')}</span>
            </div>
          )}
        </>
      )}

      {tab === 'alerts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18, marginTop: 18, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...card, padding: 16 }}>
              <Field
                label={editingId !== null ? 'Edit alert' : 'New auto-match alert'}
                value={draft.text} placeholder="e.g. fx-991, lab coat M, iPad"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, text: e.target.value })}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && submit()}
              />
              <div style={{ display: 'flex', gap: 9, marginTop: 9, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 130px' }}>
                  <Field as="select" value={draft.cat} onChange={(e: ChangeEvent<HTMLSelectElement>) => setDraft({ ...draft, cat: e.target.value })}>
                    <option value="Any">Any category</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Field>
                </div>
                <div style={{ flex: '1 1 130px' }}>
                  <Field
                    value={draft.max} placeholder="Max price ฿ (optional)" inputMode="numeric"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, max: e.target.value.replace(/[^0-9]/g, '') })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Button size="sm" onClick={submit} style={{ flex: 1 }}>{editingId !== null ? 'Save changes' : 'Create alert'}</Button>
                {editingId !== null && <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>}
              </div>
              <div style={{ font: `400 11.5px/1.6 ${font}`, color: color.faint, marginTop: 10, textWrap: 'pretty' }}>
                Every new listing is checked against your keywords (title + category, case-insensitive). Matches notify you instantly.
              </div>
            </div>

            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ ...labelStyle, padding: '13px 16px', borderBottom: '1px solid ' + color.lineSoft }}>My auto-match alerts · {alerts.length}</div>
              {alerts.map((a) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                  borderBottom: '1px solid ' + color.lineSoft, background: editingId === a.id ? color.pinkTint : color.white,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `600 14px/1.3 ${font}`, color: a.on ? color.ink : color.faint }}>“{a.text}”</div>
                    <div style={{ font: `500 12px/1.5 ${font}`, color: color.muted, marginTop: 3 }}>
                      {[a.cat && a.cat !== 'Any' ? a.cat : 'Any category', a.max ? 'under ' + baht(a.max) : 'any price',
                        a.on ? (a.liveMatches || 0) + ' live match' + (a.liveMatches === 1 ? '' : 'es') : 'Paused'].join(' · ')}
                    </div>
                  </div>
                  <span onClick={() => { setEditingId(a.id); setDraft({ text: a.text, cat: a.cat || 'Any', max: a.max ? String(a.max) : '' }); }}
                    style={{ font: `600 12px/1 ${font}`, color: color.pink, cursor: 'pointer' }}>Edit</span>
                  <span onClick={() => { onDeleteAlert(a.id); if (editingId === a.id) reset(); }}
                    style={{ font: `600 12px/1 ${font}`, color: color.muted, cursor: 'pointer' }}>Delete</span>
                  <Toggle checked={a.on} onChange={() => onToggleAlert(a.id)} />
                </div>
              ))}
              {!alerts.length && <div style={{ padding: '22px 16px', font: `400 13px/1.6 ${font}`, color: color.muted }}>No alerts yet. Add a keyword above.</div>}
            </div>
          </div>

          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid ' + color.lineSoft, display: 'flex', alignItems: 'center' }}>
              <div style={labelStyle}>Matching listings now</div>
              <div style={{ marginLeft: 'auto', font: `600 12px/1 ${font}`, color: color.pink }}>{matches.length}</div>
            </div>
            {matches.map(({ listing: l, keyword }) => (
              <div key={l.id} onClick={() => onOpenListing(l)} style={{
                display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px',
                borderBottom: '1px solid ' + color.lineSoft, cursor: 'pointer',
              }}>
                <PhotoSlot src={l.photo} label="" radius={8} style={{ width: 48, flex: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 13.5px/1.35 ${font}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</div>
                  <div style={{ font: `500 12px/1.5 ${font}`, color: color.muted, marginTop: 2 }}>matched “{keyword}” · {l.cat}</div>
                </div>
                <div style={{ font: `700 14px/1 ${font}`, color: color.pink, flex: 'none' }}>{baht(l.price)}</div>
              </div>
            ))}
            {!matches.length && (
              <div style={{ padding: '22px 16px', font: `400 13px/1.6 ${font}`, color: color.muted }}>
                Nothing on the catalog matches your active alerts right now. We'll ping you when it's posted.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
