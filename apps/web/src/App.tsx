import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import GlobalStyles from './theme/GlobalStyles';
import AppShell from './layout/AppShell';
import TopNav from './layout/TopNav';
import Toast from './components/Toast';
import RateSellerDialog from './components/RateSellerDialog';
import useToast from './hooks/useToast';
import useCatalogFilters from './hooks/useCatalogFilters';
import useLiveChat from './hooks/useLiveChat';
import { consumeAuthRedirect, signIn, signOut } from './api/auth';
import { ApiError, getCurrentClaims, getCurrentUserId, getToken, onUnauthorized } from './api/client';
import {
  createListing, deleteListing, fetchCategories, fetchListing, fetchListings, updateListing,
  type ApiCategory,
} from './api/catalog';
import { deleteMyAccount, fetchMyProfile, fetchProfile, toUser, updateMyProfile, type ApiProfile } from './api/profiles';
import {
  cancelOrder as apiCancelOrder, cancelOrderById, completeHandover, fetchMyOrders, fetchOrderStatus,
  formatHandoverCode, getHandoverQr, getPurchasesItem, normalizeHandoverCode, placeOrder as apiPlaceOrder,
} from './api/orders';
import {
  fetchWishlists, addToWishlist, removeFromWishlist,
  fetchMatchRules, fetchMatchRecords, createMatchRule, updateMatchRule, deleteMatchRule,
  type ApiWishlist, type ApiMatchRule,
} from './api/wishlist';
import {
  fetchNotificationPreferences, fetchNotifications,
  markAllNotificationsRead as apiMarkAllNotificationsRead, markNotificationRead, updateNotificationPreferences,
} from './api/notifications';
import { createReview, fetchSellerRating, fetchSellerReviews } from './api/reviews';
import { uploadPhoto, uploadPhotos, UploadError } from './api/uploads';


import LoginScreen from './screens/LoginScreen';
import CatalogScreen from './screens/CatalogScreen';
import ListingScreen from './screens/ListingScreen';
import SellScreen from './screens/SellScreen';
import OrderScreen from './screens/OrderScreen';
import ProfileScreen from './screens/ProfileScreen';
import AccountScreen from './screens/AccountScreen';
import ChatScreen from './screens/ChatScreen';
import HandoverScreen from './screens/HandoverScreen';
import MyListingsScreen from './screens/MyListingsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ReviewScreen from './screens/ReviewScreen';
import WishlistScreen from './screens/WishlistScreen';
import ListingsRoute from './routes/listings/ListingsRoute';
import OrdersRoute from './routes/orders/OrdersRoute';
import OrderDetailRoute from './routes/orders/OrderDetailRoute';
import SellerProfileRoute from './routes/profile/SellerProfileRoute';

import {
  CONDITIONS, FACULTIES, SPOTS,
  SESSIONS,
  THREADS,
} from './data/mockListings';
import type {
  AccountProfile, AutoMatchAlert, ChatThread, ChatThreadListing, CurrentUser,
  HandoverOrder, HandoverStage, Listing, NotificationItem,
  NotificationPrefDef, NotificationPrefsState, Order, Purchase, Review, Sale, SellerStats, SellForm, SellerReservation, AutoMatchHit,
} from './types';

const EMPTY_FORM: SellForm = {
  title: '', price: '', cat: '', cond: 'Like new', desc: '', spot: '',
};

const ANY_CATEGORY_ID = '00000000-0000-0000-0000-000000000000';

const NOTIFICATION_PREFS: NotificationPrefDef[] = [
  { key: 'inAppEnabled', name: 'In-app alerts', desc: 'Show notifications while you are using RachaSA.' },
  { key: 'emailEnabled', name: 'Email alerts', desc: 'Send notification updates to your Chula email.' },
];

interface ListingRouteProps {
  listings: Listing[];
  orders: Order[];
  loaded: boolean;
  loadListing: (id: string) => Promise<Listing | null>;
  onDeleteListing: (id: string) => Promise<boolean>;
  onCancelReservation: (id: string) => Promise<boolean>;
  onShowSellerQr: (id: string) => Promise<void>;
  wishIds: string[];
  wishlistMap: Record<string, string>;
  onToggleWishlist: (listing: Listing) => void;
  setSelectedId: (id: string) => void;
  placeOrder: (listing: Listing) => void;
  openChat: (listing: Listing) => void;
}

// Reads :id from the URL and keeps `selectedId` in sync so a direct link / refresh / back
// button resolves to the right listing.
function ListingRoute({
  listings, orders, loaded, loadListing, onDeleteListing, onCancelReservation, onShowSellerQr,
  wishIds, wishlistMap, onToggleWishlist, setSelectedId, placeOrder, openChat,
}: ListingRouteProps) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useState(() => setSelectedId(id));
  const inList = listings.find((l) => l.id === id);
  const [fetched, setFetched] = useState<Listing | null | undefined>(undefined);
  const [sellerPhoto, setSellerPhoto] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (inList || !loaded) return;
    setFetched(undefined);
    loadListing(id).then(setFetched).catch(() => setFetched(null));
  }, [id, inList, loaded]);

  const listing = inList ?? fetched;

  useEffect(() => {
    setSellerPhoto(undefined);
    if (!listing?.sellerId) return;
    fetchProfile(listing.sellerId).then((p) => setSellerPhoto(p?.avatarUrl));
  }, [listing?.sellerId]);

  if (!listing) {
    return loaded && fetched === null ? <Navigate to="/" replace /> : null;
  }
  const myReservation = orders.find((order) => order.listingId === listing.id && order.status === 'Reserved');
  return (
    <ListingScreen
      key={`${listing.id}:${listing.status}`}
      listing={listing}
      sellerPhoto={sellerPhoto}
      isOwner={!!listing.sellerId && listing.sellerId === getCurrentUserId()}
      isMyReservation={listing.status === 'Reserved' && !!myReservation}
      onViewMyOrder={() => { if (myReservation) navigate(`/orders/${myReservation.id}`); }}
      onManage={() => navigate('/mylistings')}
      onShowHandoverQr={() => onShowSellerQr(listing.id)}
      onDelete={async () => {
        const deleted = await onDeleteListing(listing.id);
        if (deleted) navigate('/mylistings');
        return deleted;
      }}
      onCancelReservation={() => onCancelReservation(listing.id)}
      wished={wishIds.includes(listing.id)}
      onPlaceOrder={() => placeOrder(listing)}
      onChat={() => openChat(listing)}
      onToggleWishlist={() => onToggleWishlist(listing)}
      onViewSeller={() => { if (listing.sellerId) navigate('/profile/' + listing.sellerId); }}
    />
  );
}

const authRedirect = consumeAuthRedirect();

