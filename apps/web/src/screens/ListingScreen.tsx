import { useState } from 'react';
import { color, font, baht, labelStyle } from '../theme/tokens';
import PhotoSlot from '../components/PhotoSlot';
import StatusBadge from '../components/StatusBadge';
import SellerTrustCard from '../components/SellerTrustCard';
import Button from '../components/Button';
import type { Listing } from '../types';

interface ListingScreenProps {
  listing: Listing;
  onPlaceOrder: () => void;
  onChat: () => void;
  onToggleWishlist: () => void;
  wished: boolean;
  onViewSeller: () => void;
}

// Listing detail. No view counter by design — wishlist count is the social proof.
export default function ListingScreen({
  listing, onPlaceOrder, onChat, onToggleWishlist, wished,
  onViewSeller,
}: ListingScreenProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const available = listing.status === 'Available';

  const specs: [string, string | number][] = [
    ['CONDITION', listing.cond ?? ''],
    ['CATEGORY', listing.cat],
    ['SELLER FACULTY', listing.faculty ?? ''],
    ['HANDOVER SPOT', listing.spot],
    ['LISTING STATUS', listing.status],
    ['POSTED', listing.posted],
  ];

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      <div style={{ font: `500 12.5px/1 ${font}`, color: color.muted }}>
        Catalog · {listing.cat} · <span style={{ color: color.ink }}>{listing.title}</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)',
        gap: 28, marginTop: 16, alignItems: 'start',
      }}>
        <div>
          <PhotoSlot
            ratio="4/3" radius={14}
            src={listing.photos?.[photoIndex]}
            label={`PHOTO ${photoIndex + 1} / 4\n${listing.cat}`}
            style={{ border: '1px solid ' + color.line }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 10 }}>
            {[0, 1, 2, 3].map((n) => (
              <PhotoSlot
                key={n} radius={9} src={listing.photos?.[n]} label={'PH ' + (n + 1)}
                style={{
                  cursor: 'pointer',
                  border: '1px solid ' + (n === photoIndex ? color.pink : color.line),
                }}
              >
                <div onClick={() => setPhotoIndex(n)} style={{ position: 'absolute', inset: 0 }} />
              </PhotoSlot>
            ))}
          </div>

          <div style={{ marginTop: 22, borderTop: '1px solid ' + color.lineSoft, paddingTop: 20 }}>
            <div style={{ font: `700 15px/1 ${font}` }}>Description</div>
            <div style={{
              font: `400 14px/1.7 ${font}`, color: color.body, marginTop: 9, textWrap: 'pretty',
            }}>{listing.desc}</div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 1,
              background: color.lineSoft, border: '1px solid ' + color.lineSoft,
              borderRadius: 10, overflow: 'hidden', marginTop: 18,
            }}>
              {specs.map(([k, v]) => (
                <div key={k} style={{ background: color.white, padding: '12px 14px' }}>
                  <div style={labelStyle}>{k}</div>
                  <div style={{ font: `500 13.5px/1.3 ${font}`, marginTop: 6 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ position: 'sticky', top: 90 }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <div style={{
              padding: '4px 9px', borderRadius: 6, background: color.pinkTint,
              border: '1px solid ' + color.pinkLine, font: `600 11px/1.3 ${font}`, color: '#A81756',
            }}>{listing.cond}</div>
            <StatusBadge status={listing.status} />
          </div>

          <div style={{
            font: `700 25px/1.28 ${font}`, marginTop: 12,
            letterSpacing: '-.01em', textWrap: 'pretty',
          }}>{listing.title}</div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
            <div style={{ font: `700 34px/1 ${font}`, color: color.pink }}>{baht(listing.price)}</div>
            {listing.was && (
              <div style={{
                font: `500 13px/1 ${font}`, color: color.faint, textDecoration: 'line-through',
              }}>{baht(listing.was)}</div>
            )}
          </div>

          <div style={{ font: `500 12.5px/1.5 ${font}`, color: color.muted, marginTop: 7 }}>
            {listing.watchers} people wishlisted this · posted {listing.posted}
          </div>

          <div style={{ marginTop: 18 }}>
            <SellerTrustCard
              seller={{
                name: listing.seller, rating: listing.rating, reviewCount: listing.reviewCount,
                faculty: listing.faculty ?? '', handovers: listing.handovers,
                replyTime: listing.replyTime, since: listing.since,
              }}
              onView={onViewSeller}
            />
          </div>

          <div style={{
            marginTop: 14, border: '1px solid ' + color.pinkLine, background: color.pinkTint,
            borderRadius: 12, padding: '13px 15px',
          }}>
            <div style={{ ...labelStyle, color: '#A81756' }}>Handover spot</div>
            <div style={{ font: `500 13.5px/1.4 ${font}`, marginTop: 7 }}>{listing.spot}</div>
            <div style={{ font: `400 12.5px/1.5 ${font}`, color: color.muted, marginTop: 4 }}>
              Pickup window is confirmed in chat after you order.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Button onClick={onPlaceOrder} disabled={!available} style={{ flex: 1, opacity: available ? 1 : .55 }}>
              {available ? 'Place order' : 'Reserved by someone else'}
            </Button>
            <Button variant="outline" onClick={onChat}>Chat</Button>
          </div>

          <Button
            variant="ghost" full onClick={onToggleWishlist}
            style={{ marginTop: 10, color: wished ? color.pink : color.muted }}
          >
            ♥ {wished ? 'Saved to wishlist' : 'Add to wishlist'}
          </Button>

        </div>
      </div>
    </div>
  );
}
