import { useState, type CSSProperties } from 'react';
import { color, font, initialsOf } from '../theme/tokens';
import type { CurrentUser } from '../types';

interface TopNavProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch?: () => void;
  orderCount?: number;
  onHome: () => void;
  onWishlist: () => void;
  onOrders: () => void;
  onSell: () => void;
  onProfile: () => void;
  user?: CurrentUser;
}

// Desktop app header. Sticky pink bar with search, wishlist, orders, sell, avatar.
export default function TopNav({
  query, onQueryChange, onSearch, orderCount = 0,
  onHome, onWishlist, onOrders, onSell, onProfile, user,
}: TopNavProps) {
  const [hoverSearch, setHoverSearch] = useState(false);

  const navLink: CSSProperties = {
    font: `500 13.5px/1 ${font}`, color: 'rgba(255,255,255,.85)',
    cursor: 'pointer', whiteSpace: 'nowrap',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 18, padding: '14px 24px',
      background: color.pink, position: 'sticky', top: 0, zIndex: 60,
      borderRadius: '15px 15px 0 0',
    }}>
      <div onClick={onHome} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', flex: 'none' }}>
        <div style={{
          width: 29, height: 29, borderRadius: 8, background: color.white,
          display: 'grid', placeItems: 'center', font: `700 14px/1 ${font}`, color: color.pink,
        }}>R</div>
        <div style={{ font: `700 16px/1 ${font}`, color: color.white }}>RachaSA</div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSearch && onSearch(); }}
        style={{ flex: 1, minWidth: 0, display: 'flex', background: color.white, borderRadius: 9, overflow: 'hidden', height: 38 }}
      >
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search textbooks, lab coats, iPads…"
          style={{
            flex: 1, minWidth: 0, border: 0, outline: 'none', padding: '0 15px',
            font: `400 14px/1 ${font}`, background: 'transparent',
          }}
        />
        <button
          type="submit"
          onMouseEnter={() => setHoverSearch(true)}
          onMouseLeave={() => setHoverSearch(false)}
          style={{
            width: 52, border: 0, cursor: 'pointer', color: color.white,
            background: hoverSearch ? '#EC4B92' : color.pinkLight, font: `600 13px/1 ${font}`,
          }}
        >⌕</button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 'none' }}>
        <div onClick={onWishlist} style={navLink}>♥ Wishlist</div>
        <div onClick={onOrders} style={navLink}>
          Orders{' '}
          <span style={{
            display: 'inline-block', minWidth: 16, padding: '1px 4px', borderRadius: 9,
            background: color.white, color: color.pink, font: `700 10.5px/1.4 ${font}`, textAlign: 'center',
          }}>{orderCount}</span>
        </div>
        <div onClick={onSell} style={{
          padding: '8px 15px', borderRadius: 8, background: color.ink, color: color.white,
          font: `600 13px/1 ${font}`, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ Sell</div>
        <div onClick={onProfile} style={{
          width: 32, height: 32, borderRadius: '50%', background: color.pinkLine,
          border: '2px solid ' + color.white, display: 'grid', placeItems: 'center',
          font: `700 12px/1 ${font}`, color: color.pink, cursor: 'pointer', flex: 'none',
        }}>{initialsOf(user?.name || 'RS')}</div>
      </div>
    </div>
  );
}
