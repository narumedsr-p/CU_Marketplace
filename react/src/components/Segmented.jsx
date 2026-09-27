import { color, font } from '../theme/tokens';

// options: ['A','B'] or [{ value, label }]
export default function Segmented({ options, value, onChange, style }) {
  return (
    <div role="tablist" style={{
      display: 'flex', gap: 2, background: color.canvas, borderRadius: 9, padding: 3,
      width: 'max-content', maxWidth: '100%', overflowX: 'auto', ...style,
    }}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const on = v === value;
        return (
          <button
            key={v} type="button" role="tab" aria-selected={on} onClick={() => onChange(v)}
            style={{
              border: 0, padding: '8px 14px', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap',
              background: on ? color.white : 'transparent', color: on ? color.pink : color.muted,
              boxShadow: on ? '0 1px 3px rgba(93,20,54,.14)' : 'none', font: `600 12.5px/1 ${font}`,
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}
