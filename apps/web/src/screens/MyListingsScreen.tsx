import { useState, type ChangeEvent } from 'react';
import { color, font, baht, card, pageTitle, pageSub, danger } from '../theme/tokens';
import Segmented from '../components/Segmented';
import Button from '../components/Button';
import Field from '../components/Field';
import Chip from '../components/Chip';
import StatusBadge from '../components/StatusBadge';
import PhotoSlot from '../components/PhotoSlot';
import EmptyState from '../components/EmptyState';
import type { Listing, SellerReservation } from '../types';

type ListingTab = 'Active' | 'Reserved' | 'Sold';

const tabOf = (l: Listing): ListingTab => (l.status === 'Sold' ? 'Sold' : l.status === 'Reserved' ? 'Reserved' : 'Active');

interface EditForm {
  title: string;
  price: string;
  cond: string;
  desc: string;
  spot: string;
}

interface MyListingsScreenProps {
  listings?: Listing[];
  reservations?: Record<string, SellerReservation>;
  conditions?: string[];
  spots?: string[];
  onSave?: (id: string, patch: { title: string; price: number; cond: string; desc: string; spot: string }) => void;
  onDelete?: (id: string) => void;
  onShowQr?: (id: string) => void;
  onCancelReservation?: (id: string) => void;
  onNew: () => void;
}

// Seller's own listings (FR 5.2, 2.5). Edit is blocked while RESERVED (PATCH /listings/:id rule).
export default function MyListingsScreen({
  listings = [], reservations = {}, conditions = ['New', 'Like new', 'Good', 'Fair'], spots = [],
  onSave, onDelete, onShowQr, onCancelReservation, onNew,
}: MyListingsScreenProps) {
  const [tab, setTab] = useState<ListingTab>('Active');
  const [editId, setEditId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({ title: '', price: '', cond: '', desc: '', spot: '' });
  const rows = listings.filter((l) => tabOf(l) === tab);
  const count = (t: ListingTab) => listings.filter((l) => tabOf(l) === t).length;

  const startEdit = (l: Listing) => { setDelId(null); setEditId(l.id); setForm({ title: l.title, price: String(l.price), cond: l.cond ?? '', desc: l.desc || '', spot: l.spot }); };
  const save = () => {
    if (!form.title.trim() || !form.price || editId === null) return;
    if (!conditions.includes(form.cond) || !spots.includes(form.spot)) return;
    onSave && onSave(editId, { title: form.title.trim(), price: Number(form.price), cond: form.cond, desc: form.desc, spot: form.spot });
    setEditId(null);
  };

  return (
    <div style={{ padding: '22px 24px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={pageTitle}>My listings</div>
          <div style={pageSub}>Edit or delete what you're selling. Editing is locked while an item is reserved.</div>
        </div>
        <Button size="sm" onClick={onNew}>+ New listing</Button>
      </div>

      <Segmented
        style={{ marginTop: 16 }} value={tab}
        onChange={(t) => { setTab(t as ListingTab); setEditId(null); setDelId(null); }}
        options={(['Active', 'Reserved', 'Sold'] as ListingTab[]).map((t) => ({ value: t, label: t + ' · ' + count(t) }))}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {rows.map((l) => {
          const res = reservations[l.id];
          return (
            <div key={l.id} style={{ ...card, padding: 14 }}>
              <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <PhotoSlot src={l.photo} label="" radius={9} style={{ width: 72, flex: 'none' }} />
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ font: `600 14.5px/1.35 ${font}` }}>{l.title}</div>
                    <StatusBadge status={l.status} />
                  </div>
                  <div style={{ font: `700 16px/1 ${font}`, color: color.pink, marginTop: 7 }}>{baht(l.price)}</div>
                  <div style={{ font: `500 12px/1.5 ${font}`, color: color.muted, marginTop: 5 }}>
                    {l.cond ? `${l.cond} · ` : ''}{l.cat} · posted {l.posted} · {l.watchers} wishlisted
                  </div>
                </div>
                {l.status === 'Available' && editId !== l.id && (
                  <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(l)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setDelId(l.id); }}>Delete</Button>
                  </div>
                )}
              </div>

              {l.status === 'Reserved' && (
                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: '#FFF3E0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200, font: `500 12.5px/1.55 ${font}`, color: '#9A5B00' }}>
                    {res ? `Reserved by ${res.buyer} · ${res.reference} · ${res.window} at ${res.spot}.` : 'Reserved.'} Editing is locked until the order closes.
                  </div>
                  <Button size="sm" variant="ink" onClick={() => onShowQr && onShowQr(l.id)}>Show handover QR</Button>
                  <Button size="sm" variant="ghost" onClick={() => onCancelReservation && onCancelReservation(l.id)}>Cancel reservation</Button>
                </div>
              )}

              {delId === l.id && (
                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: danger.bg, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200, font: `500 12.5px/1.55 ${font}`, color: danger.fg }}>
                    Delete "{l.title}"? It's hidden from the catalog and removed from {l.watchers} wishlists.
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setDelId(null)}>Keep</Button>
                  <Button size="sm" onClick={() => { onDelete && onDelete(l.id); setDelId(null); }} style={{ background: danger.fg, boxShadow: 'none' }}>Delete listing</Button>
                </div>
              )}

              {editId === l.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid ' + color.lineSoft, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: '2 1 220px' }}>
                      <Field label="Title" value={form.title} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                      <Field label="Price ฿" inputMode="numeric" value={form.price} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, '') })} />
                    </div>
                  </div>
                  <div>
                    <div style={{ font: `600 12px/1.4 ${font}`, color: color.muted, marginBottom: 7 }}>Condition</div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {conditions.map((c) => <Chip key={c} size="sm" active={form.cond === c} onClick={() => setForm({ ...form, cond: c })}>{c}</Chip>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ font: `600 12px/1.4 ${font}`, color: color.muted, marginBottom: 7 }}>Handover spot</div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {spots.map((spot) => <Chip key={spot} size="sm" active={form.spot === spot} onClick={() => setForm({ ...form, spot })}>{spot}</Chip>)}
                    </div>
                  </div>
                  {(!conditions.includes(form.cond) || !spots.includes(form.spot)) && (
                    <div style={{ font: `500 12px/1.4 ${font}`, color: color.muted }}>Choose a condition and handover spot to save this listing.</div>
                  )}
                  <Field label="Description" as="textarea" rows={3} value={form.desc} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, desc: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                    <Button size="sm" disabled={!conditions.includes(form.cond) || !spots.includes(form.spot)} onClick={save}>Save changes</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!rows.length && <EmptyState title="Nothing here" body={tab === 'Active' ? 'Post something you no longer need.' : undefined} actionLabel={tab === 'Active' ? '+ New listing' : undefined} onAction={onNew} />}
      </div>
    </div>
  );
}
