import { api } from './client';
import { fetchProfile, memberSince } from './profiles';
import type { Listing, ListingStatus } from '../types';

export interface ApiCategory {
  id: string;
  name: string;
}

interface ApiItem {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  description: string | null;
  price: string;
  status: 'Available' | 'Reserved' | 'Sold' | 'Suspended';
  imageUrls: string[];
  createdAt: string;
}

export interface NewListing {
  title: string;
  description: string;
  price: number;
  categoryId: string;
}

const CATALOG = '/api/v1/catalog';

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function toListingStatus(status: ApiItem['status']): ListingStatus {
  return status === 'Suspended' ? 'Empty' : status;
}

async function toListings(items: ApiItem[], categories: ApiCategory[]): Promise<Listing[]> {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const sellerIds = [...new Set(items.map((item) => item.sellerId))];
  const profiles = new Map(
    await Promise.all(sellerIds.map(async (id) => [id, await fetchProfile(id)] as const)),
  );

  return items.map((item) => {
    const profile = profiles.get(item.sellerId);
    return {
      id: item.id,
      sellerId: item.sellerId,
      title: item.title,
      price: Number(item.price),
      cat: categoryName.get(item.categoryId) ?? 'Other',
      seller: profile?.displayName ?? 'CU member',
      since: profile ? memberSince(profile) : '—',
      desc: item.description ?? '',
      status: toListingStatus(item.status),
      photo: item.imageUrls[0],
      photos: item.imageUrls,
      posted: timeAgo(item.createdAt),
      spot: '—',
      rating: '—',
      reviewCount: 0,
      sold: 0,
      watchers: 0,
      handovers: 0,
      replyTime: '—',
    };
  });
}

export function fetchCategories() {
  return api<ApiCategory[]>(`${CATALOG}/categories`);
}

export async function fetchListings(categories: ApiCategory[]) {
  const items = await api<ApiItem[]>(`${CATALOG}/items`);
  return toListings(items, categories);
}

export async function fetchListing(id: string, categories: ApiCategory[]) {
  const item = await api<ApiItem | null>(`${CATALOG}/items/${id}`);
  if (!item) return null;
  const [listing] = await toListings([item], categories);
  return listing;
}

export async function createListing(input: NewListing, categories: ApiCategory[]) {
  const item = await api<ApiItem>(`${CATALOG}/items`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const [listing] = await toListings([item], categories);
  return listing;
}

export async function updateListing(id: string, patch: Partial<NewListing>, categories: ApiCategory[]) {
  const item = await api<ApiItem>(`${CATALOG}/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  const [listing] = await toListings([item], categories);
  return listing;
}

export function deleteListing(id: string) {
  return api<ApiItem>(`${CATALOG}/items/${id}`, { method: 'DELETE' });
}
