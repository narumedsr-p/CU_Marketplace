import { color, font } from '../theme/tokens';

// Read-only without onChange; a 5-star input with it.
export default function StarRating({ value = 0, onChange, size = 14, style }) {
  const interactive = typeof onChange === 'function';
  return (
    <div style={{ display: 'flex', gap: interactive ? 8 : 2, ...style }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={interactive ? () => onChange(n) : undefined}
          style={{
            font: `400 ${size}px/1 ${font}`,
            color: n <= value ? color.star : color.starOff,
            cursor: interactive ? 'pointer' : 'default',
          }}
        >★</span>
      ))}
    </div>
  );
}
