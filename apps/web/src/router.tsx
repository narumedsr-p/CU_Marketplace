import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import ListingDetailRoute, { type ListingDetailRouteProps } from './routes/listings/ListingDetailRoute';
import ListingsRoute, { type ListingsRouteProps } from './routes/listings/ListingsRoute';
import OrderDetailRoute from './routes/orders/OrderDetailRoute';
import OrdersRoute, { type OrderRouteProps } from './routes/orders/OrdersRoute';
import ProfileRoute, { type ProfileRouteProps } from './routes/profile/ProfileRoute';
import SellerProfileRoute, { type SellerProfileRouteProps } from './routes/profile/SellerProfileRoute';

interface AppRouterProps {
  currentScreen: ReactNode;
  listingDetailRouteProps: ListingDetailRouteProps;
  listingsRouteProps: ListingsRouteProps;
  orderRouteProps: OrderRouteProps;
  profileRouteProps: ProfileRouteProps;
  sellerProfileRouteProps: SellerProfileRouteProps;
}

export default function AppRouter({
  currentScreen,
  listingDetailRouteProps,
  listingsRouteProps,
  orderRouteProps,
  profileRouteProps,
  sellerProfileRouteProps,
}: AppRouterProps) {
  return (
    <Routes>
      <Route path="/listings" element={<ListingsRoute {...listingsRouteProps} />} />
      <Route
        path="/listings/:listingId"
        element={<ListingDetailRoute {...listingDetailRouteProps} />}
      />
      <Route path="/orders" element={<OrdersRoute {...orderRouteProps} />} />
      <Route
        path="/orders/:orderId"
        element={<OrderDetailRoute {...orderRouteProps} />}
      />
      <Route path="/profile" element={<ProfileRoute {...profileRouteProps} />} />
      <Route
        path="/profile/:sellerName"
        element={<SellerProfileRoute {...sellerProfileRouteProps} />}
      />
      <Route path="*" element={currentScreen} />
    </Routes>
  );
}
