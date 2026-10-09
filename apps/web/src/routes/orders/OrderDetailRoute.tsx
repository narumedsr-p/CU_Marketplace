import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import OrderScreen from '../../screens/OrderScreen';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import { baht, color, font } from '../../theme/tokens';
import { fetchOrderDetail, toOrder, type ApiOrder } from '../../api/orders';
import type { Order, Sale } from '../../types';

export interface OrderDetailRouteProps {
  orders: Order[];
  sales: Sale[];
  currentUserId: string;
  onScanQr: (order: Order) => void;
  onChat: (order: Order) => void;
  onCancel: (order: Order) => void;
  onRate: (order: Order) => void;
  onShowSellerQr: (sale: Sale) => void;
  onCancelSale: (saleId: string) => void;
  onBrowse: () => void;
}

export default function OrderDetailRoute({
  orders, sales, currentUserId, onScanQr, onChat, onCancel, onRate, onShowSellerQr, onCancelSale, onBrowse,
}: OrderDetailRouteProps) {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const [detail, setDetail] = useState<ApiOrder | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setDetail(undefined);
    fetchOrderDetail(orderId).then((item) => { if (active) setDetail(item); })
      .catch(() => { if (active) setDetail(null); });
    return () => { active = false; };
  }, [orderId]);

  const buyerOrder = orders.find((candidate) => candidate.id === orderId)
    ?? (detail?.buyerId === currentUserId ? toOrder(detail, null) : null);
  const sale = sales.find((candidate) => candidate.id === orderId);
  const isSeller = detail?.sellerId === currentUserId || (!detail && !!sale);

  if (isSeller) {
    const status = detail?.status === 'Pending' ? 'Reserved' : detail?.status ?? sale?.status ?? 'Reserved';
    const title = detail?.itemTitle || sale?.title || 'Unavailable item';
    const price = detail ? Number(detail.agreedPrice) : sale?.price ?? 0;
    return (
      <div style={{ padding: '24px', maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ font: `700 22px/1.2 ${font}` }}>Order ORD-{orderId.slice(0, 8).toUpperCase()}</div>
          <StatusBadge status={status} />
        </div>
        <div style={{ border: `1px solid ${color.line}`, borderRadius: 12, padding: 18, marginTop: 20 }}>
          <div style={{ font: `600 16px/1.4 ${font}` }}>{title}</div>
          <div style={{ font: `700 19px/1.4 ${font}`, color: color.pink, marginTop: 6 }}>{baht(price)}</div>
          {sale && <div style={{ font: `500 13px/1.5 ${font}`, color: color.muted, marginTop: 6 }}>Buyer {sale.buyer}</div>}
          {status === 'Reserved' && sale && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button size="sm" onClick={() => onShowSellerQr(sale)}>Show handover QR</Button>
              <Button size="sm" variant="ghost" onClick={() => onCancelSale(sale.id)}>Cancel reservation</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (buyerOrder) {
    return <OrderScreen key={orderId} order={buyerOrder} onScanQr={() => onScanQr(buyerOrder)} onChat={() => onChat(buyerOrder)} onCancel={() => onCancel(buyerOrder)} onRate={() => onRate(buyerOrder)} onBrowse={onBrowse} />;
  }

  if (detail === undefined) return <div style={{ padding: 24, color: color.muted }}>Loading order…</div>;

  return <div style={{ padding: 24 }}><EmptyState title="Order unavailable" body="This order could not be opened from your account." actionLabel="Browse catalog" onAction={onBrowse} /></div>;
}
