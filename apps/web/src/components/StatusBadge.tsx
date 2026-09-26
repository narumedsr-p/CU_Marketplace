import type { CSSProperties } from 'react';
import { font, status as statusMap } from '../theme/tokens';
import type { ListingStatus } from '../types';

interface StatusBadgeProps {
  status: ListingStatus;
  style?: CSSProperties;
}

export default function StatusBadge({ status, style }: StatusBadgeProps) {
  const s = statusMap[status] || statusMap.Sold;
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 5, background: s.bg, color: s.fg,
      font: `600 11px/1.4 ${font}`, whiteSpace: 'nowrap', ...style,
    }}>
      {status}
    </span>
  );
}
