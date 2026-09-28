import type { ComponentProps } from 'react';
import ProfileScreen from '../../screens/ProfileScreen';

export type ProfileRouteProps = Omit<ComponentProps<typeof ProfileScreen>, 'isSelf'>;

export default function ProfileRoute(props: ProfileRouteProps) {
  return <ProfileScreen {...props} isSelf />;
}
