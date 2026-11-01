import type { ReactNode } from 'react';
import { color } from '../theme/tokens';

interface AppShellProps {
  children?: ReactNode;
  // Vertically centers the white card itself in the viewport instead of anchoring it
  // to the top — for pages like login where the card isn't meant to scroll with content.
  centered?: boolean;
}

// Desktop page frame: canvas background, 1240px white card.
export default function AppShell({ children, centered = false }: AppShellProps) {
  return (
    <div style={{
      minHeight: '100vh', background: color.canvas,
      padding: centered ? '14px 20px 60px' : '0 20px 60px',
      ...(centered ? { display: 'flex', alignItems: 'center' } : {}),
    }}>
      {!centered && (
        // Plugs the 14px gap above the sticky TopNav (see TopNav's top:14) with solid
        // canvas color, above it in z-order — without this, scrolled page content sitting
        // exactly behind that gap shows through, since nothing else covers that strip.
        <div style={{ position: 'sticky', top: 0, height: 14, background: color.canvas, zIndex: 70 }} />
      )}
      <div style={{
        maxWidth: 1240, margin: '0 auto', width: centered ? '100%' : undefined, background: color.white,
        border: '1px solid ' + color.line, borderRadius: 16,
        boxShadow: '0 8px 34px rgba(93,20,54,.07)',
      }}>
        {children}
      </div>
    </div>
  );
}
