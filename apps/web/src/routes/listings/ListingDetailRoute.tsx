import type { ComponentProps } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import ListingScreen from '../../screens/ListingScreen';
import type { Listing } from '../../types';

export interface ListingDetailRouteProps {
  listings: Listing[];
  getScreenProps: (listing: Listing) => ComponentProps<typeof ListingScreen>;
}

export default function ListingDetailRoute({ listings, getScreenProps }: ListingDetailRouteProps) {
  const { listingId } = useParams<{ listingId: string }>();
  const listing = listings.find((item) => item.id === Number(listingId));

  if (!listing) {
    return <Navigate to="/listings" replace />;
  }

  return <ListingScreen {...getScreenProps(listing)} />;
}
