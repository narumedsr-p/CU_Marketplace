import { color, font } from '../theme/tokens';
import Button from './Button';

interface EmptyStateProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div style={{
      padding: '56px 24px', textAlign: 'center',
      border: '1px dashed ' + color.field, borderRadius: 12,
    }}>
      <div style={{ font: `700 16px/1.3 ${font}` }}>{title}</div>
      {body && (
        <div style={{
          font: `400 13px/1.6 ${font}`, color: color.muted, marginTop: 7,
          maxWidth: '48ch', marginInline: 'auto', textWrap: 'pretty',
        }}>{body}</div>
      )}
      {actionLabel && (
        <div style={{ marginTop: 16 }}>
          <Button size="sm" onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
