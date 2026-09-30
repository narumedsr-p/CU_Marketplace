import { useState } from 'react';
import { color, font, baht, gradient, initialsOf } from '../theme/tokens';
import ListingGrid from '../components/ListingGrid';
import StatusBadge from '../components/StatusBadge';
import StarRating from '../components/StarRating';
import Button from '../components/Button';
import Toggle from '../components/Toggle';
import type {
  Listing, ListingStatus, NotificationPrefDef, NotificationPrefsState, Purchase, Review, Sale,
} from '../types';

interface ProfileUser {
  name: string;
  memberType: string;
  faculty: string;
  joined?: string;
  since?: string;
}

interface ProfileScreenProps {
  user: ProfileUser;
  isSelf: boolean;
  stats: [string, string | number][];
  listings: Listing[];
  purchases?: Purchase[];
  sales?: Sale[];
  onShowHandoverCode?: (sale: Sale) => void;
  reviews?: Review[];
  prefs?: NotificationPrefsState;
  onTogglePref: (key: string) => void;
  notificationPrefs?: NotificationPrefDef[];
  onEditProfile: () => void;
  onWishlist: () => void;
  onSell: () => void;
  onChat: () => void;
  onReport: () => void;
  onOpenListing: (listing: Listing) => void;
}

/**
 * isSelf gates everything private:
 *   own profile   -> Edit profile, Wishlist, +Sell, Purchases tab, Sales tab, Notifications tab
 *   other profile -> Chat with seller, Report; Listings + Reviews only
 */
