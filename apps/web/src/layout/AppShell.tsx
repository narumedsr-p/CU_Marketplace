import type { ReactNode } from 'react';
import { color } from '../theme/tokens';

interface AppShellProps {
  children?: ReactNode;
}

// Desktop page frame: canvas background, 1240px white card.
export default function AppShell({ children }: AppShellProps) {
  return (
    <div style={{ minHeight: '100vh', background: color.canvas, padding: '14px 20px 60px' }}>
      <div style={{
        maxWidth: 1240, margin: '0 auto', background: color.white,
        border: '1px solid ' + color.line, borderRadius: 16,
        boxShadow: '0 8px 34px rgba(93,20,54,.07)',
      }}>
        {children}
      </div>
    </div>
  );
}
