export type ListingStatus = 'Available' | 'Reserved' | 'Sold' | 'Completed' | 'Cancelled' | 'Empty';

// Minimal shape the presentational card/grid components need — lets screens
// (e.g. the sell preview) pass a partial listing before it has an id or seller.
export interface ListingSummary {
  id?: number;
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
  id: number;
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
  reference: string;
  handoverCode: string;
  listingId: number;
  title: string;
  price: number;
  seller: string;
  faculty: string;
  spot: string;
  window: string;
  placedAt: string;
  status: 'Reserved' | 'Completed';
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

export interface AdminCategory {
  id?: string;
  name: string;
  slug: string;
  count: number;
}
