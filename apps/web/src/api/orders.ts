import { api } from './client';
import { fetchListing, type ApiCategory } from './catalog';
import { fetchProfile } from './profiles';
import { fetchReviewedOrderIds } from './reviews';
import type { Listing, Order, Sale } from '../types';

export interface ApiOrder {
  id: string;
  buyerId: string;
  sellerId: string;
  itemId: string;
  itemTitle: string | null;
  itemImageUrl: string | null;
  agreedPrice: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  createdAt: string;
  completedAt: string | null;
}

const ORDERS = '/api/v1/orders/orders';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function toOrderStatus(status: ApiOrder['status']): Order['status'] {
  return status === 'Pending' ? 'Reserved' : status;
}

export function toOrder(order: ApiOrder, listing: Listing | null): Order {
  // Seed orders all share the same id prefix ('20000000-...', so the dev dataset can be
  // bulk-deleted on reseed) — slicing the front would give every one of them the same
  // reference. The counter that actually varies lives in the tail of the id.
  const shortCode = order.id.slice(-8).toUpperCase();
  return {
    id: order.id,
    reference: `ORD-${shortCode}`,
    handoverCode: shortCode,
    listingId: order.itemId,
    sellerId: order.sellerId,
    title: order.itemTitle ?? listing?.title ?? 'Unavailable item',
    photo: order.itemImageUrl ?? listing?.photo,
    price: Number(order.agreedPrice),
    seller: listing?.seller ?? 'CU member',
    faculty: listing?.faculty ?? '',
    spot: listing?.spot ?? '—',
    window: '—',
    placedAt: formatDateTime(order.createdAt),
    status: toOrderStatus(order.status),
    rated: false,
    completedAt: order.completedAt ? formatDateTime(order.completedAt) : undefined,
  };
}

// Catalog deliberately 404s item detail for anything not Available (so a buyer can't
// browse a stranger's in-progress reservation). While an order is Pending the item is
// Reserved, and once Completed it's Sold — neither ever passes, so fetching for those
// is a guaranteed-failed request on every load. Cancelled is the only status where the
// item might have gone back to Available, so it's the only one worth trying.
async function withListings(orders: ApiOrder[], categories: ApiCategory[]) {
  // `orders` arrives sorted newest-first, so the first order seen per itemId is the
  // most recent one — the one whose status actually reflects the item right now.
  const latestStatusByItem = new Map<string, ApiOrder['status']>();
  for (const o of orders) if (!latestStatusByItem.has(o.itemId)) latestStatusByItem.set(o.itemId, o.status);
  const worthFetching = [...latestStatusByItem].filter(([, status]) => status === 'Cancelled').map(([id]) => id);
  const listings = new Map(
    await Promise.all(worthFetching.map(async (id) => [id, await fetchListing(id, categories).catch(() => null)] as const)),
  );
  return orders.map((o) => toOrder(o, listings.get(o.itemId) ?? null));
}

export async function fetchMyOrders(categories: ApiCategory[]) {
  const orders = await api<ApiOrder[]>(`${ORDERS}?role=buyer`);
  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const completedSellerIds = [...new Set(sorted.filter((o) => o.status === 'Completed').map((o) => o.sellerId))];
  const [withItems, reviewedOrderIds] = await Promise.all([
    withListings(sorted, categories),
    fetchReviewedOrderIds(completedSellerIds),
  ]);
  return withItems.map((o) => (reviewedOrderIds.has(o.id) ? { ...o, rated: true } : o));
}

export function fetchOrderDetail(orderId: string) {
  return api<ApiOrder>(`${ORDERS}/${encodeURIComponent(orderId)}`);
}

export async function getPurchasesItem(categories: ApiCategory[]): Promise<Sale[]> {
  const orders = await api<ApiOrder[]>(`${ORDERS}?role=seller`);
  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const buyerIds = [...new Set(sorted.map((o) => o.buyerId))];
  const [withItems, buyers] = await Promise.all([
    withListings(sorted, categories),
    Promise.all(buyerIds.map(async (id) => [id, await fetchProfile(id)] as const)).then((e) => new Map(e)),
  ]);
  return withItems.map((order, i) => ({
    id: order.id,
    listingId: order.listingId,
    title: order.title,
    photo: order.photo,
    price: order.price,
    buyer: buyers.get(sorted[i].buyerId)?.displayName ?? 'CU member',
    when: order.placedAt,
    status: order.status,
    spot: order.spot,
    action: order.status === 'Completed' ? 'Sold' : order.status === 'Reserved' ? 'Awaiting handover' : 'Buyer cancelled',
  }));
}

export async function placeOrder(listing: Listing) {
  const order = await api<ApiOrder>(ORDERS, {
    method: 'POST',
    body: JSON.stringify({ itemId: listing.id }),
  });
  return toOrder(order, { ...listing, status: 'Reserved' });
}

export function getHandoverQr(orderId: string) {
  return api<{ orderId: string; qrImageDataUrl: string; token: string }>(
    `${ORDERS}/${orderId}/qr-code`,
    { method: 'POST' },
  );
}

export async function completeHandover(orderId: string, token: string) {
  const updated = await api<ApiOrder>(`${ORDERS}/${orderId}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({ token }),
  });
  return {
    status: toOrderStatus(updated.status),
    completedAt: updated.completedAt ? formatDateTime(updated.completedAt) : undefined,
  };
}

export async function cancelOrderById(orderId: string) {
  const updated = await api<ApiOrder>(`${ORDERS}/${orderId}/cancel`, { method: 'PATCH' });
  return toOrderStatus(updated.status);
}

export async function fetchOrderStatus(orderId: string) {
  const order = await api<ApiOrder>(`${ORDERS}/${orderId}`);
  return toOrderStatus(order.status);
}

export function normalizeHandoverCode(input: string): string | null {
  const code = input.replace(/[\s-]/g, '').toLowerCase();
  return /^[0-9a-f]{32}$/.test(code) ? code : null;
}

export function formatHandoverCode(token: string) {
  return token.toUpperCase().match(/.{1,4}/g)?.join(' ') ?? token;
}

export async function cancelOrder(order: Order) {
  const updated = await api<ApiOrder>(`${ORDERS}/${order.id}/cancel`, { method: 'PATCH' });
  return { ...order, status: toOrderStatus(updated.status) };
}
