import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import OrderDetailRoute from './routes/orders/OrderDetailRoute';
import OrdersRoute, { type OrderRouteProps } from './routes/orders/OrdersRoute';

interface AppRouterProps {
  currentScreen: ReactNode;
  orderRouteProps: OrderRouteProps;
}

export default function AppRouter({ currentScreen, orderRouteProps }: AppRouterProps) {
  return (
    <Routes>
      <Route path="/orders" element={<OrdersRoute {...orderRouteProps} />} />
      <Route
        path="/orders/:orderId"
        element={<OrderDetailRoute {...orderRouteProps} />}
      />
      <Route path="*" element={currentScreen} />
    </Routes>
  );
}
