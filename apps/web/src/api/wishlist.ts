import { api } from './client';

export interface ApiWishlist {
  id: string;
  userId: string;
  itemId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMatchRecord {
  id: string;
  ruleId: string;
  matchedItemId: string;
  matchScore: number | string;
  isNotified: boolean;
  matchedAt: string;
}

export interface ApiMatchRule {
  id: string;
  userId: string;
  categoryId: string;
  keyword: string;
  minScore: number | string;
  isActive: boolean;
  matches?: ApiMatchRecord[];
  createdAt: string;
  updatedAt: string;
}

const WISHLISTS = '/api/v1/wishlists';
const MATCHES = '/api/v1/matches';

export function fetchWishlists() {
  return api<ApiWishlist[]>(WISHLISTS);
}

export function addToWishlist(itemId: string) {
  return api<ApiWishlist>(WISHLISTS, {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
}

export function removeFromWishlist(wishlistId: string) {
  return api<ApiWishlist>(`${WISHLISTS}/${wishlistId}`, {
    method: 'DELETE',
  });
}

export function fetchMatchRules() {
  return api<ApiMatchRule[]>(`${MATCHES}/rules`);
}

export function createMatchRule(input: {
  keyword: string;
  categoryId?: string;
  minScore?: number;
  isActive?: boolean;
}) {
  return api<ApiMatchRule>(`${MATCHES}/rules`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateMatchRule(
  ruleId: string,
  patch: Partial<{
    keyword: string;
    categoryId?: string;
    minScore?: number;
    isActive?: boolean;
  }>,
) {
  return api<ApiMatchRule>(`${MATCHES}/rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function deleteMatchRule(ruleId: string) {
  return api<ApiMatchRule>(`${MATCHES}/rules/${ruleId}`, {
    method: 'DELETE',
  });
}

export function fetchMatchRecords(ruleId: string) {
  return api<ApiMatchRecord[]>(`${MATCHES}/rules/${ruleId}/records`);
}
