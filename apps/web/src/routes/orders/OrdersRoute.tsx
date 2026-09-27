import type { ComponentProps } from 'react';
import OrderScreen from '../../screens/OrderScreen';

export type OrderRouteProps = ComponentProps<typeof OrderScreen>;

export default function OrdersRoute(props: OrderRouteProps) {
  return <OrderScreen {...props} />;
}
