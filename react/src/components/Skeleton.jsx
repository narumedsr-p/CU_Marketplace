import { color } from '../theme/tokens';

// Card-shaped loading placeholder — one per grid cell while fetching.
export default function Skeleton({ height = 300, radius = 12 }) {
  return (
    <div style={{
      height, borderRadius: radius, border: '1px solid ' + color.line,
      background: 'linear-gradient(90deg,' + color.pinkTint + ' 25%,#FFEAF3 37%,' + color.pinkTint + ' 63%)',
      backgroundSize: '400% 100%', animation: 'rsaShimmer 1.4s ease infinite',
    }} />
  );
}
