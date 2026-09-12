import type { CSSProperties, KeyboardEvent } from 'react';
import { color } from '../theme/tokens';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  style?: CSSProperties;
}

export default function Toggle({ checked, onChange, style }: ToggleProps) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => (e.key === 'Enter' || e.key === ' ') && onChange()}
      style={{
        flex: 'none', width: 44, height: 26, borderRadius: 14, cursor: 'pointer',
        background: checked ? color.pink : '#E3CDD8',
        display: 'flex', alignItems: 'center', padding: 3,
        justifyContent: checked ? 'flex-end' : 'flex-start',
        transition: 'background .16s', ...style,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: color.white,
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </div>
  );
}
