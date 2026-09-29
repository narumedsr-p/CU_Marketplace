import { api } from './client';
import { fetchListing, type ApiCategory } from './catalog';
import type { Listing, Order } from '../types';

interface ApiOrder {
  id: string;
  buyerId: string;
  sellerId: string;
  itemId: string;
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

function toOrder(order: ApiOrder, listing: Listing | null): Order {
  const shortCode = order.id.slice(0, 8).toUpperCase();
  return {
    id: order.id,
    reference: `ORD-${shortCode}`,
    handoverCode: shortCode,
    listingId: order.itemId,
    title: listing?.title ?? 'Unavailable item',
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

export async function placeOrder(listing: Listing) {
  const order = await api<ApiOrder>(ORDERS, {
    method: 'POST',
    body: JSON.stringify({ itemId: listing.id }),
  });
  return toOrder(order, { ...listing, status: 'Reserved' });
}

export async function cancelOrder(order: Order) {
  const updated = await api<ApiOrder>(`${ORDERS}/${order.id}/cancel`, { method: 'PATCH' });
  return { ...order, status: toOrderStatus(updated.status) };
}
