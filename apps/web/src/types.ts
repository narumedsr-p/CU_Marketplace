import type { NotificationAction as NotificationTarget } from '@workspace/contracts';

export type ListingStatus = 'Available' | 'Reserved' | 'Sold' | 'Completed' | 'Cancelled' | 'Empty';

// Minimal shape the presentational card/grid components need — lets screens
// (e.g. the sell preview) pass a partial listing before it has an id or seller.
export interface ListingSummary {
  id?: string;
  title: string;
  price: number | string;
  cat: string;
  cond?: string;
  faculty?: string;
  rating: number | string;
  sold: number;
  status: ListingStatus;
  photo?: string;
}

export interface Listing extends ListingSummary {
  id: string;
  sellerId?: string;
  price: number;
  was?: number;
  seller: string;
  reviewCount: number;
  watchers: number;
  posted: string;
  spot: string;
  handovers: number;
  replyTime: string;
  since: string;
  desc: string;
  photos?: string[];
}

export interface CurrentUser {
  id: string;
  name: string;
  memberType: string;
  faculty: string;
  joined: string;
}

export interface Purchase {
  id: string;
  title: string;
  price: number;
  seller: string;
  when: string;
  status: ListingStatus;
  action: string;
  spot: string;
}

export interface Sale {
  id: string;
  listingId: string;
  title: string;
  price: number;
  buyer: string;
  when: string;
  status: ListingStatus;
  action: string;
  spot: string;
}

export interface Review {
  id: string;
  name: string;
  item: string;
  when: string;
  stars: number;
  text: string;
}

export interface NotificationPrefDef {
  key: string;
  name: string;
  desc: string;
}

export type NotificationPrefsState = Record<string, boolean>;

export interface Order {
  id: string;
  reference: string;
  handoverCode: string;
  listingId: string;
  sellerId: string;
  title: string;
  price: number;
  seller: string;
  faculty: string;
  spot: string;
  window: string;
  placedAt: string;
  status: 'Reserved' | 'Completed' | 'Cancelled';
  rated: boolean;
  completedAt?: string;
}

export interface TimelineStep {
  name: string;
  when: string;
  done: boolean;
}

export interface SellerInfo {
  name: string;
  rating: number | string;
  reviewCount: number;
  faculty: string;
  handovers: number;
  replyTime: string;
  since: string;
}

export interface CatalogFilters {
  cat: string;
  cond: string;
  faculty: string;
  maxPrice: number;
  sort: 'Newest' | 'Price' | 'Most viewed';
}

export interface SellForm {
  title: string;
  price: string;
  cat: string;
  cond: string;
  desc: string;
  spot: string;
}

export interface AutoMatchAlert {
  id: string | number;
  text: string;
  categoryId?: string;
  cat?: string;
  on: boolean;
  liveMatches?: number;
}

export interface AutoMatchHit {
  id: string;
  ruleId: string;
  listing: Listing;
  keyword: string;
  score: number;
  matchedAt: string;
}

export interface AccountUser {
  name: string;
  memberType: string;
  faculty: string;
  email: string;
  photo?: string;
}

export interface AccountProfile {
  contact: string;
}

export interface Session {
  id?: string;
  device: string;
  meta: string;
}

export interface ChatMessage {
  id?: string;
  from: 'me' | 'them' | 'system';
  text?: string;
  image?: boolean | string;
  time?: string;
  status?: string;
}

export interface ChatThreadListing {
  id: string;
  title: string;
  price: number;
  status: ListingStatus;
  photo?: string;
}

export interface ChatThread {
  // number for the offline demo threads, chat-service room id (uuid) for real rooms
  id: number | string;
  name: string;
  faculty?: string;
  online?: boolean;
  presence?: string;
  unread: number;
  listing: ChatThreadListing;
  messages: ChatMessage[];
}

export type NotificationKind = 'match' | 'price' | 'order' | 'chat' | 'review' | 'account';

export type NotificationAction = NotificationTarget;

export interface NotificationItem {
  id: string | number;
  kind: NotificationKind;
  category: string;
  title: string;
  body: string;
  time: string;
  group?: 'today' | 'earlier';
  read: boolean;
  channel?: string;
  cta?: string;
  action?: NotificationAction;
}

export interface SellerReservation {
  buyer: string;
  reference: string;
  window: string;
  spot: string;
}

export interface HandoverOrder {
  reference: string;
  handoverCode: string;
  title: string;
  price: number;
  seller: string;
  buyer: string;
  spot: string;
  window: string;
  photo?: string;
}

export type HandoverRole = 'buyer' | 'seller';
export type HandoverStage = 'ready' | 'verifying' | 'done';

export interface ReviewOrderSummary {
  orderId: string;
  sellerId: string;
  title: string;
  price: number;
  seller: string;
  when: string;
  status: ListingStatus;
  photo?: string;
}

export interface SellerStats {
  avg: number;
  count: number;
}
