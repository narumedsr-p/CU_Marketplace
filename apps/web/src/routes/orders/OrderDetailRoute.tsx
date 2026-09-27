import { useParams } from 'react-router-dom';
import OrderScreen from '../../screens/OrderScreen';
import type { OrderRouteProps } from './OrdersRoute';

export default function OrderDetailRoute(props: OrderRouteProps) {
  const { orderId } = useParams<{ orderId: string }>();

  return <OrderScreen key={orderId} {...props} />;
}
