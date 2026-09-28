import { useNavigate } from 'react-router-dom';
import OrdersListScreen from '../../screens/OrdersListScreen';
import type { Order } from '../../types';

export interface OrdersRouteProps {
  orders: Order[];
  onBrowse: () => void;
}

export default function OrdersRoute({ orders, onBrowse }: OrdersRouteProps) {
  const navigate = useNavigate();

  return (
    <OrdersListScreen
      orders={orders}
      onOpenOrder={(order) => navigate(`/orders/${order.id}`)}
      onBrowse={onBrowse}
    />
  );
}
