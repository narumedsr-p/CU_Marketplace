import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_ORDERS } from '../../data/mockOrders';
import OrderScreen from '../../screens/OrderScreen';
import OrdersListScreen from '../../screens/OrdersListScreen';

export type OrderRouteProps = ComponentProps<typeof OrderScreen>;

export default function OrdersRoute(props: OrderRouteProps) {
  const navigate = useNavigate();
  const orders = props.order
    ? [props.order, ...MOCK_ORDERS.filter((order) => order.reference !== props.order?.reference)]
    : MOCK_ORDERS;

  return (
    <OrdersListScreen
      orders={orders}
      onOpenOrder={(order) => navigate(`/orders/${order.reference}`)}
      onBrowse={props.onBrowse}
    />
  );
}
