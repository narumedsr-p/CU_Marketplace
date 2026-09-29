import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import GlobalStyles from './theme/GlobalStyles';
import AppShell from './layout/AppShell';
import TopNav from './layout/TopNav';
import Toast from './components/Toast';
import RateSellerDialog from './components/RateSellerDialog';
import useToast from './hooks/useToast';
import useCatalogFilters from './hooks/useCatalogFilters';
import { consumeAuthRedirect, signIn, signOut } from './api/auth';
import { ApiError, getCurrentClaims, getCurrentUserId, getToken, onUnauthorized } from './api/client';
import {
  createListing, deleteListing, fetchCategories, fetchListing, fetchListings, updateListing,
  type ApiCategory,
} from './api/catalog';
import { fetchMyProfile, fetchProfile, toUser, updateMyProfile, type ApiProfile } from './api/profiles';
import {
  cancelOrder as apiCancelOrder, cancelOrderById, completeHandover, fetchMyOrders, fetchOrderStatus,
  formatHandoverCode, getHandoverQr, getPurchasesItem, normalizeHandoverCode, placeOrder as apiPlaceOrder,
} from './api/orders';

import LoginScreen from './screens/LoginScreen';
import CatalogScreen from './screens/CatalogScreen';
import ListingScreen from './screens/ListingScreen';
import SellScreen from './screens/SellScreen';
import OrderScreen from './screens/OrderScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminCategoriesScreen from './screens/AdminCategoriesScreen';
import AccountScreen from './screens/AccountScreen';
import ChatScreen from './screens/ChatScreen';
import HandoverScreen from './screens/HandoverScreen';
import ModerationScreen from './screens/ModerationScreen';
import MyListingsScreen from './screens/MyListingsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ReportScreen from './screens/ReportScreen';
import ReviewScreen from './screens/ReviewScreen';
import SuspendedScreen from './screens/SuspendedScreen';
import WishlistScreen from './screens/WishlistScreen';
import ListingsRoute from './routes/listings/ListingsRoute';
import OrdersRoute from './routes/orders/OrdersRoute';
import OrderDetailRoute from './routes/orders/OrderDetailRoute';
import SellerProfileRoute from './routes/profile/SellerProfileRoute';

import {
  CONDITIONS, FACULTIES, SPOTS,
  REVIEWS, NOTIFICATION_PREFS,
  SESSIONS, BLOCKED_USERS, NOTIFICATIONS,
  THREADS, RESERVATIONS, AUTO_MATCH_ALERTS, MODERATION_CASES, AUDIT_LOG, MY_REPORTS,
} from './data/mockListings';
import type {
  AccountProfile, AutoMatchAlert, BlockedUser, ChatThread, ChatThreadListing, CurrentUser,
  HandoverOrder, HandoverStage, Listing, ModerationCase, NotificationItem,
  NotificationPrefsState, Order, Purchase, ReportTarget, Sale, SellForm, SellerReservation, Suspension,
} from './types';

const EMPTY_FORM: SellForm = {
  title: '', price: '', cat: 'Electronics', cond: 'Like new', desc: '', spot: 'Sala Phra Kiao',
};

const DEMO_SUSPENSION: Suspension = {
  until: '4 Oct 2026', reason: 'Selling counterfeit goods — CU jersey listed as "official".',
  caseId: 'CASE-1042', since: '27 Sep 2026', duration: '7 days',
};

interface ListingRouteProps {
  listings: Listing[];
  loaded: boolean;
  loadListing: (id: string) => Promise<Listing | null>;
  wishIds: string[];
  setWishIds: (fn: (ids: string[]) => string[]) => void;
  setSelectedId: (id: string) => void;
  placeOrder: (listing: Listing) => void;
  openChat: (listing: Listing) => void;
  openReport: (target: ReportTarget) => void;
  setBlocked: (fn: (b: BlockedUser[]) => BlockedUser[]) => void;
  flash: (msg: string) => void;
}

