import { useParams } from 'react-router-dom';
import OrderScreen from '../../screens/OrderScreen';
import type { Order } from '../../types';

export interface OrderDetailRouteProps {
  orders: Order[];
  onScanQr: (order: Order) => void;
  onChat: (order: Order) => void;
  onCancel: (order: Order) => void;
  onRate: (order: Order) => void;
  onBrowse: () => void;
}

export default function OrderDetailRoute({
  orders, onScanQr, onChat, onCancel, onRate, onBrowse,
}: OrderDetailRouteProps) {
  const { orderId } = useParams<{ orderId: string }>();
  const order = orders.find((candidate) => candidate.id === orderId) ?? null;

  return (
    <OrderScreen
      key={orderId}
      order={order}
      onScanQr={() => order && onScanQr(order)}
      onChat={() => order && onChat(order)}
      onCancel={() => order && onCancel(order)}
      onRate={() => order && onRate(order)}
      onBrowse={onBrowse}
    />
  );
}
