import { useState } from 'react';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { baht, color, font, photoFill } from '../theme/tokens';
import type { Order } from '../types';

type OrderFilter = 'All' | 'Active' | 'Completed';

interface OrdersListScreenProps {
  orders: Order[];
  onOpenOrder: (order: Order) => void;
  onBrowse: () => void;
}

export default function OrdersListScreen({ orders, onOpenOrder, onBrowse }: OrdersListScreenProps) {
  const [filter, setFilter] = useState<OrderFilter>('All');
  const visibleOrders = orders.filter((order) => {
    if (filter === 'Active') return order.status === 'Reserved';
    if (filter === 'Completed') return order.status === 'Completed';
    return true;
  });

  return (
    <div style={{ padding: '24px 24px 44px', maxWidth: 940 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, font: `700 24px/1.2 ${font}`, letterSpacing: '-.02em' }}>My orders</h1>
          <p style={{ margin: '7px 0 0', font: `400 13.5px/1.6 ${font}`, color: color.muted }}>
            Track active reservations and review your completed handovers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 10, background: color.canvas }}>
          {(['All', 'Active', 'Completed'] as OrderFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              style={{
                border: 0,
                borderRadius: 7,
                padding: '8px 13px',
                cursor: 'pointer',
                background: filter === option ? color.white : 'transparent',
                color: filter === option ? color.ink : color.muted,
                boxShadow: filter === option ? '0 2px 8px rgba(70,31,49,.08)' : 'none',
                font: `600 12.5px/1 ${font}`,
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {visibleOrders.length === 0 ? (
        <div style={{ marginTop: 24 }}>
          <EmptyState
            title="No orders here"
            body="There are no orders matching this filter."
            actionLabel="Browse catalog"
            onAction={onBrowse}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22 }}>
          {visibleOrders.map((order) => (
            <button
              key={order.reference}
              type="button"
              onClick={() => onOpenOrder(order)}
              style={{
                width: '100%',
                border: `1px solid ${color.line}`,
                borderRadius: 12,
                padding: 0,
                overflow: 'hidden',
                background: color.white,
                color: color.ink,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', gap: 15, padding: 15, alignItems: 'center' }}>
                <div style={{ width: 78, height: 78, borderRadius: 9, background: photoFill, flex: 'none' }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: `600 15px/1.4 ${font}`, textWrap: 'pretty' }}>{order.title}</div>
                      <div style={{ font: `500 12px/1.5 ${font}`, color: color.muted, marginTop: 4 }}>
                        Seller {order.seller} · {order.faculty}
                      </div>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'end', marginTop: 11, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ font: `700 17px/1 ${font}`, color: color.pink }}>{baht(order.price)}</div>
                      <div style={{ font: `500 11.5px/1.4 ${font}`, color: color.faint, marginTop: 5 }}>
                        {order.reference} · placed {order.placedAt}
                      </div>
                    </div>
                    <div style={{ font: `600 12px/1.4 ${font}`, color: color.pink }}>View order →</div>
                  </div>
                </div>
              </div>

              {order.status === 'Reserved' && (
                <div style={{ borderTop: `1px solid ${color.pinkLine}`, background: color.pinkTint, padding: '9px 15px', font: `500 12px/1.45 ${font}`, color: color.pinkDeep }}>
                  Pickup {order.window} · {order.spot}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
