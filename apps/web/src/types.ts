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

export type CaseSeverity = 'High' | 'Medium' | 'Low';

export interface EvidenceItem {
  k: string;
  v: string;
}

export interface ModerationCase {
  id: string;
  type: ReportType;
  sev: CaseSeverity;
  state: ReportCaseState;
  title: string;
  target: string;
  targetFac: string;
  reason: string;
  reporter: string;
  when: string;
  count: number;
  note: string;
  evidence: EvidenceItem[];
  activeListings: number;
  accountAge: string;
  prior: string;
  resolution?: string;
}

export type AuditKind = 'Moderation' | 'Categories' | 'System';

export interface AuditEntry {
  id?: string;
  t: string;
  actor: string;
  code: string;
  target: string;
  detail: string;
  kind: AuditKind;
  fresh?: boolean;
}

export interface SuspendPayload {
  duration: '7 days' | '30 days' | 'Permanent ban';
  reason: string;
}

export interface AutoMatchAlert {
  id: number;
  text: string;
  cat?: string;
  max?: number;
  on: boolean;
  liveMatches?: number;
}

export interface AutoMatchHit {
  listing: Listing;
  keyword: string;
}

export interface AccountUser {
  name: string;
  memberType: string;
  faculty: string;
  email: string;
  photo?: string;
}

export interface AccountProfile {
  bio: string;
  contact: string;
}

export interface Session {
  id?: string;
  device: string;
  meta: string;
}

export type ReportCaseState = 'Pending' | 'In review' | 'Closed' | 'Dismissed';

export interface MyReportSummary {
  id: string;
  title: string;
  state: ReportCaseState;
  reason: string;
  when: string;
  resolution?: string;
}

export interface BlockedUser {
  name: string;
  since: string;
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
  id: number;
  title: string;
  price: number;
  status: ListingStatus;
  photo?: string;
}

export interface ChatThread {
  id: number;
  name: string;
  faculty?: string;
  online?: boolean;
  presence?: string;
  unread: number;
  blocked: boolean;
  listing: ChatThreadListing;
  messages: ChatMessage[];
}

export type ReportType = 'Listing' | 'User' | 'Order';

export interface ReportTarget {
  type: ReportType;
  title?: string;
  target: string;
  orderRef?: string;
}

export interface ReportPhoto {
  src: string;
}

export interface ReportSubmission {
  type: ReportType;
  reason: string;
  text: string;
  photos: ReportPhoto[];
  attachLinked: boolean;
  target: ReportTarget;
}

export type NotificationKind = 'match' | 'price' | 'order' | 'chat' | 'account';

export interface NotificationAction {
  type: string;
  id?: number;
}

export interface NotificationItem {
  id: number;
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

export interface Suspension {
  until?: string;
  reason: string;
  caseId: string;
  since: string;
  duration?: string;
  permanent?: boolean;
}
