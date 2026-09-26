import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { color, font } from '../theme/tokens';

interface ChipProps {
  active?: boolean;
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => void;
  size?: 'md' | 'sm';
  style?: CSSProperties;
}

// Filter / condition / handover-spot chip. Controlled by the active prop.
export default function Chip({ active, children, onClick, size = 'md', style }: ChipProps) {
  const pad = size === 'sm' ? '6px 10px' : '9px 14px';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick && onClick(e)}
      style={{
        padding: pad, borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap',
        border: '1.5px solid ' + (active ? color.pink : color.field),
        background: active ? color.pink : color.white,
        color: active ? color.white : color.body,
        font: `600 12.5px/1.2 ${font}`, ...style,
      }}
    >
      {children}
    </div>
  );
}
