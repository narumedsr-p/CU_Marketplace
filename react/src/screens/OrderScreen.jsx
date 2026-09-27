import { color, font, baht, labelStyle, photoFill } from '../theme/tokens';
import StatusBadge from '../components/StatusBadge';
import OrderTimeline from '../components/OrderTimeline';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';

// Buyer-side order view. The BUYER NEVER HOLDS A QR — the seller shows theirs.
export default function OrderScreen({
  order, onScanQr, onChat, onCancel, onRate, onBrowse,
}) {
  if (!order) {
    return (
      <div style={{ padding: '22px 24px 40px', maxWidth: 900 }}>
        <EmptyState
          title="No active orders"
          body="Place an order from any listing to see the reservation and handover flow."
          actionLabel="Browse catalog"
          onAction={onBrowse}
        />
      </div>
    );
  }

  const done = order.status === 'Completed';
  const steps = [
    { name: 'Order placed', when: order.placedAt + ' · item reserved', done: true },
    { name: 'Seller notified', when: order.placedAt + ' · chat + in-app alert', done: true },
    { name: 'Handover window', when: order.window + ' · ' + order.spot, done },
    { name: 'QR scanned, order closed', when: done ? order.completedAt : 'Waiting for scan', done },
  ];

  return (
    <div style={{ padding: '22px 24px 40px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ font: `700 22px/1.2 ${font}`, letterSpacing: '-.01em' }}>Order {order.reference}</div>
        <StatusBadge status={order.status} />
      </div>
      <div style={{ font: `400 13.5px/1.6 ${font}`, color: color.muted, marginTop: 6 }}>
        {done
          ? 'Handover confirmed. You can rate the seller now.'
          : 'Item is held for you until the pickup window ends. Scan the seller’s QR at handover.'}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px',
        gap: 22, marginTop: 20, alignItems: 'start',
      }}>
        <div>
          <div style={{
            border: '1px solid ' + color.line, borderRadius: 12, padding: 15,
            display: 'flex', gap: 14,
          }}>
            <div style={{
              width: 88, height: 88, flex: 'none', borderRadius: 9, background: photoFill,
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ font: `600 15px/1.35 ${font}`, textWrap: 'pretty' }}>{order.title}</div>
              <div style={{ font: `700 19px/1 ${font}`, color: color.pink, marginTop: 7 }}>
                {baht(order.price)}
              </div>
              <div style={{ font: `500 12.5px/1.5 ${font}`, color: color.muted, marginTop: 6 }}>
                Seller {order.seller} · {order.faculty}
              </div>
            </div>
          </div>

          <div style={{
            border: '1px solid ' + color.line, borderRadius: 12, padding: 16, marginTop: 14,
          }}>
            <div style={labelStyle}>Timeline</div>
            <div style={{ marginTop: 12 }}><OrderTimeline steps={steps} /></div>
          </div>
        </div>

        <div>
          <div style={{ border: '1px solid ' + color.line, borderRadius: 12, padding: '17px 18px' }}>
            <div style={labelStyle}>Pickup</div>
            <div style={{ font: `600 15px/1.4 ${font}`, marginTop: 9 }}>{order.window}</div>
            <div style={{ font: `500 13px/1.5 ${font}`, color: color.muted, marginTop: 3 }}>{order.spot}</div>

            <div style={{ height: 1, background: color.lineSoft, margin: '14px 0' }} />

            <div style={labelStyle}>Order reference</div>
            <div style={{ font: `700 15px/1 ${font}`, letterSpacing: '.14em', marginTop: 8 }}>
              {order.handoverCode}
            </div>
            <div style={{
              font: `400 12px/1.6 ${font}`, color: color.muted, marginTop: 9, textWrap: 'pretty',
            }}>
              The seller shows the QR at handover — you scan it to close the order.
              Buyers never hold a QR.
            </div>
          </div>

          {!done ? (
            <>
              <Button full onClick={onScanQr} style={{ marginTop: 13 }}>Scan seller’s QR</Button>
              <Button variant="outline" full onClick={onChat} style={{ marginTop: 9 }}>Chat with seller</Button>
              <Button variant="ghost" full onClick={onCancel} style={{ marginTop: 9 }}>Cancel order</Button>
              <div style={{
                font: `400 11.5px/1.6 ${font}`, color: color.faint, marginTop: 10, textWrap: 'pretty',
              }}>
                If the pickup window expires, the item returns to Available automatically.
              </div>
            </>
          ) : (
            !order.rated && <Button variant="ink" full onClick={onRate} style={{ marginTop: 13 }}>Rate the seller</Button>
          )}
        </div>
      </div>
    </div>
  );
}
