import { useState } from 'react';
import { color, font, baht, shadow } from '../theme/tokens';
import PhotoSlot from './PhotoSlot';

// Used by the catalog feed, search results, profile listings and the sell preview.
export default function ListingCard({ listing, onClick, showFaculty = true, compact = false }) {
  const [hover, setHover] = useState(false);
  const reserved = listing.status === 'Reserved';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: '1px solid ' + color.line, borderRadius: 12, overflow: 'hidden',
        background: color.white, cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow .16s, transform .16s',
        boxShadow: hover ? shadow.cardHover : 'none',
        transform: hover ? 'translateY(-2px)' : 'none',
      }}
    >
      <PhotoSlot src={listing.photo} label={'PHOTO\n' + listing.cat} alt={listing.title}>
        {reserved && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(26,16,22,.55)',
            display: 'grid', placeItems: 'center', color: color.white,
            font: `700 12px/1 ${font}`, letterSpacing: '.1em',
          }}>RESERVED</div>
        )}
        {listing.cond && (
          <div style={{
            position: 'absolute', top: 8, left: 8, padding: '3px 7px', borderRadius: 5,
            background: color.pink, color: color.white, font: `600 10px/1.3 ${font}`,
          }}>{listing.cond}</div>
        )}
      </PhotoSlot>

      <div style={{ padding: '11px 12px 13px' }}>
        <div style={{
          font: `500 13px/1.4 ${font}`, height: '2.8em', overflow: 'hidden', textWrap: 'pretty',
        }}>{listing.title}</div>

        <div style={{ font: `700 ${compact ? 15 : 17}px/1 ${font}`, color: color.pink, marginTop: 8 }}>
          {baht(listing.price)}
        </div>

        {showFaculty && listing.faculty && (
          <div style={{
            marginTop: 9, display: 'inline-block', padding: '3px 7px', borderRadius: 5,
            background: color.pinkTint, border: '1px solid ' + color.pinkLine,
            font: `500 10.5px/1.3 ${font}`, color: '#A81756',
          }}>{listing.faculty}</div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 9,
          font: `500 11px/1.3 ${font}`, color: color.muted,
        }}>
          <span style={{ color: color.star }}>★</span>{listing.rating}
          <span style={{ color: '#DCC8D1' }}>·</span>{listing.sold} sold
        </div>
      </div>
    </div>
  );
}
