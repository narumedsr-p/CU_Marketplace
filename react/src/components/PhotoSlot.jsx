import { photoFill } from '../theme/tokens';

// Pass src once real photos exist; otherwise you get the hatched placeholder.
export default function PhotoSlot({
  src, alt = '', label = 'PHOTO', ratio = '1/1', radius = 0, children, style,
}) {
  return (
    <div style={{
      position: 'relative', aspectRatio: ratio, borderRadius: radius,
      overflow: 'hidden', background: src ? '#eee' : photoFill,
      display: 'grid', placeItems: 'center', ...style,
    }}>
      {src ? (
        <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          font: '600 9.5px/1.4 ui-monospace,monospace', color: '#E27FA9',
          letterSpacing: '.1em', textAlign: 'center', padding: '0 8px',
          whiteSpace: 'pre-line',
        }}>{label}</div>
      )}
      {children}
    </div>
  );
}
