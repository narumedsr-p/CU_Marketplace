import { useState } from 'react';
import { color, font } from '../theme/tokens';
import StarRating from './StarRating';
import Button from './Button';

interface RateSellerDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (result: { stars: number; text: string }) => void;
}

export default function RateSellerDialog({ open, onClose, onSubmit }: RateSellerDialogProps) {
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  const [focus, setFocus] = useState(false);
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,16,22,.5)',
        display: 'grid', placeItems: 'center', zIndex: 200, padding: 24,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 420, background: color.white, borderRadius: 16,
        padding: 26, animation: 'rsaIn .18s ease-out',
      }}>
        <div style={{ font: `700 20px/1.2 ${font}` }}>Rate the seller</div>
        <div style={{ font: `400 13.5px/1.6 ${font}`, color: color.muted, marginTop: 7 }}>
          Only completed orders can be rated. Your rating updates the seller’s average immediately.
        </div>

        <StarRating value={stars} onChange={setStars} size={34} style={{ marginTop: 20 }} />

        <textarea
          rows={3} value={text} onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          placeholder="Item was exactly as described, met at Sala Phra Kiao."
          style={{
            width: '100%', marginTop: 16, padding: '12px 14px', borderRadius: 10,
            border: '1px solid ' + (focus ? color.pink : color.field),
            font: `400 14px/1.6 ${font}`, outline: 'none', resize: 'vertical',
          }}
        />

        <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
          <Button variant="ghost" onClick={onClose}>Later</Button>
          <Button full onClick={() => onSubmit({ stars, text })}>Submit rating</Button>
        </div>
      </div>
    </div>
  );
}
