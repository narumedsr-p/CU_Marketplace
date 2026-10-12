import { api } from './client';
import { fetchListing, type ApiCategory } from './catalog';
import { fetchProfile } from './profiles';
import type { Listing, Order, Sale } from '../types';

export interface ApiOrder {
  id: string;
  buyerId: string;
  sellerId: string;
  itemId: string;
  itemTitle: string | null;
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
  const shortCode = order.id.slice(0, 8).toUpperCase();
  return {
    id: order.id,
    reference: `ORD-${shortCode}`,
    handoverCode: shortCode,
    listingId: order.itemId,
    sellerId: order.sellerId,
    title: order.itemTitle ?? listing?.title ?? 'Unavailable item',
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

async function withListings(orders: ApiOrder[], categories: ApiCategory[]) {
  const itemIds = [...new Set(orders.map((o) => o.itemId))];
  const listings = new Map(
    await Promise.all(itemIds.map(async (id) => [id, await fetchListing(id, categories).catch(() => null)] as const)),
  );
  return orders.map((o) => toOrder(o, listings.get(o.itemId) ?? null));
}

export async function fetchMyOrders(categories: ApiCategory[]) {
  const orders = await api<ApiOrder[]>(`${ORDERS}?role=buyer`);
  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return withListings(sorted, categories);
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
