import { useState, type ChangeEvent } from 'react';
import { color, font, baht, labelStyle, card, pageTitle, pageSub, initialsOf, shortName } from '../theme/tokens';
import Chip from '../components/Chip';
import Field from '../components/Field';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import PhotoSlot from '../components/PhotoSlot';
import EmptyState from '../components/EmptyState';
import type { ReviewOrderSummary, SellerStats } from '../types';

const LABELS = ['0 stars — very poor', '1 star — poor', '2 stars — below expectations', '3 stars — okay', '4 stars — good', '5 stars — excellent'];
const TAGS = ['On time', 'As described', 'Friendly', 'Fast replies', 'Fair price', 'Easy meetup'];

interface ReviewScreenProps {
  order: ReviewOrderSummary;
  sellerStats?: SellerStats;
  reviewerName?: string;
  submitted?: boolean;
  tags?: string[];
  onSubmit?: (payload: { stars: number; tags: string[]; text: string }) => void;
  onGoHandover: () => void;
  onHome: () => void;
}

// Rate seller (FR 2.9, UC-02). 0–5 stars + text, buyer only, COMPLETED orders only.
export default function ReviewScreen({
  order, sellerStats = { avg: 0, count: 0 }, reviewerName = 'You', submitted, tags = TAGS,
  onSubmit, onGoHandover, onHome,
}: ReviewScreenProps) {
  const [stars, setStars] = useState<number | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState('');
  const locked = order.status !== 'Completed';

  const pick = (n: number) => setStars(stars === 1 && n === 1 ? 0 : n); // tap 1★ again → 0
  const toggleTag = (t: string) => setPicked(picked.includes(t) ? picked.filter((x) => x !== t) : [...picked, t]);
  const shownStars = stars ?? 0;

  return (
    <div style={{ padding: '22px 24px 40px', maxWidth: 948 }}>
      <div style={pageTitle}>Rate the seller</div>
      <div style={pageSub}>One review per completed order. It's public on the seller's profile.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 18, marginTop: 18, alignItems: 'start' }}>
        <div>
          <div style={{ ...card, padding: 15, display: 'flex', gap: 13 }}>
            <PhotoSlot src={order.photo} label="" radius={9} style={{ width: 60, flex: 'none' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ font: `600 14px/1.35 ${font}` }}>{order.title}</div>
              <div style={{ font: `500 12px/1.5 ${font}`, color: color.muted, marginTop: 4 }}>{baht(order.price)} · {order.seller} · {order.when}</div>
              <StatusBadge status={order.status} style={{ display: 'inline-block', marginTop: 7 }} />
            </div>
          </div>

          {locked && (
            <div style={{ marginTop: 14 }}>
              <EmptyState
                title="Reviews open after handover"
                body={`This order is still ${order.status}. Scan the seller's QR at pickup to complete it, then come back to rate.`}
                actionLabel="Go to handover" onAction={onGoHandover}
              />
            </div>
          )}

          {!locked && !submitted && (
            <div style={{ ...card, padding: 18, marginTop: 14 }}>
              <div style={labelStyle}>Your rating</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} role="button" aria-label={n + ' stars'} onClick={() => pick(n)} style={{
                    font: `400 36px/1 ${font}`, padding: 2, cursor: 'pointer',
                    color: n <= shownStars ? color.star : color.starOff,
                  }}>★</span>
                ))}
                <div style={{ marginLeft: 8, font: `600 14px/1.3 ${font}`, color: color.body }}>
                  {stars === null ? 'Tap to rate (tap 1★ again for 0)' : LABELS[stars]}
                </div>
              </div>
              <div style={{ ...labelStyle, marginTop: 18 }}>What went well</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 10 }}>
                {tags.map((t) => <Chip key={t} size="sm" active={picked.includes(t)} onClick={() => toggleTag(t)}>{t}</Chip>)}
              </div>
              <div style={{ marginTop: 16 }}>
                <Field
                  as="textarea" rows={4} maxLength={500} value={text}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value.slice(0, 500))}
                  placeholder="Item was exactly as described, met on time at Sala Phra Kiao."
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <div style={{ font: `500 11.5px/1 ${font}`, color: color.faint }}>{text.length}/500</div>
                <Button
                  size="sm" disabled={stars === null}
                  onClick={() => onSubmit && onSubmit({ stars: stars ?? 0, tags: picked, text: text.trim() })}
                  style={{ marginLeft: 'auto', opacity: stars === null ? 0.45 : 1 }}
                >Submit review</Button>
              </div>
            </div>
          )}

          {!locked && submitted && (
            <div style={{ ...card, padding: '26px 20px', marginTop: 14, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF7EE', color: '#1E7A44', display: 'grid', placeItems: 'center', font: `700 24px/1 ${font}`, margin: '0 auto' }}>✓</div>
              <div style={{ font: `700 18px/1.3 ${font}`, marginTop: 12 }}>Review posted</div>
              <div style={{ font: `400 13px/1.6 ${font}`, color: color.muted, marginTop: 6 }}>
                {shortName(order.seller)}’s average is now {sellerStats.avg}★ across {sellerStats.count} reviews.
              </div>
              <div style={{ marginTop: 16 }}><Button size="sm" onClick={onHome}>Back to catalog</Button></div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, padding: 16 }}>
            <div style={labelStyle}>Seller today</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: color.pinkLine, display: 'grid', placeItems: 'center', font: `700 14px/1 ${font}`, color: color.pink }}>{initialsOf(order.seller)}</div>
              <div>
                <div style={{ font: `600 14px/1.3 ${font}` }}>{order.seller}</div>
                <div style={{ font: `500 12.5px/1.4 ${font}`, color: color.muted, marginTop: 3 }}>
                  <span style={{ color: color.star }}>★</span> {sellerStats.avg} · {sellerStats.count} reviews
                </div>
              </div>
            </div>
          </div>
          <div style={{ ...card, padding: 16 }}>
            <div style={labelStyle}>Preview</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: color.pinkLine, display: 'grid', placeItems: 'center', font: `700 11px/1 ${font}`, color: color.pink, flex: 'none' }}>{initialsOf(reviewerName)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ font: `600 13px/1.3 ${font}` }}>{shortName(reviewerName)}</div>
                <div style={{ font: `400 13px/1 ${font}`, color: color.star, marginTop: 4, letterSpacing: 1 }}>
                  {'★★★★★'.slice(0, shownStars)}{'☆☆☆☆☆'.slice(0, 5 - shownStars)}
                </div>
                <div style={{ font: `400 13px/1.55 ${font}`, color: color.body, marginTop: 5, textWrap: 'pretty' }}>
                  {text.trim() || (picked.length ? picked.join(' · ') : 'Your review appears here.')}
                </div>
              </div>
            </div>
          </div>
          <div style={{ font: `400 12px/1.6 ${font}`, color: color.faint, textWrap: 'pretty' }}>
            Keep it about the item and the handover. Reviews with personal details or contact info are removed by moderators.
          </div>
        </div>
      </div>
    </div>
  );
}
