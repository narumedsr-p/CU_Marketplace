import { color, font } from '../theme/tokens';

export default function Checkbox({ checked, onChange, children, style }) {
  return (
    <div
      role="checkbox" aria-checked={checked} tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange && onChange()}
      style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', ...style }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 5, flex: 'none', marginTop: 1,
        border: '1.5px solid ' + (checked ? color.pink : color.field),
        background: checked ? color.pink : color.white, color: color.white,
        display: 'grid', placeItems: 'center', font: `700 11px/1 ${font}`,
      }}>{checked ? '✓' : ''}</div>
      {children && <div style={{ font: `400 13px/1.5 ${font}`, color: color.body }}>{children}</div>}
    </div>
  );
}
