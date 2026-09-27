import type { ComponentProps } from 'react';
import BrowseScreen from '../../screens/BrowseScreen';

export type ListingsRouteProps = ComponentProps<typeof BrowseScreen>;

export default function ListingsRoute(props: ListingsRouteProps) {
  return <BrowseScreen {...props} />;
}
