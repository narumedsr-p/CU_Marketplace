import type { ChangeEvent } from 'react';
import { color, font, labelStyle, photoFill } from '../theme/tokens';
import Field from '../components/Field';
import Chip from '../components/Chip';
import Button from '../components/Button';
import ListingCard from '../components/ListingCard';
import type { SellForm } from '../types';

interface SellScreenProps {
  form: SellForm;
  onChange: (form: SellForm) => void;
  onPublish: () => void;
  categories: string[];
  conditions: string[];
  spots: string[];
  photos?: string[];
  onAddPhoto: () => void;
}

// Post-a-listing form with a live card preview. Controlled: pass form + onChange.
export default function SellScreen({
  form, onChange, onPublish, categories, conditions, spots, photos = [],
  onAddPhoto,
}: SellScreenProps) {
  const set = (patch: Partial<SellForm>) => onChange({ ...form, ...patch });

  return (
    <div style={{ padding: '22px 24px 40px', maxWidth: 960 }}>
      <div style={{ font: `700 22px/1.2 ${font}`, letterSpacing: '-.01em' }}>Post a listing</div>
      <div style={{ font: `400 13.5px/1.6 ${font}`, color: color.muted, marginTop: 6 }}>
        Target: under 5 minutes end to end. Photos, price, condition and category are required.
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px',
        gap: 24, marginTop: 22, alignItems: 'start',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: 9 }}>Photos · up to 6</div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(104px,1fr))', gap: 10,
            }}>
              <div onClick={onAddPhoto} style={{
                aspectRatio: '1/1', borderRadius: 10, border: '1.5px dashed #E9A9C6',
                background: color.pinkTint, display: 'grid', placeItems: 'center',
                cursor: 'pointer', font: `600 11px/1.4 ${font}`, color: color.pink, textAlign: 'center',
              }}>+ Add<br />photo</div>
              {(photos.length ? photos : [1, 2, 3]).map((p, i) => (
                <div key={i} style={{
                  aspectRatio: '1/1', borderRadius: 10, background: photoFill,
                  border: '1px solid ' + color.line, display: 'grid', placeItems: 'center',
                  font: '600 9px/1 ui-monospace,monospace', color: '#E27FA9',
                }}>{'PH ' + (i + 1)}</div>
              ))}
            </div>
          </div>

          <Field
            label="Title" value={form.title}
            onChange={(e: ChangeEvent<HTMLInputElement>) => set({ title: e.target.value })}
            placeholder="e.g. Casio fx-991EX, barely used"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '180px minmax(0,1fr)', gap: 14 }}>
            <Field
              label="Price (THB)" value={form.price}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set({ price: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="550" inputMode="numeric"
              style={{ fontWeight: 600 }}
            />
            <Field as="select" label="Category" value={form.cat} onChange={(e: ChangeEvent<HTMLSelectElement>) => set({ cat: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Field>
          </div>

          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Condition</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {conditions.map((c) => (
                <Chip key={c} active={form.cond === c} onClick={() => set({ cond: c })}>{c}</Chip>
              ))}
            </div>
          </div>

          <Field
            as="textarea" label="Description" rows={4} value={form.desc}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set({ desc: e.target.value })}
            placeholder="Bought in 2025, all functions work, comes with the sleeve."
            style={{ lineHeight: 1.6 }}
          />

          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Handover spot</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {spots.map((c) => (
                <Chip key={c} active={form.spot === c} onClick={() => set({ spot: c })}>{c}</Chip>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          border: '1px solid ' + color.line, borderRadius: 12, padding: 16,
          position: 'sticky', top: 90,
        }}>
          <div style={labelStyle}>Live preview</div>
          <div style={{ marginTop: 11 }}>
            <ListingCard
              showFaculty={false}
              listing={{
                title: form.title || 'Your title appears here',
                price: form.price || 0, cat: form.cat, cond: form.cond,
                rating: '—', sold: 0, status: 'Available',
              }}
            />
          </div>
          <Button full onClick={onPublish} style={{ marginTop: 14 }}>Publish listing</Button>
          <div style={{
            font: `400 11.5px/1.6 ${font}`, color: color.faint, marginTop: 10, textWrap: 'pretty',
          }}>
            On publish we index the listing and evaluate it against everyone's auto-match keywords.
          </div>
        </div>
      </div>
    </div>
  );
}
