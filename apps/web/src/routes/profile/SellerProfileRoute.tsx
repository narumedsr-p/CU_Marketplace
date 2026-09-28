import type { ComponentProps } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import ProfileScreen from '../../screens/ProfileScreen';
import type { Listing } from '../../types';

export interface SellerProfileRouteProps
  extends Omit<ComponentProps<typeof ProfileScreen>, 'isSelf' | 'user' | 'stats' | 'listings' | 'onChat' | 'onReport'> {
  listings: Listing[];
  onChat: (sellerName: string) => void;
  onReport: (sellerName: string) => void;
}

export default function SellerProfileRoute({ listings, onChat, onReport, ...props }: SellerProfileRouteProps) {
  const { sellerName } = useParams<{ sellerName: string }>();
  const sellerListings = listings.filter((listing) => listing.seller === sellerName);
  const seller = sellerListings[0];

  if (!sellerName || !seller) {
    return <Navigate to="/browse" replace />;
  }

  return (
    <ProfileScreen
      key={sellerName}
      {...props}
      isSelf={false}
      user={{
        name: sellerName, memberType: 'Student',
        faculty: seller.faculty ?? '', since: seller.since,
      }}
      stats={[
        ['SELLER RATING', seller.rating + '★'],
        ['HANDOVERS', seller.handovers],
        ['REVIEWS', seller.reviewCount],
        ['AVG REPLY', seller.replyTime],
      ]}
      listings={sellerListings}
      onChat={() => onChat(sellerName)}
      onReport={() => onReport(sellerName)}
    />
  );
}
