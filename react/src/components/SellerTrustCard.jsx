import { color, font, initialsOf } from '../theme/tokens';

export default function SellerTrustCard({ seller, onView }) {
  const stats = [
    ['HANDOVERS', seller.handovers],
    ['AVG REPLY', seller.replyTime],
    ['MEMBER SINCE', seller.since],
  ];
  return (
    <div style={{ border: '1px solid ' + color.line, borderRadius: 12, padding: '14px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', background: color.pinkLine,
          display: 'grid', placeItems: 'center', font: `700 14px/1 ${font}`,
          color: color.pink, flex: 'none',
        }}>{initialsOf(seller.name)}</div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ font: `600 14px/1.3 ${font}` }}>{seller.name}</div>
            <div style={{
              padding: '2px 6px', borderRadius: 5, background: color.pink,
              color: color.white, font: `600 9.5px/1.4 ${font}`,
              letterSpacing: '.04em', whiteSpace: 'nowrap',
            }}>CHULA VERIFIED</div>
          </div>
          <div style={{ font: `500 12px/1.4 ${font}`, color: color.muted, marginTop: 3 }}>
            <span style={{ color: color.star }}>★</span> {seller.rating} · {seller.reviewCount} reviews · {seller.faculty}
          </div>
        </div>

        {onView && (
          <div onClick={onView} style={{
            marginLeft: 'auto', font: `600 12px/1 ${font}`, color: color.pink,
            cursor: 'pointer', flex: 'none',
          }}>View</div>
        )}
      </div>

      <div style={{
        display: 'flex', gap: 16, marginTop: 13, paddingTop: 12,
        borderTop: '1px solid ' + color.lineSoft,
      }}>
        {stats.map(([k, v]) => (
          <div key={k}>
            <div style={{ font: `700 14px/1 ${font}` }}>{v}</div>
            <div style={{ font: `500 10.5px/1.3 ${font}`, color: color.faint, marginTop: 4 }}>{k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
