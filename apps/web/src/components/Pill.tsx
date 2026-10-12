import type { CSSProperties, ReactNode } from 'react';
import { font, pillStatus } from '../theme/tokens';

interface PillProps {
  children?: ReactNode;
  value?: string;
  bg?: string;
  fg?: string;
  mono?: boolean;
  style?: CSSProperties;
}

// Small tinted label for listing and order status.
export default function Pill({ children, value, bg, fg, mono, style }: PillProps) {
  const key = value ?? (typeof children === 'string' ? children : undefined);
  const s = (key && pillStatus[key]) || { bg: '#F7F2F4', fg: '#4A3A42' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap',
      background: bg || s.bg, color: fg || s.fg,
      font: mono ? '600 11px/1.4 ui-monospace,monospace' : `600 10.5px/1.4 ${font}`, ...style,
    }}>{children ?? value}</span>
  );
}
