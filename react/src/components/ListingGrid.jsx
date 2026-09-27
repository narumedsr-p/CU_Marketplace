import ListingCard from './ListingCard';
import Skeleton from './Skeleton';

// Responsive catalog grid. density: comfortable | compact
export default function ListingGrid({
  listings = [], onOpen, loading, skeletonCount = 8,
  density = 'comfortable', showFaculty = true,
}) {
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
