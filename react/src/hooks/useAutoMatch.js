import { useMemo } from 'react';

// FR 4.6 — case-insensitive keyword on title + category, optional category and max price.
export function matchesAlert(listing, alert) {
  if (!alert.on) return false;
  const hay = (listing.title + ' ' + listing.cat).toLowerCase();
  if (hay.indexOf(alert.text.toLowerCase()) < 0) return false;
  if (alert.cat && alert.cat !== 'Any' && alert.cat !== listing.cat) return false;
  if (alert.max && listing.price > alert.max) return false;
  return true;
}

/**
 * const { alerts, matches, evaluate } = useAutoMatch(listings, rawAlerts)
 *   alerts  -> rawAlerts + liveMatches count (for WishlistScreen)
 *   matches -> [{ listing, keyword }] currently Available
 *   evaluate(newListing) -> alerts that match; call on publish (UC-04). Server-side in production.
 */
export default function useAutoMatch(listings, rawAlerts) {
  return useMemo(() => {
    const live = listings.filter((l) => l.status === 'Available');
    const alerts = rawAlerts.map((a) => ({ ...a, liveMatches: live.filter((l) => matchesAlert(l, a)).length }));
    const matches = [];
    live.forEach((l) => {
      const a = rawAlerts.find((x) => matchesAlert(l, x));
      if (a) matches.push({ listing: l, keyword: a.text });
    });
    const evaluate = (listing) => rawAlerts.filter((a) => matchesAlert(listing, a));
    return { alerts, matches, evaluate };
  }, [listings, rawAlerts]);
}
