import { useParams } from 'react-router-dom';
import { MOCK_ORDERS } from '../../data/mockOrders';
import OrderScreen from '../../screens/OrderScreen';
import type { OrderRouteProps } from './OrdersRoute';

export default function OrderDetailRoute(props: OrderRouteProps) {
  const { orderId } = useParams<{ orderId: string }>();
  const order = [props.order, ...MOCK_ORDERS]
    .find((candidate) => candidate?.reference === orderId) ?? null;

  return <OrderScreen key={orderId} {...props} order={order} />;
}
