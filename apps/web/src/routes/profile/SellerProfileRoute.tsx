import { useEffect, useState, type ComponentProps } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import ProfileScreen from '../../screens/ProfileScreen';
import { getCurrentUserId } from '../../api/client';
import { memberSince, type ApiProfile } from '../../api/profiles';
import type { Listing, Review, SellerStats } from '../../types';

export interface SellerProfileRouteProps
  extends Omit<ComponentProps<typeof ProfileScreen>, 'isSelf' | 'user' | 'stats' | 'listings' | 'reviews' | 'onChat'> {
  listings: Listing[];
  loadProfile: (userId: string) => Promise<ApiProfile | null>;
  loadReviews: (userId: string) => Promise<Review[]>;
  loadRating: (userId: string) => Promise<SellerStats>;
  onChat: (sellerName: string) => void;
}

export default function SellerProfileRoute({
  listings, loadProfile, loadReviews, loadRating, onChat, ...props
}: SellerProfileRouteProps) {
  const { userId = '' } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<ApiProfile | null | undefined>(undefined);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<SellerStats>({ avg: 0, count: 0 });

  useEffect(() => {
    let active = true;
    setProfile(undefined);
    Promise.all([
      loadProfile(userId).catch(() => null),
      loadReviews(userId).catch(() => []),
      loadRating(userId).catch(() => ({ avg: 0, count: 0 })),
    ]).then(([loadedProfile, loadedReviews, loadedRating]) => {
      if (!active) return;
      setProfile(loadedProfile);
      setReviews(loadedReviews);
      setRating(loadedRating);
    });
    return () => { active = false; };
  }, [userId, loadProfile, loadReviews, loadRating]);

  if (userId === getCurrentUserId()) return <Navigate to="/profile" replace />;
  if (profile === undefined) return null;
  if (profile === null) return <Navigate to="/browse" replace />;

  const sellerListings = listings.filter((listing) => listing.sellerId === userId);
  const since = memberSince(profile);

  return (
    <ProfileScreen
      key={userId}
      {...props}
      isSelf={false}
      user={{ name: profile.displayName, memberType: profile.role, faculty: '', since }}
      stats={[
        ['SELLER RATING', `${rating.avg.toFixed(1)} ★`],
        ['ACTIVE LISTINGS', sellerListings.filter((l) => l.status === 'Available').length],
        ['REVIEWS', rating.count],
        ['MEMBER SINCE', since],
      ]}
      listings={sellerListings}
      reviews={reviews}
      onChat={() => onChat(profile.displayName)}
    />
  );
}