/**
 * Reference wiring only. Every screen is presentational — replace these useState blocks with
 * your data layer (TanStack Query, WebSocket client, etc.) and keep the props.
 */
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // React Router doesn't reset scroll on navigation like a real page load would — without
  // this, clicking into a new screen keeps whatever scroll position the previous one was
  // left at. Keyed on pathname only, not the full location, so query-string-only changes
  // within the same screen (e.g. /wishlist?tab=alerts) don't yank the scroll position.
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const [loggedIn, setLoggedIn] = useState(() => getToken() !== null);
  const [signingIn, setSigningIn] = useState(false);

  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [wishIds, setWishIds] = useState<string[]>([]);
  // Map itemId -> wishlistId (the backend row id) for efficient removal
  const [wishlistMap, setWishlistMap] = useState<Record<string, string>>({});
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [me, setMe] = useState<ApiProfile | null>(null);
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefsState>({ inAppEnabled: true, emailEnabled: true });
  const [form, setForm] = useState<SellForm>(EMPTY_FORM);
  const [sellPhotos, setSellPhotos] = useState<string[]>([]);
  const [sellPhotosUploading, setSellPhotosUploading] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const [handover, setHandover] = useState<{
    role: 'buyer' | 'seller'; saleId: string | null; code: string | null; codeLoading: boolean;
    qrImageDataUrl: string | null;
    stage: Record<'buyer' | 'seller', HandoverStage>; error: string | null;
  }>({
    role: 'buyer', saleId: null, code: null, codeLoading: false, qrImageDataUrl: null,
    stage: { buyer: 'ready', seller: 'ready' }, error: null,
  });

  const [threads, setThreads] = useState<ChatThread[]>(THREADS);
  const [activeThread, setActiveThread] = useState<number | string | null>(1);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [alerts, setAlerts] = useState<AutoMatchAlert[]>([]);
  const [matchHits, setMatchHits] = useState<AutoMatchHit[]>([]);
  const [matchLoading, setMatchLoading] = useState(true);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AccountProfile>({ contact: '' });
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState<SellerStats>({ avg: 0, count: 0 });
  const [reviewStats, setReviewStats] = useState<SellerStats>({ avg: 0, count: 0 });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewSellerPhoto, setReviewSellerPhoto] = useState<string | undefined>(undefined);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const deleteAccountPending = useRef(false);

  const { toast, flash } = useToast();
  // Signed in: real rooms from chat-service, live over Socket.IO. Signed out: the demo threads above.
  const liveChat = useLiveChat(loggedIn, categories);
  const chatThreads = loggedIn ? liveChat.threads.map((thread) => {
    const itemId = thread.listing.id;
    const currentListing = listings.find((item) => item.id === itemId);
    const activeTransaction = orders.find((order) => order.listingId === itemId && order.status === 'Reserved')
      ?? sales.find((sale) => sale.listingId === itemId && sale.status === 'Reserved');
    const history = orders.find((order) => order.listingId === itemId)
      ?? sales.find((sale) => sale.listingId === itemId);
    const source = activeTransaction ?? currentListing ?? history;
    if (!source) return thread;
    return {
      ...thread,
      listing: {
        ...thread.listing,
        orderId: currentListing ? undefined : (activeTransaction ?? history)?.id,
        title: source.title,
        price: source.price,
        status: source.status === 'Completed' ? 'Sold' as const : source.status,
      },
    };
  }) : threads;
  const requestedRoomId = location.pathname === '/chat' ? new URLSearchParams(location.search).get('roomId') : null;
  useEffect(() => {
    if (loggedIn && requestedRoomId && liveChat.activeId !== requestedRoomId && liveChat.threads.some((t) => t.id === requestedRoomId)) {
      liveChat.select(requestedRoomId);
    }
  }, [loggedIn, requestedRoomId, liveChat.activeId, liveChat.threads, liveChat.select]);
  const { filters, setFilters, results, counts, reset } = useCatalogFilters(listings, query);

  const categoryNameFor = (categoryId: string, availableCategories: ApiCategory[]) => (
    categoryId === ANY_CATEGORY_ID
      ? 'Any'
      : availableCategories.find((category) => category.id === categoryId)?.name ?? 'Any'
  );

  const loadWishlistData = async () => {
    setWishlistLoading(true);
    setWishlistError(null);
    try {
      const wishlists = await fetchWishlists();
      const map: Record<string, string> = {};
      wishlists.forEach((wishlist: ApiWishlist) => { map[wishlist.itemId] = wishlist.id; });
      setWishlistMap(map);
      setWishIds(wishlists.map((wishlist: ApiWishlist) => wishlist.itemId));
    } catch (err) {
      setWishlistError('Could not load your saved listings: ' + (err instanceof Error ? err.message : 'unknown error'));
      throw err;
    } finally {
      setWishlistLoading(false);
    }
  };

  const loadMatchData = async (availableCategories: ApiCategory[]) => {
    const ownerId = getCurrentUserId();
    if (!ownerId) return;
    setMatchLoading(true);
    setMatchError(null);
    try {
      const rules = await fetchMatchRules();
      const activeRules = rules.filter((rule) => rule.isActive);
      const recordsByRule = await Promise.all(activeRules.map(async (rule) => [
        rule,
        await fetchMatchRecords(rule.id),
      ] as const));
      const recordCountByRule = new Map(recordsByRule.map(([rule, matches]) => [rule.id, matches.length]));
      const records = recordsByRule.flatMap(([rule, matches]) => matches.map((match) => ({ rule, match })));
      const listingIds = [...new Set(records.map(({ match }) => match.matchedItemId))];
      const resolvedListings = await Promise.all(listingIds.map(async (itemId) => [
        itemId,
        await fetchListing(itemId, availableCategories).catch(() => null),
      ] as const));
      const listingsById = new Map(resolvedListings);

      if (getCurrentUserId() !== ownerId) return;

      setAlerts(rules.map((rule: ApiMatchRule) => ({
        id: rule.id,
        text: rule.keyword,
        categoryId: rule.categoryId,
        cat: categoryNameFor(rule.categoryId, availableCategories),
        on: rule.isActive,
        liveMatches: recordCountByRule.get(rule.id) ?? rule.matches?.length ?? 0,
      })));
      setMatchHits(records
        .map(({ rule, match }) => {
          const listing = listingsById.get(match.matchedItemId);
          return listing ? {
            id: match.id,
            ruleId: rule.id,
            listing,
            keyword: rule.keyword,
            score: Number(match.matchScore),
            matchedAt: match.matchedAt,
          } : null;
        })
        .filter((match): match is AutoMatchHit => match !== null)
        .sort((a, b) => b.matchedAt.localeCompare(a.matchedAt)));
    } catch (err) {
      if (getCurrentUserId() !== ownerId) return;
      setMatchError('Could not load your auto-match alerts: ' + (err instanceof Error ? err.message : 'unknown error'));
      throw err;
    } finally {
      if (getCurrentUserId() === ownerId) setMatchLoading(false);
    }
  };

  const loadNotificationsData = async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      setNotifications(await fetchNotifications());
    } catch (err) {
      setNotificationsError('Could not load notifications: ' + (err instanceof Error ? err.message : 'unknown error'));
      throw err;
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadNotificationPreferences = async () => {
    setPreferencesLoading(true);
    setPreferencesError(null);
    try {
      setPrefs(await fetchNotificationPreferences());
    } catch (err) {
      setPreferencesError('Could not load notification preferences: ' + (err instanceof Error ? err.message : 'unknown error'));
      throw err;
    } finally {
      setPreferencesLoading(false);
    }
  };

  const loadMyReviewData = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    const [reviews, rating] = await Promise.all([fetchSellerReviews(userId), fetchSellerRating(userId)]);
    setMyReviews(reviews);
    setMyRating(rating);
  };

  useEffect(() => {
    if (!loggedIn) {
      setAlerts([]);
      setMatchHits([]);
      setMatchError(null);
      setMatchLoading(true);
    }
  }, [loggedIn]);

  useEffect(() => {
    onUnauthorized(() => {
      setLoggedIn(false);
      navigate('/login');
      flash('Your session expired. Please sign in again.');
    });
    return () => onUnauthorized(null);
  }, [navigate, flash]);

  useEffect(() => {
    if (authRedirect.error) flash(authRedirect.error);
  }, [flash]);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const myProfile = await fetchMyProfile();
        if (cancelled) return;
        setMe(myProfile);
        if (myProfile) setProfile((p) => ({ ...p, contact: myProfile.contactInfo }));
      } catch {
        if (!cancelled) setMe(null);
      }
      let cats: ApiCategory[] = [];
      try {
        cats = await fetchCategories();
        const items = await fetchListings(cats);
        if (cancelled) return;
        setCategories(cats);
        setListings(items);
      } catch (err) {
        if (!cancelled) flash('Could not load listings: ' + (err instanceof Error ? err.message : 'unknown error'));
      } finally {
        if (!cancelled) setListingsLoaded(true);
      }
      try {
        const mine = await fetchMyOrders(cats);
        if (cancelled) return;
        setOrders(mine);
        setOrder((current) => current ?? mine.find((o) => o.status === 'Reserved') ?? null);
      } catch (err) {
        if (!cancelled) flash('Could not load orders: ' + (err instanceof Error ? err.message : 'unknown error'));
      }
      try {
        const sold = await getPurchasesItem(cats);
        if (!cancelled) setSales(sold);
      } catch (err) {
        if (!cancelled) flash('Could not load sales: ' + (err instanceof Error ? err.message : 'unknown error'));
      }
      try { await loadWishlistData(); } catch { /* Error stays visible on the Wishlist screen. */ }
      try { await loadMatchData(cats); } catch { /* Error stays visible on the Wishlist screen. */ }
      try { await loadNotificationsData(); } catch { /* Error stays visible on the Notifications screen. */ }
      try { await loadNotificationPreferences(); } catch { /* Error stays visible on the Notifications screen. */ }
      try { await loadMyReviewData(); } catch { /* A profile can render without review history. */ }
    })();
    return () => { cancelled = true; };
  }, [loggedIn, flash]);

  useEffect(() => {
    setReviewSellerPhoto(undefined);
    if (!order?.sellerId) return;
    fetchProfile(order.sellerId).then((p) => setReviewSellerPhoto(p?.avatarUrl));
  }, [order?.sellerId]);

  const categoryNames = categories.map((c) => c.name);
  const categoryIdOf = (name: string) => categories.find((c) => c.name === name)?.id;

  const createAutoMatchFromSearch = async (keyword: string, category: string) => {
    const text = keyword.trim();
    if (!text) {
      navigate('/wishlist?tab=alerts');
      return;
    }
    const categoryId = category === 'All' ? undefined : categoryIdOf(category);
    if (category !== 'All' && !categoryId) {
      const error = new Error('Choose a valid category before creating an auto-match.');
      flash(error.message);
      throw error;
    }
    try {
      await createMatchRule({ keyword: text, categoryId, isActive: true });
      await loadMatchData(categories);
      navigate('/wishlist?tab=alerts');
      flash(`Auto-match created for “${text}”.`);
    } catch (err) {
      flash('Could not create auto-match: ' + (err instanceof Error ? err.message : 'unknown error'));
      throw err;
    }
  };

  const handleSignIn = () => {
    setSigningIn(true);
    signIn();
  };

  const logout = (message?: string) => {
    signOut();
    setLoggedIn(false);
    navigate('/login');
    if (message) flash(message);
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountPending.current) return;
    deleteAccountPending.current = true;
    setDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      await deleteMyAccount();
      logout('Account deleted.');
    } catch (err) {
      setDeleteAccountError('Could not delete account: ' + (err instanceof Error ? err.message : 'unknown error'));
    } finally {
      deleteAccountPending.current = false;
      setDeletingAccount(false);
    }
  };

  const openListing = (l: Listing | string) => {
    const id = typeof l === 'object' ? l.id : l;
    setSelectedId(id);
    navigate('/listing/' + id);
  };

  const markAllNotificationsRead = async () => {
    if (markingAllRead || !notifications.some((notification) => !notification.read)) return;
    setMarkingAllRead(true);
    try {
      await apiMarkAllNotificationsRead();
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      flash('All notifications marked as read.');
    } catch (err) {
      flash('Could not mark notifications as read: ' + (err instanceof Error ? err.message : 'unknown error'));
      throw err;
    } finally {
      setMarkingAllRead(false);
    }
  };

  const toggleNotificationPreference = async (key: string) => {
    if (savingPreferences || !(key in prefs)) return;
    setSavingPreferences(true);
    try {
      const updated = await updateNotificationPreferences({ [key]: !prefs[key] });
      setPrefs(updated);
      flash('Notification preference saved.');
    } catch (err) {
      flash('Could not save notification preference: ' + (err instanceof Error ? err.message : 'unknown error'));
      throw err;
    } finally {
      setSavingPreferences(false);
    }
  };

  const selectReviewOrder = (nextOrder: Order) => {
    if (nextOrder.status !== 'Completed' || nextOrder.rated) {
      flash('Only completed orders that have not been reviewed can be rated.');
      return false;
    }
    setOrder(nextOrder);
    setReviewSubmitted(false);
    setReviewError(null);
    fetchSellerRating(nextOrder.sellerId)
      .then(setReviewStats)
      .catch(() => setReviewStats({ avg: 0, count: 0 }));
    return true;
  };

  const submitReview = async ({ stars, tags = [], text }: { stars: number; tags?: string[]; text: string }) => {
    if (!order || order.status !== 'Completed' || order.rated) {
      const error = new Error('This order is not available for review.');
      setReviewError(error.message);
      throw error;
    }
    setReviewSubmitting(true);
    setReviewError(null);
    const comment = [tags.length ? tags.join(' · ') : '', text.trim()].filter(Boolean).join('\n\n') || undefined;
    try {
      await createReview({ orderId: order.id, rating: stars, comment });
      const [updatedStats, updatedReviews] = await Promise.all([
        fetchSellerRating(order.sellerId),
        fetchSellerReviews(order.sellerId),
      ]);
      setOrders((items) => items.map((item) => (item.id === order.id ? { ...item, rated: true } : item)));
      setOrder((current) => current && current.id === order.id ? { ...current, rated: true } : current);
      setReviewStats(updatedStats);
      setListings((items) => items.map((item) => (
        item.sellerId === order.sellerId
          ? { ...item, rating: updatedStats.avg, reviewCount: updatedStats.count }
          : item
      )));
      if (order.sellerId === getCurrentUserId()) {
        setMyReviews(updatedReviews);
        setMyRating(updatedStats);
      }
      setReviewSubmitted(true);
      setRateOpen(false);
      flash('Review posted. Seller average updated.');
    } catch (err) {
      const message = 'Could not post review: ' + (err instanceof Error ? err.message : 'unknown error');
      setReviewError(message);
      flash(message);
      throw err;
    } finally {
      setReviewSubmitting(false);
    }
  };

  const placeOrder = async (listing: Listing) => {
    if (listing.sellerId && listing.sellerId === getCurrentUserId()) { flash('This is your own listing.'); return; }
    if (listing.status !== 'Available') { flash('This item was just reserved by another buyer.'); return; }
    try {
      const placed = await apiPlaceOrder(listing);
      setListings((ls) => ls.map((l) => (l.id === listing.id ? { ...l, status: 'Reserved' as const } : l)));
      setOrders((os) => [placed, ...os]);
      setOrder(placed);
      navigate(`/orders/${placed.id}`);
      flash('Item reserved. Seller notified in chat.');
    } catch (err) {
      flash('Could not place order: ' + (err instanceof Error ? err.message : 'unknown error'));
    }
  };

  const cancelOrder = async (target: Order) => {
    try {
      const updated = await apiCancelOrder(target);
      setListings((ls) => ls.map((l) => (l.id === target.listingId ? { ...l, status: 'Available' as const } : l)));
      setOrders((os) => os.map((o) => (o.id === target.id ? updated : o)));
      setOrder((current) => (current?.id === target.id ? null : current));
      navigate('/orders');
      flash('Order cancelled. Item is Available again.');
    } catch (err) {
      flash('Could not cancel order: ' + (err instanceof Error ? err.message : 'unknown error'));
    }
  };

  const openBuyerHandover = (target?: Order) => {
    if (target) setOrder(target);
    const done = (target ?? order)?.status === 'Completed';
    setHandover((h) => ({ ...h, role: 'buyer', error: null, stage: { ...h.stage, buyer: done ? 'done' : 'ready' } }));
    navigate('/handover');
  };

  const openSellerHandover = (saleId: string) => {
    setHandover((h) => ({
      ...h, role: 'seller', saleId, code: null, codeLoading: true, error: null, stage: { ...h.stage, seller: 'ready' },
    }));
    navigate('/handover');
  };

  const verifyHandoverCode = async (input: string) => {
    if (!order) return;
    const token = normalizeHandoverCode(input);
    if (!token) {
      setHandover((h) => ({ ...h, error: 'Enter the 32-character code shown on the seller’s screen.' }));
      return;
    }
    setHandover((h) => ({ ...h, error: null, stage: { ...h.stage, buyer: 'verifying' } }));
    try {
      const result = await completeHandover(order.id, token);
      const completed = { ...order, status: result.status, completedAt: result.completedAt };
      setOrders((os) => os.map((o) => (o.id === order.id ? completed : o)));
      setOrder(completed);
      setListings((ls) => ls.map((l) => (l.id === order.listingId ? { ...l, status: 'Sold' as const } : l)));
      setHandover((h) => ({ ...h, stage: { ...h.stage, buyer: 'done' } }));
      setRateOpen(true);
      flash('Handover confirmed. Order closed.');
    } catch (err) {
      const message = err instanceof ApiError && err.status === 400
        ? 'That code doesn’t match this order. Check with the seller and try again.'
        : 'Could not confirm handover: ' + (err instanceof Error ? err.message : 'unknown error');
      setHandover((h) => ({ ...h, error: message, stage: { ...h.stage, buyer: 'ready' } }));
    }
  };

  // The QR encodes {orderId, buyerId, token} (see order-service's generateQRCode()),
  // not the bare token — camera scans go through the same verifyHandoverCode() path
  // as manual entry once the token is pulled out.
  const scanHandoverQr = (payload: string) => {
    try {
      const { token } = JSON.parse(payload);
      if (typeof token !== 'string') throw new Error();
      void verifyHandoverCode(token);
    } catch {
      setHandover((h) => ({ ...h, error: 'That QR code is not a handover code for this order.' }));
    }
  };

  const markSale = (saleId: string, status: Sale['status']) => {
    setSales((ss) => ss.map((s) => (s.id === saleId ? {
      ...s, status, action: status === 'Completed' ? 'Sold' : status === 'Cancelled' ? 'Cancelled' : s.action,
    } : s)));
  };

  const cancelSale = async (saleId: string, listingId?: string) => {
    try {
      const status = await cancelOrderById(saleId);
      markSale(saleId, status);
      const sale = sales.find((s) => s.id === saleId);
      const itemId = sale?.listingId ?? listingId;
      if (itemId) setListings((ls) => ls.map((l) => (l.id === itemId ? { ...l, status: 'Available' as const } : l)));
      flash('Reservation cancelled. The item is Available again.');
      navigate('/mylistings');
      return true;
    } catch (err) {
      flash('Could not cancel reservation: ' + (err instanceof Error ? err.message : 'unknown error'));
      return false;
    }
  };

  const activeSaleFor = (listingId: string) => sales.find((s) => s.listingId === listingId && s.status === 'Reserved');

  const openSellerQrForListing = async (listingId: string) => {
    let sale = activeSaleFor(listingId);
    if (!sale) {
      try {
        const refreshedSales = await getPurchasesItem(categories);
        setSales(refreshedSales);
        sale = refreshedSales.find((item) => item.listingId === listingId && item.status === 'Reserved');
      } catch (err) {
        flash('Could not load the active order: ' + (err instanceof Error ? err.message : 'unknown error'));
        return;
      }
    }
    if (!sale) {
      flash('No active order was found for this listing. Refresh to check its current status.');
      return;
    }
    openSellerHandover(sale.id);
  };

  const cancelSellerReservation = async (id: string): Promise<boolean> => {
    let sale = activeSaleFor(id);
    if (!sale) {
      try {
        const refreshedSales = await getPurchasesItem(categories);
        setSales(refreshedSales);
        sale = refreshedSales.find((item) => item.listingId === id && item.status === 'Reserved');
      } catch (err) {
        flash('Could not load the active order: ' + (err instanceof Error ? err.message : 'unknown error'));
        return false;
      }
    }
    if (!sale) {
      flash('No active order was found for this listing. Refresh to check its current status.');
      return false;
    }
    return cancelSale(sale.id, id);
  };

  const handoverSaleId = handover.role === 'seller' ? handover.saleId : null;
  const onHandoverPage = location.pathname === '/handover';

  useEffect(() => {
    if (!onHandoverPage || !handoverSaleId) return;
    let cancelled = false;
    getHandoverQr(handoverSaleId)
      .then(({ token, qrImageDataUrl }) => {
        if (!cancelled) setHandover((h) => ({ ...h, code: token, qrImageDataUrl, codeLoading: false }));
      })
      .catch((err) => {
        if (!cancelled) {
          setHandover((h) => ({
            ...h, codeLoading: false, error: 'Could not get the handover code: ' + (err instanceof Error ? err.message : 'unknown error'),
          }));
        }
      });
    const poll = setInterval(async () => {
      try {
        const status = await fetchOrderStatus(handoverSaleId);
        if (cancelled || status === 'Reserved') return;
        clearInterval(poll);
        markSale(handoverSaleId, status);
        if (status === 'Completed') {
          setHandover((h) => ({ ...h, stage: { ...h.stage, seller: 'done' } }));
        } else {
          setHandover((h) => ({ ...h, error: 'This order was cancelled. The item is Available again.' }));
        }
      } catch { }
    }, 4000);
    return () => { cancelled = true; clearInterval(poll); };
  }, [onHandoverPage, handoverSaleId]);

  const pickSellPhotos = async (files: File[]) => {
    setSellPhotosUploading(true);
    try {
      const uploaded = await uploadPhotos(files, sellPhotos.length);
      setSellPhotos((p) => [...p, ...uploaded]);
    } catch (err) {
      flash(err instanceof UploadError ? err.message : 'Could not upload the photo.');
    } finally {
      setSellPhotosUploading(false);
    }
  };

  const removeSellPhoto = (index: number) => {
    setSellPhotos((p) => p.filter((_, i) => i !== index));
  };

  const changeAccountPhoto = async (file: File) => {
    setChangingPhoto(true);
    try {
      const path = await uploadPhoto(file);
      setMe(await updateMyProfile({ avatarUrl: path }));
      flash('Photo updated.');
    } catch (err) {
      flash(err instanceof UploadError ? err.message : 'Could not update the photo.');
    } finally {
      setChangingPhoto(false);
    }
  };

  const publish = async () => {
    if (!form.title.trim() || !form.price) { flash('Title and price are required.'); return; }
    const categoryId = categoryIdOf(form.cat);
    if (!categoryId) { flash('Pick a category.'); return; }
    if (!CONDITIONS.includes(form.cond) || !SPOTS.includes(form.spot)) {
      flash('Pick a condition and handover spot.');
      return;
    }
    try {
      const listing = await createListing({
        title: form.title.trim(),
        description: form.desc.trim(),
        price: Number(form.price),
        categoryId,
        condition: form.cond,
        handoverSpot: form.spot,
        imageUrls: sellPhotos,
      }, categories);
      setListings((ls) => [listing, ...ls]);
      setForm(EMPTY_FORM);
      setSellPhotos([]);
      navigate('/listing/' + listing.id);
      flash('Published.');
    } catch (err) {
      flash('Could not publish: ' + (err instanceof Error ? err.message : 'unknown error'));
    }
  };

  const saveListing = async (id: string, patch: { title: string; price: number; cond?: string; desc: string; spot?: string }) => {
    try {
      const updated = await updateListing(id, {
        title: patch.title, price: patch.price, description: patch.desc,
        condition: patch.cond, handoverSpot: patch.spot,
      }, categories);
      setListings((ls) => ls.map((l) => (l.id === id ? updated : l)));
      flash('Listing updated.');
      return true;
    } catch (err) {
      flash('Could not update: ' + (err instanceof Error ? err.message : 'unknown error'));
      return false;
    }
  };

  const removeListing = async (id: string) => {
    try {
      await deleteListing(id);
      setListings((ls) => ls.filter((l) => l.id !== id));
      setWishIds((w) => w.filter((x) => x !== id));
      setWishlistMap((m) => { const { [id]: _, ...rest } = m; return rest; });
      flash('Listing deleted.');
      return true;
    } catch (err) {
      flash('Could not delete: ' + (err instanceof Error ? err.message : 'unknown error'));
      return false;
    }
  };

  const toggleWishlist = async (listing: Listing) => {
    const isWished = wishIds.includes(listing.id);
    if (isWished) {
      const wishlistId = wishlistMap[listing.id];
      if (!wishlistId) return;
      try {
        await removeFromWishlist(wishlistId);
        setWishIds((w) => w.filter((x) => x !== listing.id));
        setWishlistMap((m) => { const { [listing.id]: _, ...rest } = m; return rest; });
        flash('Removed from wishlist.');
      } catch (err) {
        flash('Could not remove from wishlist: ' + (err instanceof Error ? err.message : 'unknown error'));
      }
    } else {
      try {
        const created = await addToWishlist(listing.id);
        setWishIds((w) => [...w, listing.id]);
        setWishlistMap((m) => ({ ...m, [listing.id]: created.id }));
        flash('Added to wishlist! ❤️');
      } catch (err) {
        flash('Could not add to wishlist: ' + (err instanceof Error ? err.message : 'unknown error'));
      }
    }
  };

  const openChat = (l: Listing) => {
    if (loggedIn) {
      liveChat.openChatFor(l)
        .then(() => navigate('/chat'))
        .catch((err) => flash('Could not open chat: ' + (err instanceof Error ? err.message : 'unknown error')));
      return;
    }
    const existing = threads.find((t) => t.name === l.seller && t.listing.id === l.id) || threads.find((t) => t.name === l.seller);
    if (existing) {
      setThreads((ts) => ts.map((t) => (t.id === existing.id ? { ...t, unread: 0 } : t)));
      setActiveThread(existing.id);
    } else {
      const id = Date.now();
      setThreads((ts) => [{
        id, name: l.seller, faculty: l.faculty, online: true, presence: 'Online now', unread: 0,
        listing: { id: l.id, title: l.title, price: l.price, status: l.status },
        messages: [{ id: 's0', from: 'system', text: 'Chat started from the listing page' }],
      }, ...ts]);
      setActiveThread(id);
    }
    navigate('/chat');
  };

  const sendMessage = (threadId: number | string, text: string) => {
    const t = chatThreads.find((x) => x.id === threadId);
    if (!t) return;
    if (loggedIn && typeof threadId === 'string') {
      liveChat.send(threadId, text).then((ack) => { if (!ack.ok) flash('Message not sent: ' + ack.error); });
      return;
    }
    setThreads((ts) => ts.map((x) => (x.id === threadId
      ? { ...x, messages: [...x.messages, { id: 'me' + Date.now(), from: 'me' as const, text, time: 'now', status: 'Sent' }] }
      : x)));
  };

  const unread = notifications.filter((n) => !n.read).length;
  const openNotification = async (n: NotificationItem) => {
    if (!n.read) {
      try {
        await markNotificationRead(String(n.id));
        setNotifications((items) => items.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
      } catch (err) {
        flash('Could not mark notification as read: ' + (err instanceof Error ? err.message : 'unknown error'));
      }
    }
    const a = n.action;
    if (!a) return;
    if (a.type === 'listing') {
      try {
        const listing = await fetchListing(a.listingId, categories);
        if (!listing) {
          flash('This listing is no longer available.');
          navigate('/browse');
          return;
        }
        openListing(listing);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          flash('This listing is no longer available.');
          navigate('/browse');
        } else {
          flash('Could not open listing: ' + (err instanceof Error ? err.message : 'unknown error'));
        }
      }
    } else if (a.type === 'order') navigate(`/orders/${encodeURIComponent(a.orderId)}`);
    else if (a.type === 'chat') navigate(`/chat?roomId=${encodeURIComponent(a.chatRoomId)}`);
    else if (a.type === 'review') navigate(`/profile?tab=Reviews&reviewId=${encodeURIComponent(a.reviewId)}`);
  };

  const currentUserId = getCurrentUserId();
  const currentUser: CurrentUser = me
    ? toUser(me)
    : { id: currentUserId ?? '', name: '', memberType: 'Student', faculty: '', joined: '' };
  const mine = listings.filter((l) => l.sellerId === currentUserId);
  // Was seeded from mock data and never updated with anything real — a buyer actually
  // reserving your listing never showed up here. Derive it from the same `sales` data
  // MyListingsScreen already gets elsewhere instead. `window` isn't tracked as real data
  // anywhere in this app yet (the handover screens show the same '—' placeholder for it).
  const reservations: Record<string, SellerReservation> = Object.fromEntries(
    sales.filter((s) => s.status === 'Reserved').map((s) => [
      s.listingId,
      { buyer: s.buyer, reference: 'ORD-' + s.id.slice(-8).toUpperCase(), window: '—', spot: s.spot },
    ]),
  );
  const purchases: Purchase[] = orders.map((o) => ({
    id: o.id, title: o.title, price: o.price, seller: o.seller, when: o.placedAt, status: o.status, spot: o.spot,
    rated: o.rated,
    action: o.status === 'Completed' ? (o.rated ? 'Rated' : 'Awaiting your review') : o.status === 'Reserved' ? 'In progress' : 'Cancelled',
  }));
  const activeSale = sales.find((item) => item.status === 'Reserved');
  const openOrderRef = orders.find((item) => item.status === 'Reserved')?.reference
    ?? (activeSale ? `ORD-${activeSale.id.slice(-8).toUpperCase()}` : null);
  const savedAll = listings.filter((l) => wishIds.includes(l.id));

  const buyerHandover: HandoverOrder | null = order ? {
    reference: order.reference, handoverCode: order.handoverCode, title: order.title, photo: order.photo,
    price: order.price, seller: order.seller, buyer: currentUser.name, spot: order.spot, window: order.window,
  } : null;
  const sellerSale = sales.find((s) => s.id === handover.saleId);
  const sellerHandover: HandoverOrder | null = sellerSale ? {
    reference: 'ORD-' + sellerSale.id.slice(-8).toUpperCase(),
    handoverCode: handover.code ? formatHandoverCode(handover.code) : '', title: sellerSale.title,
    photo: sellerSale.photo, qrImageDataUrl: handover.qrImageDataUrl ?? undefined,
    price: sellerSale.price, seller: currentUser.name, buyer: sellerSale.buyer, spot: sellerSale.spot, window: '—',
  } : null;

  const reviewOrder = order
    ? {
      orderId: order.id, sellerId: order.sellerId, title: order.title, price: order.price,
      seller: order.seller, sellerPhoto: reviewSellerPhoto,
      when: order.status === 'Completed' ? 'Today' : order.window, status: order.status,
    }
    : null;

  if (!loggedIn) {
    return (
      <>
        <GlobalStyles />
        <AppShell centered>
          <LoginScreen onSignIn={handleSignIn} signingIn={signingIn} />
        </AppShell>
        <Toast message={toast} />
      </>
    );
  }

  const orderProps = {
    order,
    onScanQr: () => openBuyerHandover(),
    // Not listings.find(): the item is Reserved/Sold for every active order (that's
    // why there's an order on it), so it's never in the Available-only catalog list
    // openChat() only reads sellerId/id off this, both already on the order itself.
    onChat: () => { if (order) openChat({ id: order.listingId, sellerId: order.sellerId } as Listing); },
    onCancel: () => { if (order) cancelOrder(order); },
    onRate: () => { if (order && selectReviewOrder(order)) setRateOpen(true); },
    onBrowse: () => navigate('/'),
  };

  const profileScreenElement = (
    <ProfileScreen
      isSelf
      initialTab={new URLSearchParams(location.search).get('tab') ?? undefined}
      focusReviewId={new URLSearchParams(location.search).get('reviewId') ?? undefined}
      user={{ ...currentUser, photo: me?.avatarUrl }}
      stats={[
        ['SELLER RATING', `${myRating.avg.toFixed(1)} ★`],
        ['ACTIVE LISTINGS', mine.filter((l) => l.status === 'Available').length],
        ['REVIEWS', myRating.count],
        ['JOINED', currentUser.joined || '—'],
      ]}
      listings={mine}
      purchases={purchases}
      onRatePurchase={(id) => {
        const o = orders.find((x) => x.id === id);
        if (o && selectReviewOrder(o)) setRateOpen(true);
      }}
      sales={sales}
      onShowHandoverCode={(sale) => openSellerHandover(sale.id)}
      reviews={myReviews}
      prefs={prefs}
      notificationPrefs={NOTIFICATION_PREFS}
      onTogglePref={(key) => { void toggleNotificationPreference(key); }}
      onEditProfile={() => navigate('/account')}
      onWishlist={() => navigate('/wishlist')}
      onSell={() => navigate('/sell')}
      onChat={() => {}}
      onOpenListing={openListing}
    />
  );

  return (
    <>
      <GlobalStyles />
      <AppShell>
        <TopNav
          user={currentUser}
          query={query}
          onQueryChange={setQuery}
          onSearch={() => navigate('/browse')}
          orderCount={orders.filter((o) => o.status === 'Reserved').length}
          unreadCount={unread}
          onHome={() => navigate('/')}
          onWishlist={() => navigate('/wishlist')}
          onChat={() => navigate('/chat')}
          onNotifications={() => navigate('/notifications')}
          onOrders={() => navigate('/orders')}
          onSell={() => navigate('/sell')}
          onProfile={() => navigate('/profile')}
        />

        <Routes>
          <Route path="/" element={(
            <CatalogScreen
              listings={listings.filter((l) => l.status !== 'Sold').slice(0, 10)}
              categories={categoryNames}
              onOpenListing={openListing}
              onPickCategory={(c) => { setQuery(''); navigate(`/browse?category=${encodeURIComponent(c)}`); }}
              onSeeAll={() => navigate('/browse')}
              alerts={alerts} alertsLoading={matchLoading} alertsError={matchError}
              onOpenAutoMatch={(id) => navigate(id === undefined
                ? '/wishlist?tab=alerts'
                : `/wishlist?tab=alerts&ruleId=${encodeURIComponent(String(id))}`)}
              onNewAutoMatch={() => navigate('/wishlist?tab=alerts&new=1')}
            />
          )} />

          <Route path="/browse" element={(
            <ListingsRoute
              results={results} filters={filters} onFilterChange={setFilters}
              categories={categoryNames} conditions={CONDITIONS} faculties={FACULTIES}
              counts={counts} totalCount={listings.length} query={query}
              onOpenListing={openListing} onReset={reset}
              onCreateAutoMatch={createAutoMatchFromSearch}
            />
          )} />

          <Route path="/listing/:id" element={(
            <ListingRoute
              listings={listings} orders={orders} loaded={listingsLoaded} loadListing={(id) => fetchListing(id, categories)}
              onDeleteListing={removeListing} onCancelReservation={cancelSellerReservation}
              onShowSellerQr={openSellerQrForListing}
              wishIds={wishIds} wishlistMap={wishlistMap} onToggleWishlist={toggleWishlist} setSelectedId={setSelectedId}
              placeOrder={placeOrder} openChat={openChat}
            />
          )} />

          <Route path="/sell" element={(
            <SellScreen
              form={form} onChange={setForm} onPublish={publish}
              categories={categoryNames} conditions={CONDITIONS} spots={SPOTS}
              photos={sellPhotos} photosUploading={sellPhotosUploading}
              onPickPhotos={pickSellPhotos} onRemovePhoto={removeSellPhoto}
            />
          )} />

          <Route path="/order" element={(
            <OrderScreen {...orderProps} />
          )} />
          <Route path="/orders" element={<OrdersRoute orders={orders} onBrowse={() => navigate('/browse')} />} />
          <Route path="/orders/:orderId" element={(
            <OrderDetailRoute
              orders={orders}
              sales={sales}
              currentUserId={currentUser.id}
              onScanQr={(o) => openBuyerHandover(o)}
              onChat={(o) => openChat({ id: o.listingId, sellerId: o.sellerId } as Listing)}
              onCancel={cancelOrder}
              onRate={(o) => { if (selectReviewOrder(o)) setRateOpen(true); }}
              onShowSellerQr={(sale) => openSellerHandover(sale.id)}
              onCancelSale={cancelSale}
              onBrowse={() => navigate('/browse')}
            />
          )} />

          <Route path="/handover" element={(() => {
            const isSeller = handover.role === 'seller' && sellerHandover;
            const o = isSeller ? sellerHandover : buyerHandover;
            if (!o) return <OrderScreen order={null} onBrowse={() => navigate('/')} onScanQr={() => {}} onChat={() => {}} onCancel={() => {}} onRate={() => {}} />;
            return (
              <HandoverScreen
                role={isSeller ? 'seller' : 'buyer'} order={o}
                stage={handover.stage[isSeller ? 'seller' : 'buyer']} error={handover.error}
                codeLoading={isSeller ? handover.codeLoading : false}
                onRoleChange={sellerHandover && buyerHandover ? (r) => setHandover((h) => ({ ...h, role: r, error: null })) : undefined}
                onVerifyCode={verifyHandoverCode}
                onScanToken={scanHandoverQr}
                onCancelReservation={isSeller && sellerSale?.status === 'Reserved' ? () => cancelSale(sellerSale.id) : undefined}
                onChat={() => navigate('/chat')}
                onRate={() => { if (order && selectReviewOrder(order)) navigate('/review'); }}
                onHome={() => navigate('/')}
              />
            );
          })()} />

          <Route path="/review" element={reviewOrder ? (
            <ReviewScreen
              order={reviewOrder}
              reviewerName={currentUser.name}
              reviewerPhoto={currentUser.photo}
              sellerStats={reviewStats}
              submitted={reviewSubmitted || order?.rated}
              submitting={reviewSubmitting}
              error={reviewError}
              onGoHandover={() => openBuyerHandover()}
              onHome={() => navigate('/')}
              onSubmit={submitReview}
            />
          ) : <Navigate to="/orders" replace />} />

          <Route path="/profile" element={profileScreenElement} />
          <Route path="/profile/:userId" element={(
            <SellerProfileRoute
              listings={listings}
              loadProfile={fetchProfile}
              loadReviews={fetchSellerReviews}
              loadRating={fetchSellerRating}
              purchases={purchases}
              prefs={prefs}
              notificationPrefs={NOTIFICATION_PREFS}
              onTogglePref={(key) => { void toggleNotificationPreference(key); }}
              onEditProfile={() => navigate('/account')}
              onWishlist={() => navigate('/wishlist')}
              onSell={() => navigate('/sell')}
              onChat={(sellerId, itemId) => openChat({ id: itemId, sellerId } as Listing)}
              onOpenListing={openListing}
            />
          )} />

          <Route path="/mylistings" element={(
            <MyListingsScreen
              listings={mine} reservations={reservations} conditions={CONDITIONS} spots={SPOTS}
              onOpenListing={openListing}
              onSave={saveListing}
              onDelete={removeListing}
              onShowQr={(id) => { void openSellerQrForListing(id); }}
              onCancelReservation={cancelSellerReservation}
              onNew={() => navigate('/sell')}
            />
          )} />

          <Route path="/account" element={(
            <AccountScreen
              user={{
                name: currentUser.name, memberType: currentUser.memberType, faculty: currentUser.faculty,
                email: getCurrentClaims()?.email ?? '', photo: me?.avatarUrl,
              }}
              profile={profile} sessions={SESSIONS}
              listingSummary={`${mine.filter((l) => l.status === 'Available').length} active · ${mine.filter((l) => l.status === 'Reserved').length} reserved · ${mine.filter((l) => l.status === 'Sold').length} sold`}
              openOrderRef={openOrderRef}
              deletingAccount={deletingAccount}
              deleteAccountError={deleteAccountError}
              onClearDeleteAccountError={() => setDeleteAccountError(null)}
              onSaveProfile={async (p) => {
                try {
                  setMe(await updateMyProfile({ contactInfo: p.contact }));
                  setProfile(p);
                  flash('Profile saved.');
                } catch (err) {
                  flash('Could not save profile: ' + (err instanceof Error ? err.message : 'unknown error'));
                }
              }}
              onChangePhoto={changeAccountPhoto} changingPhoto={changingPhoto}
              onLogout={() => logout('Signed out.')}
              onLogoutAll={() => logout('Signed out on all devices.')}
              onMyListings={() => navigate('/mylistings')}
              onDeleteAccount={handleDeleteAccount}
            />
          )} />

          <Route path="/wishlist" element={(
            <WishlistScreen
              key={location.search}
              initialTab={new URLSearchParams(location.search).get('tab') === 'alerts' ? 'alerts' : 'saved'}
              selectedAlertId={new URLSearchParams(location.search).get('ruleId') ?? undefined}
              focusNewAlert={new URLSearchParams(location.search).get('new') === '1'}
              onShowAllAlerts={() => navigate('/wishlist?tab=alerts')}
              saved={savedAll.filter((l) => l.status !== 'Sold')}
              alerts={alerts} matches={matchHits} categories={categoryNames}
              loading={wishlistLoading || matchLoading}
              error={wishlistError ?? matchError}
              onRetry={async () => {
                await Promise.all([loadWishlistData(), loadMatchData(categories)]);
              }}
              onOpenListing={openListing}
              onRemove={async (itemId) => {
                const wishlistId = wishlistMap[itemId];
                if (!wishlistId) throw new Error('Saved listing was not found. Refresh and try again.');
                try {
                  await removeFromWishlist(wishlistId);
                  setWishIds((w) => w.filter((x) => x !== itemId));
                  setWishlistMap((m) => { const { [itemId]: _, ...rest } = m; return rest; });
                  flash('Removed from wishlist.');
                } catch (err) {
                  flash('Could not remove: ' + (err instanceof Error ? err.message : 'unknown error'));
                  throw err;
                }
              }}
              onBrowse={() => navigate('/browse')}
              onCreateAlert={async (a) => {
                const categoryId = a.cat === 'Any' ? undefined : categories.find((c) => c.name === a.cat)?.id;
                if (a.cat !== 'Any' && !categoryId) throw new Error('Choose a valid category.');
                try {
                  await createMatchRule({ keyword: a.text, categoryId, isActive: true });
                  await loadMatchData(categories);
                  flash('Alert created.');
                } catch (err) {
                  flash('Could not create alert: ' + (err instanceof Error ? err.message : 'unknown error'));
                  throw err;
                }
              }}
              onUpdateAlert={async (id, patch) => {
                const categoryId = patch.cat === 'Any'
                  ? ANY_CATEGORY_ID
                  : categories.find((c) => c.name === patch.cat)?.id;
                if (!categoryId) throw new Error('Choose a valid category.');
                try {
                  await updateMatchRule(String(id), { keyword: patch.text, categoryId });
                  await loadMatchData(categories);
                  flash('Alert updated.');
                } catch (err) {
                  flash('Could not update alert: ' + (err instanceof Error ? err.message : 'unknown error'));
                  throw err;
                }
              }}
              onDeleteAlert={async (id) => {
                try {
                  await deleteMatchRule(String(id));
                  await loadMatchData(categories);
                  flash('Alert deleted.');
                } catch (err) {
                  flash('Could not delete alert: ' + (err instanceof Error ? err.message : 'unknown error'));
                  throw err;
                }
              }}
              onToggleAlert={async (id) => {
                const alert = alerts.find((a) => a.id === id);
                if (!alert) throw new Error('Auto-match alert was not found. Refresh and try again.');
                try {
                  await updateMatchRule(String(id), { isActive: !alert.on });
                  await loadMatchData(categories);
                } catch (err) {
                  flash('Could not toggle alert: ' + (err instanceof Error ? err.message : 'unknown error'));
                  throw err;
                }
              }}
            />
          )} />

          <Route path="/notifications" element={(
            <NotificationsScreen
              notifications={notifications} prefs={prefs} prefItems={NOTIFICATION_PREFS}
              loading={notificationsLoading || preferencesLoading}
              error={notificationsError ?? preferencesError}
              markingAllRead={markingAllRead}
              savingPreferences={savingPreferences}
              onOpen={openNotification}
              onRetry={async () => {
                await Promise.all([loadNotificationsData(), loadNotificationPreferences()]);
              }}
              onMarkAllRead={markAllNotificationsRead}
              onTogglePref={toggleNotificationPreference}
            />
          )} />

          <Route path="/chat" element={(
            <ChatScreen
              threads={chatThreads} activeId={loggedIn ? (requestedRoomId ?? liveChat.activeId) : activeThread} typingId={null}
              emptyMessage={requestedRoomId
                ? liveChat.roomsError ? 'Could not load conversations. Please refresh and try again.'
                  : liveChat.roomsLoaded ? 'This conversation is no longer available to your account.'
                    : 'Loading linked conversation…'
                : undefined}
              onSelectThread={(id) => {
                if (loggedIn) { liveChat.select(String(id)); if (requestedRoomId) navigate('/chat', { replace: true }); return; }
                setActiveThread(id); setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
              }}
              onBack={() => {
                if (loggedIn) {
                  liveChat.setActiveId(null);
                  if (requestedRoomId) navigate('/chat', { replace: true });
                } else setActiveThread(null);
              }}
              onSend={(id, text) => sendMessage(id, text)}
              onAttachPhoto={() => flash('Photo picker — up to 4 images.')}
              onOpenListing={(l: ChatThreadListing) => {
                if (l.orderId) navigate(`/orders/${l.orderId}`);
                else openListing(l.id);
              }}
            />
          )} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>

      <RateSellerDialog
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        onSubmit={({ stars, text }) => submitReview({ stars, text })}
        submitting={reviewSubmitting}
        error={reviewError}
      />
      <Toast message={toast} />
    </>
  );
}
