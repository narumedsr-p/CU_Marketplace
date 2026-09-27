import { font, severity, status } from '../theme/tokens';

// Small tinted label. Pass tone="severity" to read from the severity map.
export default function Pill({ children, value, tone = 'status', bg, fg, mono, style }) {
  const map = tone === 'severity' ? severity : status;
  const s = map[value ?? children] || { bg: '#F7F2F4', fg: '#4A3A42' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap',
      background: bg || s.bg, color: fg || s.fg,
      font: mono ? '600 11px/1.4 ui-monospace,monospace' : `600 10.5px/1.4 ${font}`, ...style,
    }}>{children ?? value}</span>
  );
}
