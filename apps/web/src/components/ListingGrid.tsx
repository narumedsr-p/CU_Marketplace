import ListingCard from './ListingCard';
import Skeleton from './Skeleton';
import type { ListingSummary } from '../types';

interface ListingGridProps<T extends ListingSummary> {
  listings?: T[];
  onOpen?: (listing: T) => void;
  loading?: boolean;
  skeletonCount?: number;
  density?: 'comfortable' | 'compact';
  showFaculty?: boolean;
}

// Responsive catalog grid. density: comfortable | compact
export default function ListingGrid<T extends ListingSummary>({
  listings = [], onOpen, loading, skeletonCount = 8,
  density = 'comfortable', showFaculty = true,
}: ListingGridProps<T>) {
  const min = density === 'compact' ? 158 : 196;
  return (
    <div style={{
      display: 'grid', gap: 14,
      gridTemplateColumns: `repeat(auto-fill,minmax(${min}px,1fr))`,
    }}>
      {loading
        ? Array.from({ length: skeletonCount }).map((_, i) => <Skeleton key={i} />)
        : listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              showFaculty={showFaculty}
              onClick={onOpen ? () => onOpen(l) : undefined}
            />
          ))}
    </div>
  );
}