export default function ProfileScreen({
  user, isSelf, stats, listings, purchases = [], sales = [], onShowHandoverCode, reviews = [],
  prefs = {}, onTogglePref, notificationPrefs = [],
  onEditProfile, onWishlist, onSell, onChat, onReport, onOpenListing,
}: ProfileScreenProps) {
  const tabs = isSelf
    ? ['Listings', 'Purchases', 'Sales', 'Reviews', 'Notifications']
    : ['Listings', 'Reviews'];
  const [tab, setTab] = useState('Listings');
  const active = tabs.includes(tab) ? tab : 'Listings';

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ height: 132, background: color.pink, backgroundImage: gradient }} />

      <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', marginTop: -42, flexWrap: 'wrap' }}>
          <div style={{
            width: 96, height: 96, borderRadius: 24, background: color.pinkLine,
            border: '4px solid ' + color.white, display: 'grid', placeItems: 'center',
            font: `700 30px/1 ${font}`, color: color.pink, flex: 'none',
          }}>{initialsOf(user.name)}</div>

          <div style={{ paddingBottom: 6, flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <div style={{ font: `700 22px/1.2 ${font}` }}>{user.name}</div>
              <div style={{
                padding: '3px 8px', borderRadius: 6, background: color.pink, color: color.white,
                font: `600 10px/1.4 ${font}`, letterSpacing: '.05em', whiteSpace: 'nowrap',
              }}>CHULA VERIFIED</div>
            </div>
            <div style={{ font: `500 13px/1.5 ${font}`, color: color.muted, marginTop: 5 }}>
              {user.memberType} · Faculty of {user.faculty} · {isSelf ? 'joined ' + user.joined : 'member since ' + user.since}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 9, paddingBottom: 6, flexWrap: 'wrap' }}>
            {isSelf ? (
              <>
                <Button size="sm" variant="ghost" onClick={onEditProfile}>Edit profile</Button>
                <Button size="sm" variant="ghost" onClick={onWishlist}>♥ Wishlist</Button>
                <Button size="sm" onClick={onSell}>+ Sell</Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={onChat}>Chat with seller</Button>
                <Button size="sm" variant="ghost" onClick={onReport}>Report</Button>
              </>
            )}
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 1,
          background: color.lineSoft, border: '1px solid ' + color.lineSoft,
          borderRadius: 12, overflow: 'hidden', marginTop: 22,
        }}>
          {stats.map(([k, v]) => (
            <div key={k} style={{ background: color.white, padding: '15px 17px' }}>
              <div style={{ font: `700 21px/1 ${font}`, color: color.pink }}>{v}</div>
              <div style={{
                font: `600 10.5px/1.3 ${font}`, letterSpacing: '.09em',
                color: color.faint, marginTop: 6,
              }}>{k}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 22, borderBottom: '1px solid ' + color.lineSoft, marginTop: 24 }}>
          {tabs.map((t) => (
            <div key={t} onClick={() => setTab(t)} style={{
              padding: '0 0 11px', cursor: 'pointer', font: `600 14px/1 ${font}`,
              color: active === t ? color.pink : color.muted,
              borderBottom: '2.5px solid ' + (active === t ? color.pink : 'transparent'),
            }}>{t}</div>
          ))}
        </div>

        {active === 'Listings' && (
          <div style={{ paddingTop: 18 }}>
            <ListingGrid listings={listings} onOpen={onOpenListing} showFaculty={false} />
          </div>
        )}

        {active === 'Purchases' && isSelf && (
          <OrderTable
            intro="Everything you have bought, including cancelled reservations. Only you can see this tab."
            headers={['ITEM', 'SELLER', 'DATE', 'PAID', 'STATUS']}
            rows={purchases.map((p) => ({ ...p, party: p.seller }))}
          />
        )}

        {active === 'Sales' && isSelf && (
          <OrderTable
            intro="Your items that other people have reserved or bought, including cancelled orders. Only you can see this tab."
            headers={['ITEM', 'BUYER', 'DATE', 'PRICE', 'STATUS']}
            rows={sales.map((s) => ({
              ...s,
              party: s.buyer,
              onAction: s.status === 'Reserved' && onShowHandoverCode ? () => onShowHandoverCode(s) : undefined,
              actionLabel: 'Show handover code',
            }))}
          />
        )}

        {active === 'Reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 18, maxWidth: 720 }}>
            {reviews.map((r) => (
              <div key={r.id} style={{
                border: '1px solid ' + color.line, borderRadius: 12, padding: '15px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', background: color.pinkLine,
                    display: 'grid', placeItems: 'center', font: `700 11.5px/1 ${font}`, color: color.pink,
                  }}>{initialsOf(r.name)}</div>
                  <div>
                    <div style={{ font: `600 13.5px/1.3 ${font}` }}>{r.name}</div>
                    <div style={{ font: `500 11.5px/1.3 ${font}`, color: color.faint, marginTop: 3 }}>
                      {r.item} · {r.when}
                    </div>
                  </div>
                  <StarRating value={r.stars} size={13} style={{ marginLeft: 'auto' }} />
                </div>
                <div style={{
                  font: `400 13.5px/1.6 ${font}`, color: color.body, marginTop: 10, textWrap: 'pretty',
                }}>{r.text}</div>
              </div>
            ))}
          </div>
        )}

        {active === 'Notifications' && isSelf && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 1, background: color.lineSoft,
            border: '1px solid ' + color.lineSoft, borderRadius: 12, overflow: 'hidden',
            marginTop: 18, maxWidth: 640,
          }}>
            {notificationPrefs.map((p) => (
              <div key={p.key} style={{
                background: color.white, padding: '15px 17px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: `600 13.5px/1.3 ${font}` }}>{p.name}</div>
                  <div style={{ font: `400 12px/1.5 ${font}`, color: color.faint, marginTop: 3 }}>
                    {p.desc}
                  </div>
                </div>
                <Toggle
                  checked={!!prefs[p.key]}
                  onChange={() => onTogglePref(p.key)}
                  style={{ marginLeft: 'auto' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface OrderRow {
  id: string;
  title: string;
  spot: string;
  party: string;
  when: string;
  price: number;
  status: ListingStatus;
  action: string;
  onAction?: () => void;
  actionLabel?: string;
}

function OrderTable({ intro, headers, rows }: { intro: string; headers: string[]; rows: OrderRow[] }) {
  return (
    <div style={{ paddingTop: 18 }}>
      <div style={{
        font: `400 13px/1.6 ${font}`, color: color.muted, maxWidth: '60ch', textWrap: 'pretty',
      }}>
        {intro}
      </div>
      <div style={{
        border: '1px solid ' + color.lineSoft, borderRadius: 12, overflow: 'hidden', marginTop: 14,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,2.2fr) 1fr 1fr .9fr 1.1fr',
          gap: 1, background: color.lineSoft,
        }}>
          {headers.map((h) => (
            <div key={h} style={{
              background: color.pinkTint, padding: '11px 15px',
              font: `600 10.5px/1.4 ${font}`, letterSpacing: '.1em', color: '#A81756',
            }}>{h}</div>
          ))}
          {rows.map((p) => (
            <Row key={p.id} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ p }: { p: OrderRow }) {
  const cell = { background: color.white, padding: '13px 15px', display: 'flex', alignItems: 'center' };
  return (
    <>
      <div style={{ ...cell, display: 'block' }}>
        <div style={{ font: `600 13.5px/1.4 ${font}`, textWrap: 'pretty' as const }}>{p.title}</div>
        <div style={{ font: `500 11.5px/1.4 ${font}`, color: color.faint, marginTop: 4 }}>{p.spot}</div>
      </div>
      <div style={{ ...cell, font: `500 13px/1.4 ${font}` }}>{p.party}</div>
      <div style={{ ...cell, font: `500 13px/1.4 ${font}`, color: color.muted, whiteSpace: 'nowrap' as const }}>{p.when}</div>
      <div style={{ ...cell, font: `700 13.5px/1.4 ${font}`, color: color.pink, whiteSpace: 'nowrap' as const }}>
        {baht(p.price)}
      </div>
      <div style={{ ...cell, flexDirection: 'column' as const, gap: 6, justifyContent: 'center', alignItems: 'flex-start' }}>
        <StatusBadge status={p.status} />
        <span style={{ font: `500 11.5px/1.3 ${font}`, color: color.faint }}>{p.action}</span>
        {p.onAction && (
          <Button size="sm" variant="ink" onClick={p.onAction}>{p.actionLabel ?? p.action}</Button>
        )}
      </div>
    </>
  );
}