// Reads :id from the URL and keeps `selectedId` in sync so a direct link / refresh / back
// button resolves to the right listing.
function ListingRoute({
  listings, loaded, loadListing, wishIds, setWishIds, setSelectedId, placeOrder, openChat, openReport, setBlocked, flash,
}: ListingRouteProps) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useState(() => setSelectedId(id));
  const inList = listings.find((l) => l.id === id);
  const [fetched, setFetched] = useState<Listing | null | undefined>(undefined);

  useEffect(() => {
    if (inList || !loaded) return;
    setFetched(undefined);
    loadListing(id).then(setFetched).catch(() => setFetched(null));
  }, [id, inList, loaded]);

  const listing = inList ?? fetched;
  if (!listing) {
    return loaded && fetched === null ? <Navigate to="/" replace /> : null;
  }
  return (
    <ListingScreen
      listing={listing}
      wished={wishIds.includes(listing.id)}
      onPlaceOrder={() => placeOrder(listing)}
      onChat={() => openChat(listing)}
      onToggleWishlist={() => {
        const on = wishIds.includes(listing.id);
        setWishIds((w) => (on ? w.filter((x) => x !== listing.id) : [...w, listing.id]));
        flash(on ? 'Removed from wishlist' : 'Added to wishlist');
      }}
      onViewSeller={() => { if (listing.sellerId) navigate('/profile/' + listing.sellerId); }}
      onReport={() => openReport({ type: 'Listing', title: listing.title, target: listing.seller })}
      onBlock={() => { setBlocked((b) => [...b, { name: listing.seller, since: 'today' }]); flash(listing.seller + ' blocked.'); }}
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
  const [wishIds, setWishIds] = useState<string[]>(['10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005']);
  const [me, setMe] = useState<ApiProfile | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefsState>({ chat: true, wishlist: true, order: true, promo: false });
  const [form, setForm] = useState<SellForm>(EMPTY_FORM);
  const [rateOpen, setRateOpen] = useState(false);

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [handover, setHandover] = useState<{
    role: 'buyer' | 'seller'; saleId: string | null; code: string | null; codeLoading: boolean;
    stage: Record<'buyer' | 'seller', HandoverStage>; error: string | null;
  }>({ role: 'buyer', saleId: null, code: null, codeLoading: false, stage: { buyer: 'ready', seller: 'ready' }, error: null });

  const [threads, setThreads] = useState<ChatThread[]>(THREADS);
  const [activeThread, setActiveThread] = useState<number | null>(1);
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);
  const [blocked, setBlocked] = useState<BlockedUser[]>(BLOCKED_USERS);
  const [cases, setCases] = useState<ModerationCase[]>(MODERATION_CASES);
  const [reservations, setReservations] = useState<Record<string, SellerReservation>>(RESERVATIONS);
  const [alerts, setAlerts] = useState<AutoMatchAlert[]>(AUTO_MATCH_ALERTS);
  const [profile, setProfile] = useState<AccountProfile>({ bio: '', contact: '' });

  const { toast, flash } = useToast();
  const { filters, setFilters, results, counts, reset } = useCatalogFilters(listings, query);

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
    })();
    return () => { cancelled = true; };
  }, [loggedIn, flash]);

  const categoryNames = categories.map((c) => c.name);
  const categoryIdOf = (name: string) => categories.find((c) => c.name === name)?.id;

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

  const openListing = (l: Listing | string) => {
    const id = typeof l === 'object' ? l.id : l;
    setSelectedId(id);
    navigate('/listing/' + id);
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

  const markSale = (saleId: string, status: Sale['status']) => {
    setSales((ss) => ss.map((s) => (s.id === saleId ? {
      ...s, status, action: status === 'Completed' ? 'Sold' : status === 'Cancelled' ? 'Cancelled' : s.action,
    } : s)));
  };

  const cancelSale = async (saleId: string) => {
    try {
      const status = await cancelOrderById(saleId);
      markSale(saleId, status);
      const sale = sales.find((s) => s.id === saleId);
      if (sale) setListings((ls) => ls.map((l) => (l.id === sale.listingId ? { ...l, status: 'Available' as const } : l)));
      flash('Reservation cancelled. The item is Available again.');
      navigate('/mylistings');
    } catch (err) {
      flash('Could not cancel reservation: ' + (err instanceof Error ? err.message : 'unknown error'));
    }
  };

  const activeSaleFor = (listingId: string) => sales.find((s) => s.listingId === listingId && s.status === 'Reserved');

  const cancelSellerReservation = (id: string) => {
    const sale = activeSaleFor(id);
    if (sale) { cancelSale(sale.id); return; }
    setListings((ls) => ls.map((l) => (l.id === id ? { ...l, status: 'Available' as const } : l)));
    setReservations((r) => { const n = { ...r }; delete n[id]; return n; });
    flash('Reservation cancelled. The buyer was notified.');
    navigate('/mylistings');
  };

  const handoverSaleId = handover.role === 'seller' ? handover.saleId : null;
  const onHandoverPage = location.pathname === '/handover';

  useEffect(() => {
    if (!onHandoverPage || !handoverSaleId) return;
    let cancelled = false;
    getHandoverQr(handoverSaleId)
      .then(({ token }) => { if (!cancelled) setHandover((h) => ({ ...h, code: token, codeLoading: false })); })
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

  const publish = async () => {
    if (!form.title.trim() || !form.price) { flash('Title and price are required.'); return; }
    const categoryId = categoryIdOf(form.cat);
    if (!categoryId) { flash('Pick a category.'); return; }
    try {
      const listing = await createListing({
        title: form.title.trim(),
        description: form.desc.trim(),
        price: Number(form.price),
        categoryId,
      }, categories);
      setListings((ls) => [listing, ...ls]);
      setForm(EMPTY_FORM);
      navigate('/listing/' + listing.id);
      flash('Published.');
    } catch (err) {
      flash('Could not publish: ' + (err instanceof Error ? err.message : 'unknown error'));
    }
  };

  const saveListing = async (id: string, patch: { title: string; price: number; desc: string }) => {
    try {
      const updated = await updateListing(id, { title: patch.title, price: patch.price, description: patch.desc }, categories);
      setListings((ls) => ls.map((l) => (l.id === id ? updated : l)));
      flash('Listing updated.');
    } catch (err) {
      flash('Could not update: ' + (err instanceof Error ? err.message : 'unknown error'));
    }
  };

  const removeListing = async (id: string) => {
    try {
      await deleteListing(id);
      setListings((ls) => ls.filter((l) => l.id !== id));
      setWishIds((w) => w.filter((x) => x !== id));
      flash('Listing deleted.');
    } catch (err) {
      flash('Could not delete: ' + (err instanceof Error ? err.message : 'unknown error'));
    }
  };

  const openChat = (l: Listing) => {
    const existing = threads.find((t) => t.name === l.seller && t.listing.id === l.id) || threads.find((t) => t.name === l.seller);
    if (existing) {
      setThreads((ts) => ts.map((t) => (t.id === existing.id ? { ...t, unread: 0 } : t)));
      setActiveThread(existing.id);
    } else {
      const id = Date.now();
      setThreads((ts) => [{
        id, name: l.seller, faculty: l.faculty, online: true, presence: 'Online now', unread: 0, blocked: false,
        listing: { id: l.id, title: l.title, price: l.price, status: l.status },
        messages: [{ id: 's0', from: 'system', text: 'Chat started from the listing page' }],
      }, ...ts]);
      setActiveThread(id);
    }
    navigate('/chat');
  };

  const sendMessage = (threadId: number, text: string) => {
    const t = threads.find((x) => x.id === threadId);
    if (!t || t.blocked) { flash('Message not sent — this conversation is blocked.'); return; }
    setThreads((ts) => ts.map((x) => (x.id === threadId
      ? { ...x, messages: [...x.messages, { id: 'me' + Date.now(), from: 'me' as const, text, time: 'now', status: 'Sent' }] }
      : x)));
  };

  const toggleBlock = (t: ChatThread) => {
    const nowBlocked = !t.blocked;
    setThreads((ts) => ts.map((x) => (x.id === t.id ? { ...x, blocked: nowBlocked } : x)));
    setBlocked((b) => (nowBlocked ? [...b, { name: t.name, since: 'today' }] : b.filter((x) => x.name !== t.name)));
    flash(nowBlocked ? t.name + ' blocked.' : t.name + ' unblocked.');
  };

  const openReport = (target: ReportTarget) => { setReportTarget(target); navigate('/report'); };

  const unread = notifications.filter((n) => !n.read).length;
  const openNotification = (n: NotificationItem) => {
    setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    const a = n.action;
    if (!a) return;
    if (a.type === 'listing' && a.listingId) openListing(a.listingId);
    else if (a.type === 'chat' && a.id !== undefined) { setActiveThread(a.id); navigate('/chat'); }
    else if (a.type === 'mylistings') navigate('/mylistings');
    else if (a.type === 'account') navigate('/account');
  };

  const currentUserId = getCurrentUserId();
  const currentUser: CurrentUser = me
    ? toUser(me)
    : { id: currentUserId ?? '', name: '', memberType: 'Student', faculty: '', joined: '' };
  const mine = listings.filter((l) => l.sellerId === currentUserId);
  const purchases: Purchase[] = orders.map((o) => ({
    id: o.id, title: o.title, price: o.price, seller: o.seller, when: o.placedAt, status: o.status, spot: o.spot,
    action: o.status === 'Completed' ? 'Rate seller' : o.status === 'Reserved' ? 'In progress' : 'Cancelled',
  }));
  const savedAll = listings.filter((l) => wishIds.includes(l.id));

  const buyerHandover: HandoverOrder | null = order ? {
    reference: order.reference, handoverCode: order.handoverCode, title: order.title,
    price: order.price, seller: order.seller, buyer: currentUser.name, spot: order.spot, window: order.window,
  } : null;
  const sellerSale = sales.find((s) => s.id === handover.saleId);
  const sellerHandover: HandoverOrder | null = sellerSale ? {
    reference: 'ORD-' + sellerSale.id.slice(0, 8).toUpperCase(),
    handoverCode: handover.code ? formatHandoverCode(handover.code) : '', title: sellerSale.title,
    price: sellerSale.price, seller: currentUser.name, buyer: sellerSale.buyer, spot: sellerSale.spot, window: '—',
  } : null;

  const reviewOrder = order && !order.rated
    ? { title: order.title, price: order.price, seller: order.seller, when: order.status === 'Completed' ? 'Today' : order.window, status: order.status }
    : { title: 'Calculus I & II textbook bundle', price: 400, seller: 'Narumedsr Pitayachamrat', when: '28 Jul 2026', status: 'Completed' as const };
  const reviewSeller = listings.find((l) => l.seller === reviewOrder.seller);
  const baseStats = { avg: Number(reviewSeller?.rating ?? 4.8), count: reviewSeller?.reviewCount ?? 26 };

  // Suspended is full-bleed (no TopNav/AppShell chrome) whether reached from the login gate
  // or the logged-in demo shortcut, so it's checked before either branch.
  if (location.pathname === '/suspended') {
    return (
      <>
        <GlobalStyles />
        <SuspendedScreen suspension={DEMO_SUSPENSION} onBack={() => logout()} />
      </>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <GlobalStyles />
        <AppShell>
          <LoginScreen onSignIn={handleSignIn} signingIn={signingIn} />
        </AppShell>
        <Toast message={toast} />
      </>
    );
  }

  const orderProps = {
    order,
    onScanQr: () => openBuyerHandover(),
    onChat: () => { const l = listings.find((x) => x.id === order?.listingId); if (l) openChat(l); },
    onCancel: () => { if (order) cancelOrder(order); },
    onRate: () => setRateOpen(true),
    onBrowse: () => navigate('/'),
  };

  const profileScreenElement = (
    <ProfileScreen
      isSelf
      user={currentUser}
      stats={[
        ['SELLER RATING', '—'],
        ['ACTIVE LISTINGS', mine.filter((l) => l.status === 'Available').length],
        ['ITEMS BOUGHT', orders.filter((o) => o.status === 'Completed').length],
        ['JOINED', currentUser.joined || '—'],
      ]}
      listings={mine}
      purchases={purchases}
      sales={sales}
      onShowHandoverCode={(sale) => openSellerHandover(sale.id)}
      reviews={REVIEWS}
      prefs={prefs}
      notificationPrefs={NOTIFICATION_PREFS}
      onTogglePref={(k) => setPrefs((p) => ({ ...p, [k]: !p[k] }))}
      onEditProfile={() => navigate('/account')}
      onWishlist={() => navigate('/wishlist')}
      onSell={() => navigate('/sell')}
      onChat={() => {}}
      onReport={() => {}}
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
            />
          )} />

          <Route path="/browse" element={(
            <ListingsRoute
              results={results} filters={filters} onFilterChange={setFilters}
              categories={categoryNames} conditions={CONDITIONS} faculties={FACULTIES}
              counts={counts} totalCount={listings.length} query={query}
              onOpenListing={openListing} onReset={reset}
            />
          )} />

          <Route path="/listing/:id" element={(
            <ListingRoute
              listings={listings} loaded={listingsLoaded} loadListing={(id) => fetchListing(id, categories)}
              wishIds={wishIds} setWishIds={setWishIds} setSelectedId={setSelectedId}
              placeOrder={placeOrder} openChat={openChat} openReport={openReport} setBlocked={setBlocked} flash={flash}
            />
          )} />

          <Route path="/sell" element={(
            <SellScreen
              form={form} onChange={setForm} onPublish={publish}
              categories={categoryNames} conditions={CONDITIONS} spots={SPOTS}
              onAddPhoto={() => flash('Photo picker — max 6, 5MB each.')}
            />
          )} />

          <Route path="/order" element={(
            <OrderScreen {...orderProps} />
          )} />
          <Route path="/orders" element={<OrdersRoute orders={orders} onBrowse={() => navigate('/browse')} />} />
          <Route path="/orders/:orderId" element={(
            <OrderDetailRoute
              orders={orders}
              onScanQr={(o) => openBuyerHandover(o)}
              onChat={(o) => { const l = listings.find((x) => x.id === o.listingId); if (l) openChat(l); }}
              onCancel={cancelOrder}
              onRate={(o) => { setOrder(o); setRateOpen(true); }}
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
                onCancelReservation={isSeller && sellerSale?.status === 'Reserved' ? () => cancelSale(sellerSale.id) : undefined}
                onChat={() => navigate('/chat')}
                onRate={() => navigate('/review')}
                onHome={() => navigate('/')}
              />
            );
          })()} />

          <Route path="/review" element={(
            <ReviewScreen
              order={reviewOrder}
              reviewerName={currentUser.name}
              sellerStats={baseStats}
              onGoHandover={() => openBuyerHandover()}
              onHome={() => navigate('/')}
              onSubmit={() => {
                if (order && order.status === 'Completed') setOrder((o) => o && { ...o, rated: true });
                flash('Review posted. Seller average updated.');
                navigate('/');
              }}
            />
          )} />

          <Route path="/profile" element={profileScreenElement} />
          <Route path="/profile/:userId" element={(
            <SellerProfileRoute
              listings={listings}
              loadProfile={fetchProfile}
              purchases={purchases}
              reviews={REVIEWS}
              prefs={prefs}
              notificationPrefs={NOTIFICATION_PREFS}
              onTogglePref={(k) => setPrefs((p) => ({ ...p, [k]: !p[k] }))}
              onEditProfile={() => navigate('/account')}
              onWishlist={() => navigate('/wishlist')}
              onSell={() => navigate('/sell')}
              onChat={(name) => { const l = listings.find((x) => x.seller === name); if (l) openChat(l); }}
              onReport={(name) => openReport({ type: 'User', title: name, target: name })}
              onOpenListing={openListing}
            />
          )} />

          <Route path="/mylistings" element={(
            <MyListingsScreen
              listings={mine} reservations={reservations} conditions={CONDITIONS}
              onSave={saveListing}
              onDelete={removeListing}
              onShowQr={(id) => {
                const sale = activeSaleFor(id);
                if (sale) openSellerHandover(sale.id);
                else flash('No active order for this listing yet.');
              }}
              onCancelReservation={cancelSellerReservation}
              onNew={() => navigate('/sell')}
            />
          )} />

          <Route path="/account" element={(
            <AccountScreen
              user={{ name: currentUser.name, memberType: currentUser.memberType, faculty: currentUser.faculty, email: getCurrentClaims()?.email ?? '' }}
              profile={profile} sessions={SESSIONS}
              myReports={MY_REPORTS} blocked={blocked}
              listingSummary={`${mine.filter((l) => l.status === 'Available').length} active · ${mine.filter((l) => l.status === 'Reserved').length} reserved · ${mine.filter((l) => l.status === 'Sold').length} sold`}
              openOrderRef={order && order.status === 'Reserved' ? order.reference : null}
              onSaveProfile={async (p) => {
                try {
                  setMe(await updateMyProfile({ contactInfo: p.contact }));
                  setProfile(p);
                  flash('Profile saved.');
                } catch (err) {
                  flash('Could not save profile: ' + (err instanceof Error ? err.message : 'unknown error'));
                }
              }}
              onChangePhoto={() => flash('Photo picker — replaces the directory photo.')}
              onLogout={() => logout('Signed out.')}
              onLogoutAll={() => logout('Signed out on all devices.')}
              onUnblock={(name) => { setBlocked((b) => b.filter((x) => x.name !== name)); flash(name + ' unblocked.'); }}
              onMyListings={() => navigate('/mylistings')}
              onDeleteAccount={() => logout('Account deletion requested.')}
            />
          )} />

          <Route path="/wishlist" element={(
            <WishlistScreen
              saved={savedAll.filter((l) => l.status !== 'Sold')}
              autoRemoved={savedAll.filter((l) => l.status === 'Sold')}
              alerts={alerts} matches={[]} categories={categoryNames}
              notifyOn={prefs.wishlist}
              onEnableNotify={() => setPrefs((p) => ({ ...p, wishlist: true }))}
              onOpenListing={openListing}
              onRemove={(id) => { setWishIds((w) => w.filter((x) => x !== id)); flash('Removed from wishlist'); }}
              onBrowse={() => navigate('/browse')}
              onCreateAlert={(a) => { setAlerts((as) => [{ id: Date.now(), on: true, liveMatches: 0, ...a }, ...as]); flash('Alert created.'); }}
              onUpdateAlert={(id, patch) => { setAlerts((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a))); flash('Alert updated.'); }}
              onDeleteAlert={(id) => { setAlerts((as) => as.filter((a) => a.id !== id)); flash('Alert deleted.'); }}
              onToggleAlert={(id) => setAlerts((as) => as.map((a) => (a.id === id ? { ...a, on: !a.on } : a)))}
            />
          )} />

          <Route path="/notifications" element={(
            <NotificationsScreen
              notifications={notifications} prefs={prefs} prefItems={NOTIFICATION_PREFS}
              onOpen={openNotification}
              onMarkAllRead={() => setNotifications((ns) => ns.map((n) => ({ ...n, read: true })))}
              onTogglePref={(k) => setPrefs((p) => ({ ...p, [k]: !p[k] }))}
            />
          )} />

          <Route path="/chat" element={(
            <ChatScreen
              threads={threads} activeId={activeThread} typingId={null}
              onSelectThread={(id) => { setActiveThread(id); setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, unread: 0 } : t))); }}
              onBack={() => setActiveThread(null)}
              onSend={(id, text) => sendMessage(id, text)}
              onAttachPhoto={() => flash('Photo picker — up to 4 images.')}
              onToggleBlock={toggleBlock}
              onReport={(t) => openReport({ type: 'User', title: t.name, target: t.name })}
              onOpenListing={(l: ChatThreadListing) => openListing(l.id)}
            />
          )} />

          <Route path="/report" element={reportTarget ? (
            <ReportScreen
              target={{ ...reportTarget, orderRef: order?.reference }}
              photos={[]}
              onAddPhoto={() => flash('Photo picker — up to 4 images.')}
              onSubmit={() => { flash('Report submitted — case created as Pending.'); navigate('/account'); }}
              onCancel={() => navigate(-1)}
            />
          ) : <Navigate to="/account" replace />} />

          <Route path="/moderation" element={(
            <ModerationScreen
              cases={cases} audit={AUDIT_LOG}
              onStartReview={(id) => setCases((cs) => cs.map((c) => (c.id === id ? { ...c, state: 'In review' } : c)))}
              onDismiss={(id) => setCases((cs) => cs.map((c) => (c.id === id ? { ...c, state: 'Dismissed', resolution: 'Dismissed — no policy violation found.' } : c)))}
              onRemoveListing={(id) => { setCases((cs) => cs.map((c) => (c.id === id ? { ...c, state: 'Closed', resolution: 'Listing removed · seller notified.' } : c))); flash('Listing removed.'); }}
              onSuspend={(id, { duration }) => {
                setCases((cs) => cs.map((c) => (c.id === id ? { ...c, state: 'Closed', resolution: (duration === 'Permanent ban' ? 'Permanently banned' : 'Suspended ' + duration) + ' · sessions revoked.' } : c)));
                flash('Action recorded.');
              }}
              onOpenEvidence={(c, e) => flash(e.k + ' for ' + c.id + ' opens read-only.')}
            />
          )} />

          <Route path="/admin" element={(
            <AdminCategoriesScreen
              categories={categoryNames.map((c) => ({
                id: c, name: c, slug: c.toLowerCase(), count: counts[c] || 0,
              }))}
              onNew={() => flash('New category — name, slug, parent.')}
              onMerge={() => flash('Select two or more categories to merge.')}
              onEdit={(c) => flash('Edit ' + c.name + ' — rename, re-slug, or merge.')}
            />
          )} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <div style={{ padding: '0 24px 22px', display: 'flex', gap: 14, flexWrap: 'wrap', font: "500 11.5px/1.4 'Bai Jamjuree'", color: '#A8909B' }}>
          {/* Demo-only shortcuts to screens that have no nav entry for a regular user. */}
          <span>Demo:</span>
          {[['moderation', 'Admin · moderation'], ['admin', 'Admin · categories'], ['account', 'Account'], ['mylistings', 'My listings']].map(([path, label]) => (
            <span key={path} onClick={() => navigate('/' + path)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{label}</span>
          ))}
          <span onClick={() => navigate('/suspended')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Suspended login</span>
        </div>
      </AppShell>

      <RateSellerDialog
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        onSubmit={() => { setRateOpen(false); setOrder((o) => o && { ...o, rated: true }); flash('Rating submitted.'); }}
      />
      <Toast message={toast} />
    </>
  );
}
