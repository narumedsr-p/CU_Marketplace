import { useMemo, useState } from 'react';

export const DEFAULT_FILTERS = {
  cat: 'All', cond: 'Any', faculty: 'Any', maxPrice: 9000, sort: 'Newest',
};

/**
 * Pure client-side filtering over an array of listings. Swap the body for your
 * own query when the data comes from the server — the returned shape is what
 * BrowseScreen expects.
 */
export default function useCatalogFilters(listings, query = '') {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = listings.filter((it) => {
      if (it.status === 'Sold') return false;
      if (q && !(it.title + ' ' + it.cat + ' ' + it.faculty).toLowerCase().includes(q)) return false;
      if (filters.cat !== 'All' && it.cat !== filters.cat) return false;
      if (filters.cond !== 'Any' && it.cond !== filters.cond) return false;
      if (filters.faculty !== 'Any' && it.faculty !== filters.faculty) return false;
      if (it.price > filters.maxPrice) return false;
      return true;
    });
    if (filters.sort === 'Price') out = [...out].sort((a, b) => a.price - b.price);
    if (filters.sort === 'Most viewed') out = [...out].sort((a, b) => b.watchers - a.watchers);
    return out;
  }, [listings, query, filters]);

  const counts = useMemo(() => {
    const c = {};
    listings.forEach((l) => { c[l.cat] = (c[l.cat] || 0) + 1; });
    return c;
  }, [listings]);

  const reset = () => setFilters(DEFAULT_FILTERS);
  return { filters, setFilters, results, counts, reset };
}
