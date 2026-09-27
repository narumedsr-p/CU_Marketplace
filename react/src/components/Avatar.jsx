import { color, font, initialsOf } from '../theme/tokens';

// online: true | false | undefined (no dot)
export default function Avatar({ name, src, size = 40, online, muted, style }) {
  return (
    <div style={{ position: 'relative', flex: 'none', width: size, height: size, ...style }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        background: muted ? '#F2ECEF' : color.pinkLine, color: muted ? color.muted : color.pink,
        display: 'grid', placeItems: 'center', font: `700 ${Math.round(size / 3.1)}px/1 ${font}`,
      }}>
        {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(name)}
      </div>
      {online !== undefined && (
        <div style={{
          position: 'absolute', right: 0, bottom: 0, width: 11, height: 11, borderRadius: '50%',
          background: online ? '#2BB673' : '#D9C6CF', border: '2px solid #fff',
        }} />
      )}
    </div>
  );
}
