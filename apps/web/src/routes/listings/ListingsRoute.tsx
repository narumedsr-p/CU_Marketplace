import { useEffect, type ComponentProps } from 'react';
import { useSearchParams } from 'react-router-dom';
import BrowseScreen from '../../screens/BrowseScreen';

export type ListingsRouteProps = ComponentProps<typeof BrowseScreen>;

export default function ListingsRoute(props: ListingsRouteProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const category = categoryParam && props.categories.includes(categoryParam)
    ? categoryParam
    : 'All';

  useEffect(() => {
    if (props.filters.cat !== category) {
      props.onFilterChange({ ...props.filters, cat: category });
    }
  }, [category, props.filters, props.onFilterChange]);

  const handleFilterChange: ListingsRouteProps['onFilterChange'] = (nextFilters) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextFilters.cat === 'All') {
      nextParams.delete('category');
    } else {
      nextParams.set('category', nextFilters.cat);
    }
    setSearchParams(nextParams, { replace: true });
    props.onFilterChange(nextFilters);
  };

  const handleReset = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('category');
    setSearchParams(nextParams, { replace: true });
    props.onReset();
  };

  return (
    <BrowseScreen
      {...props}
      onFilterChange={handleFilterChange}
      onReset={handleReset}
    />
  );
}
