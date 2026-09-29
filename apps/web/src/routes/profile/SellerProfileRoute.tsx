import { useEffect, useState, type ComponentProps } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import ProfileScreen from '../../screens/ProfileScreen';
import { getCurrentUserId } from '../../api/client';
import { memberSince, type ApiProfile } from '../../api/profiles';
import type { Listing } from '../../types';

export interface SellerProfileRouteProps
  extends Omit<ComponentProps<typeof ProfileScreen>, 'isSelf' | 'user' | 'stats' | 'listings' | 'onChat' | 'onReport'> {
  listings: Listing[];
  loadProfile: (userId: string) => Promise<ApiProfile | null>;
  onChat: (sellerName: string) => void;
  onReport: (sellerName: string) => void;
}

export default function SellerProfileRoute({
  listings, loadProfile, onChat, onReport, ...props
}: SellerProfileRouteProps) {
  const { userId = '' } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<ApiProfile | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setProfile(undefined);
    loadProfile(userId)
      .then((p) => { if (active) setProfile(p); })
      .catch(() => { if (active) setProfile(null); });
    return () => { active = false; };
  }, [userId]);

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
        ['SELLER RATING', '—'],
        ['ACTIVE LISTINGS', sellerListings.filter((l) => l.status === 'Available').length],
        ['REVIEWS', '—'],
        ['MEMBER SINCE', since],
      ]}
      listings={sellerListings}
      onChat={() => onChat(profile.displayName)}
      onReport={() => onReport(profile.displayName)}
    />
  );
}
