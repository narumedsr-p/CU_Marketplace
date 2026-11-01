import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { color, font, initialsOf } from '../theme/tokens';
import type { CurrentUser } from '../types';

// Below this width (roughly a laptop split half-screen) the text links collapse into
// a "More" dropdown so the search bar keeps usable room instead of being squeezed out.
const COLLAPSE_BREAKPOINT = 900;

interface TopNavProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch?: () => void;
  orderCount?: number;
  unreadCount?: number;
  onHome: () => void;
  onWishlist: () => void;
  onChat?: () => void;
  onNotifications?: () => void;
  onOrders: () => void;
  onSell: () => void;
  onProfile: () => void;
  user?: CurrentUser;
}

// Desktop app header. Sticky pink bar with search, wishlist, orders, sell, avatar.
export default function TopNav({
  query, onQueryChange, onSearch, orderCount = 0, unreadCount = 0,
  onHome, onWishlist, onChat, onNotifications, onOrders, onSell, onProfile, user,
}: TopNavProps) {
  const [hoverSearch, setHoverSearch] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [moreOpen]);

  const navLink: CSSProperties = {
    font: `500 13.5px/1 ${font}`, color: 'rgba(255,255,255,.85)',
    cursor: 'pointer', whiteSpace: 'nowrap',
  };
  // Same links, dark text — used inside the white dropdown panel instead of on the pink bar.
  const dropdownLink: CSSProperties = {
    font: `500 13.5px/1 ${font}`, color: color.ink,
    cursor: 'pointer', whiteSpace: 'nowrap', padding: '9px 12px', borderRadius: 7,
  };

  const badge: CSSProperties = {
    display: 'inline-block', minWidth: 16, padding: '1px 4px', borderRadius: 9,
    font: `700 10.5px/1.4 ${font}`, textAlign: 'center',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 18, padding: '14px 24px',
      background: color.pink, position: 'sticky', zIndex: 60,
      // Matches AppShell's top padding (14px), so the bar keeps the same gap from the
      // browser edge once stuck instead of jumping flush against it.
      top: 14,
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

      <style>{`
        @media (max-width: ${COLLAPSE_BREAKPOINT}px) {
          .rsa-nav-links { display: none !important; }
          .rsa-nav-more { display: block !important; }
        }
      `}</style>

      <div className="rsa-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 'none' }}>
        <div onClick={onWishlist} style={navLink}>♥ Wishlist</div>
        {onChat && <div onClick={onChat} style={navLink}>Chat</div>}
        {onNotifications && (
          <div onClick={onNotifications} style={navLink}>
            Alerts{' '}
            <span style={{ ...badge, background: color.white, color: color.pink }}>{unreadCount}</span>
          </div>
        )}
        <div onClick={onOrders} style={navLink}>
          Orders{' '}
          <span style={{ ...badge, background: color.white, color: color.pink }}>{orderCount}</span>
        </div>
      </div>

      <div ref={moreRef} className="rsa-nav-more" style={{ display: 'none', position: 'relative', flex: 'none' }}>
        <button
          type="button" onClick={() => setMoreOpen((o) => !o)} aria-label="More navigation links"
          style={{
            width: 36, height: 36, borderRadius: 8, border: 0, cursor: 'pointer',
            background: 'rgba(255,255,255,.18)', color: color.white, font: '600 16px/1 sans-serif',
            display: 'grid', placeItems: 'center',
          }}
        >☰</button>
        {moreOpen && (
          <div style={{
            position: 'absolute', top: '120%', right: 0, minWidth: 170, padding: 6,
            background: color.white, borderRadius: 10, boxShadow: '0 8px 24px rgba(93,20,54,.18)',
            display: 'flex', flexDirection: 'column', gap: 2, zIndex: 100,
          }}>
            <div onClick={() => { onWishlist(); setMoreOpen(false); }} style={dropdownLink}>♥ Wishlist</div>
            {onChat && <div onClick={() => { onChat(); setMoreOpen(false); }} style={dropdownLink}>Chat</div>}
            {onNotifications && (
              <div onClick={() => { onNotifications(); setMoreOpen(false); }} style={{ ...dropdownLink, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Alerts <span style={{ ...badge, background: color.pinkTint, color: color.pink }}>{unreadCount}</span>
              </div>
            )}
            <div onClick={() => { onOrders(); setMoreOpen(false); }} style={{ ...dropdownLink, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Orders <span style={{ ...badge, background: color.pinkTint, color: color.pink }}>{orderCount}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 'none' }}>
        <div onClick={onSell} style={{
          padding: '8px 15px', borderRadius: 8, background: color.ink, color: color.white,
          font: `600 13px/1 ${font}`, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ Sell</div>
        <div onClick={onProfile} style={{
          width: 32, height: 32, borderRadius: '50%', background: color.pinkLine,
          border: '2px solid ' + color.white, display: 'grid', placeItems: 'center',
          font: `700 12px/1 ${font}`, color: color.pink, cursor: 'pointer', flex: 'none', overflow: 'hidden',
        }}>
          {user?.photo
            ? <img src={user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initialsOf(user?.name || 'RS')}
        </div>
      </div>
    </div>
  );
}
