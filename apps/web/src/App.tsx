import { useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import GlobalStyles from './theme/GlobalStyles';
import AppShell from './layout/AppShell';
import TopNav from './layout/TopNav';
import Toast from './components/Toast';
import RateSellerDialog from './components/RateSellerDialog';
import useToast from './hooks/useToast';
import useCatalogFilters from './hooks/useCatalogFilters';

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
  LISTINGS, CATEGORIES, CONDITIONS, FACULTIES, SPOTS,
  CURRENT_USER, PURCHASES, REVIEWS, NOTIFICATION_PREFS,
  ACCOUNT_USER, ACCOUNT_PROFILE, SESSIONS, BLOCKED_USERS, NOTIFICATIONS,
  THREADS, RESERVATIONS, AUTO_MATCH_ALERTS, MODERATION_CASES, AUDIT_LOG, MY_REPORTS,
} from './data/mockListings';
import type {
  AccountProfile, AutoMatchAlert, BlockedUser, ChatThread, ChatThreadListing,
  HandoverOrder, HandoverStage, Listing, ModerationCase, NotificationItem,
  NotificationPrefsState, Order, ReportTarget, SellForm, SellerReservation, Suspension,
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
  wishIds: number[];
  setWishIds: (fn: (ids: number[]) => number[]) => void;
  setSelectedId: (id: number) => void;
  placeOrder: (listing: Listing) => void;
  openChat: (listing: Listing) => void;
  openReport: (target: ReportTarget) => void;
  setBlocked: (fn: (b: BlockedUser[]) => BlockedUser[]) => void;
  flash: (msg: string) => void;
}

// Reads :id from the URL and keeps `selectedId` in sync so a direct link / refresh / back
// button resolves to the right listing.
function ListingRoute({
  listings, wishIds, setWishIds, setSelectedId, placeOrder, openChat, openReport, setBlocked, flash,
}: ListingRouteProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const numId = Number(id);
  useState(() => setSelectedId(numId));
  const listing = listings.find((l) => l.id === numId);
  if (!listing) return <Navigate to="/" replace />;
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
      onViewSeller={() => navigate('/profile/' + encodeURIComponent(listing.seller))}
      onReport={() => openReport({ type: 'Listing', title: listing.title, target: listing.seller })}
      onBlock={() => { setBlocked((b) => [...b, { name: listing.seller, since: 'today' }]); flash(listing.seller + ' blocked.'); }}
    />
  );
}

/**
 * Reference wiring only. Every screen is presentational — replace these useState blocks with
 * your data layer (TanStack Query, WebSocket client, etc.) and keep the props.
 */
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(false);

  const [listings, setListings] = useState<Listing[]>(LISTINGS);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(1);
  const [order, setOrder] = useState<Order | null>(null);
  const [wishIds, setWishIds] = useState<number[]>([3, 5]);
  const [profileOf, setProfileOf] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefsState>({ chat: true, wishlist: true, order: true, promo: false });
  const [form, setForm] = useState<SellForm>(EMPTY_FORM);
  const [rateOpen, setRateOpen] = useState(false);

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [handover, setHandover] = useState<{
    role: 'buyer' | 'seller'; listingId: number | null;
    stage: Record<'buyer' | 'seller', HandoverStage>; codeError: boolean;
  }>({ role: 'buyer', listingId: null, stage: { buyer: 'ready', seller: 'ready' }, codeError: false });

  const [threads, setThreads] = useState<ChatThread[]>(THREADS);
  const [activeThread, setActiveThread] = useState<number | null>(1);
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);
  const [blocked, setBlocked] = useState<BlockedUser[]>(BLOCKED_USERS);
  const [cases, setCases] = useState<ModerationCase[]>(MODERATION_CASES);
  const [reservations, setReservations] = useState<Record<number, SellerReservation>>(RESERVATIONS);
  const [alerts, setAlerts] = useState<AutoMatchAlert[]>(AUTO_MATCH_ALERTS);
  const [profile, setProfile] = useState<AccountProfile>(ACCOUNT_PROFILE);

  const { toast, flash } = useToast();
  const { filters, setFilters, results, counts, reset } = useCatalogFilters(listings, query);

  const selected = useMemo(
    () => listings.find((l) => l.id === selectedId) || listings[0],
    [listings, selectedId],
  );

  const openListing = (l: Listing | number) => {
    const id = typeof l === 'object' ? l.id : l;
    setSelectedId(id);
    navigate('/listing/' + id);
  };

  const placeOrder = (listing: Listing) => {
    if (listing.status !== 'Available') { flash('This item was just reserved by another buyer.'); return; }
    setListings((ls) => ls.map((l) => (l.id === listing.id ? { ...l, status: 'Reserved' as const } : l)));
    setOrder({
      reference: 'ORD-2609-0148', handoverCode: 'RSA-4K7Q-2X', listingId: listing.id,
      title: listing.title, price: listing.price, seller: listing.seller,
      faculty: listing.faculty ?? '', spot: listing.spot,
      window: 'Today 17:00–19:00', placedAt: 'Today 14:22', status: 'Reserved', rated: false,
    });
    navigate('/order');
    flash('Item reserved. Seller notified in chat.');
  };

  const cancelOrder = () => {
    if (!order) return;
    setListings((ls) => ls.map((l) => (l.id === order.listingId ? { ...l, status: 'Available' as const } : l)));
    setOrder(null);
    navigate('/');
    flash('Order cancelled. Item is Available again.');
  };

  const completeBuyerOrder = () => {
    if (!order) return;
    setListings((ls) => ls.map((l) => (l.id === order.listingId ? { ...l, status: 'Sold' as const } : l)));
    setOrder((o) => o && { ...o, status: 'Completed' as const, completedAt: 'Today 17:41' });
    setHandover((h) => ({ ...h, stage: { ...h.stage, buyer: 'done' } }));
    setRateOpen(true);
    flash('Handover confirmed. Order closed.');
  };

  const cancelSellerReservation = (id: number) => {
    setListings((ls) => ls.map((l) => (l.id === id ? { ...l, status: 'Available' as const } : l)));
    setReservations((r) => { const n = { ...r }; delete n[id]; return n; });
    flash('Reservation cancelled. The buyer was notified.');
    navigate('/mylistings');
  };

  const publish = () => {
    if (!form.title.trim() || !form.price) { flash('Title and price are required.'); return; }
    const id = Math.max(...listings.map((l) => l.id)) + 1;
    setListings((ls) => [{
      id, title: form.title.trim(), price: Number(form.price), was: Math.round(Number(form.price) * 1.6),
      cat: form.cat, cond: form.cond, faculty: CURRENT_USER.faculty, seller: CURRENT_USER.name,
      rating: 4.8, reviewCount: 21, sold: 7, watchers: 0, posted: 'just now', status: 'Available' as const,
      spot: form.spot, handovers: 13, replyTime: '12 min', since: '2025',
      desc: form.desc.trim() || 'No description provided.',
    }, ...ls]);
    setForm(EMPTY_FORM);
    navigate('/');
    flash('Published. 3 buyers matched by auto-match keyword.');
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
    if (a.type === 'listing' && a.id !== undefined) openListing(a.id);
    else if (a.type === 'chat' && a.id !== undefined) { setActiveThread(a.id); navigate('/chat'); }
    else if (a.type === 'mylistings') navigate('/mylistings');
    else if (a.type === 'account') navigate('/account');
  };

  const mine = listings.filter((l) => l.seller === CURRENT_USER.name);
  const viewingSelf = profileOf === null;
  const sellerListings = listings.filter((l) => l.seller === profileOf);
  const savedAll = listings.filter((l) => wishIds.includes(l.id));

  const buyerHandover: HandoverOrder | null = order ? {
    reference: order.reference, handoverCode: order.handoverCode, title: order.title,
    price: order.price, seller: order.seller, buyer: CURRENT_USER.name, spot: order.spot, window: order.window,
  } : null;
  const sellerListing = listings.find((l) => l.id === handover.listingId);
  const sellerRes = handover.listingId !== null ? reservations[handover.listingId] : undefined;
  const sellerHandover: HandoverOrder | null = sellerListing && sellerRes ? {
    reference: sellerRes.reference, handoverCode: 'RSA-SELLER-CODE', title: sellerListing.title,
    price: sellerListing.price, seller: CURRENT_USER.name, buyer: sellerRes.buyer, spot: sellerRes.spot, window: sellerRes.window,
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
        <SuspendedScreen suspension={DEMO_SUSPENSION} onBack={() => { setLoggedIn(false); navigate('/login'); }} />
      </>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <GlobalStyles />
        <AppShell>
          <LoginScreen onSignIn={() => { setLoggedIn(true); navigate('/'); }} />
        </AppShell>
      </>
    );
  }

  const orderProps = {
    order,
    onScanQr: () => { setHandover((h) => ({ ...h, role: 'buyer' as const })); navigate('/handover'); },
    onChat: () => { const l = listings.find((x) => x.id === order?.listingId); if (l) openChat(l); },
    onCancel: cancelOrder,
    onRate: () => setRateOpen(true),
    onBrowse: () => navigate('/'),
  };

  const profileScreenElement = (
    <ProfileScreen
      isSelf={viewingSelf}
      user={viewingSelf ? CURRENT_USER : {
        name: profileOf ?? '', memberType: 'Student',
        faculty: selected.faculty ?? '', since: selected.since,
      }}
      stats={viewingSelf
        ? [['SELLER RATING', '4.8★'], ['HANDOVERS', '13'], ['ITEMS BOUGHT', String(PURCHASES.length)], ['AVG REPLY', '12 min']]
        : [['SELLER RATING', selected.rating + '★'], ['HANDOVERS', selected.handovers], ['REVIEWS', selected.reviewCount], ['AVG REPLY', selected.replyTime]]}
      listings={viewingSelf ? listings.slice(0, 4) : sellerListings}
      purchases={PURCHASES}
      reviews={REVIEWS}
      prefs={prefs}
      notificationPrefs={NOTIFICATION_PREFS}
      onTogglePref={(k) => setPrefs((p) => ({ ...p, [k]: !p[k] }))}
      onEditProfile={() => navigate('/account')}
      onWishlist={() => navigate('/wishlist')}
      onSell={() => navigate('/sell')}
      onChat={() => openChat(selected)}
      onReport={() => openReport({ type: 'User', title: profileOf ?? undefined, target: profileOf ?? '' })}
      onOpenListing={openListing}
    />
  );

  return (
    <>
      <GlobalStyles />
      <AppShell>
        <TopNav
          user={CURRENT_USER}
          query={query}
          onQueryChange={setQuery}
          onSearch={() => navigate('/browse')}
          orderCount={order ? 1 : 0}
          unreadCount={unread}
          onHome={() => navigate('/')}
          onWishlist={() => navigate('/wishlist')}
          onChat={() => navigate('/chat')}
          onNotifications={() => navigate('/notifications')}
          onOrders={() => navigate('/orders')}
          onSell={() => navigate('/sell')}
          onProfile={() => { setProfileOf(null); navigate('/profile'); }}
        />

        <Routes>
          <Route path="/" element={(
            <CatalogScreen
              listings={listings.filter((l) => l.status !== 'Sold').slice(0, 10)}
              categories={CATEGORIES}
              onOpenListing={openListing}
              onPickCategory={(c) => { setQuery(''); navigate(`/browse?category=${encodeURIComponent(c)}`); }}
              onSeeAll={() => navigate('/browse')}
            />
          )} />

          <Route path="/browse" element={(
            <ListingsRoute
              results={results} filters={filters} onFilterChange={setFilters}
              categories={CATEGORIES} conditions={CONDITIONS} faculties={FACULTIES}
              counts={counts} totalCount={listings.length} query={query}
              onOpenListing={openListing} onReset={reset}
            />
          )} />

          <Route path="/listing/:id" element={(
            <ListingRoute
              listings={listings} wishIds={wishIds} setWishIds={setWishIds} setSelectedId={setSelectedId}
              placeOrder={placeOrder} openChat={openChat} openReport={openReport} setBlocked={setBlocked} flash={flash}
            />
          )} />

          <Route path="/sell" element={(
            <SellScreen
              form={form} onChange={setForm} onPublish={publish}
              categories={CATEGORIES} conditions={CONDITIONS} spots={SPOTS}
              onAddPhoto={() => flash('Photo picker — max 6, 5MB each.')}
            />
          )} />

          <Route path="/order" element={(
            <OrderScreen {...orderProps} />
          )} />
          <Route path="/orders" element={<OrdersRoute {...orderProps} />} />
          <Route path="/orders/:orderId" element={<OrderDetailRoute {...orderProps} />} />

          <Route path="/handover" element={(() => {
            const isSeller = handover.role === 'seller' && sellerHandover;
            const o = isSeller ? sellerHandover : buyerHandover;
            if (!o) return <OrderScreen order={null} onBrowse={() => navigate('/')} onScanQr={() => {}} onChat={() => {}} onCancel={() => {}} onRate={() => {}} />;
            return (
              <HandoverScreen
                role={isSeller ? 'seller' : 'buyer'} order={o}
                stage={handover.stage[isSeller ? 'seller' : 'buyer']} codeError={handover.codeError}
                onRoleChange={sellerHandover && buyerHandover ? (r) => setHandover((h) => ({ ...h, role: r })) : undefined}
                onScan={() => { setHandover((h) => ({ ...h, stage: { ...h.stage, buyer: 'verifying' } })); setTimeout(completeBuyerOrder, 1000); }}
                onVerifyCode={(code) => (order && code === order.handoverCode ? completeBuyerOrder() : setHandover((h) => ({ ...h, codeError: true })))}
                onSimulateScan={() => {
                  if (handover.listingId === null) return;
                  setListings((ls) => ls.map((l) => (l.id === handover.listingId ? { ...l, status: 'Sold' as const } : l)));
                  setReservations((r) => { const n = { ...r }; if (handover.listingId !== null) delete n[handover.listingId]; return n; });
                  setHandover((h) => ({ ...h, stage: { ...h.stage, seller: 'done' } }));
                }}
                onCancelReservation={handover.listingId !== null ? () => cancelSellerReservation(handover.listingId as number) : undefined}
                onChat={() => navigate('/chat')}
                onRate={() => navigate('/review')}
                onHome={() => navigate('/')}
              />
            );
          })()} />

          <Route path="/review" element={(
            <ReviewScreen
              order={reviewOrder}
              reviewerName={CURRENT_USER.name}
              sellerStats={baseStats}
              onGoHandover={() => { setHandover((h) => ({ ...h, role: 'buyer' })); navigate('/handover'); }}
              onHome={() => navigate('/')}
              onSubmit={() => {
                if (order && order.status === 'Completed') setOrder((o) => o && { ...o, rated: true });
                flash('Review posted. Seller average updated.');
                navigate('/');
              }}
            />
          )} />

          <Route path="/profile" element={profileScreenElement} />
          <Route path="/profile/:sellerName" element={(
            <SellerProfileRoute
              listings={listings}
              purchases={PURCHASES}
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
              onSave={(id, patch) => { setListings((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))); flash('Listing updated.'); }}
              onDelete={(id) => { setListings((ls) => ls.filter((l) => l.id !== id)); setWishIds((w) => w.filter((x) => x !== id)); flash('Listing deleted.'); }}
              onShowQr={(id) => { setHandover((h) => ({ ...h, role: 'seller', listingId: id })); navigate('/handover'); }}
              onCancelReservation={cancelSellerReservation}
              onNew={() => navigate('/sell')}
            />
          )} />

          <Route path="/account" element={(
            <AccountScreen
              user={ACCOUNT_USER} profile={profile} sessions={SESSIONS}
              myReports={MY_REPORTS} blocked={blocked}
              listingSummary={`${mine.filter((l) => l.status === 'Available').length} active · ${mine.filter((l) => l.status === 'Reserved').length} reserved · ${mine.filter((l) => l.status === 'Sold').length} sold`}
              openOrderRef={order && order.status === 'Reserved' ? order.reference : null}
              onSaveProfile={(p) => { setProfile(p); flash('Profile saved.'); }}
              onChangePhoto={() => flash('Photo picker — replaces the directory photo.')}
              onLogout={() => { setLoggedIn(false); navigate('/login'); flash('Signed out.'); }}
              onLogoutAll={() => { setLoggedIn(false); navigate('/login'); flash('Signed out on all devices.'); }}
              onUnblock={(name) => { setBlocked((b) => b.filter((x) => x.name !== name)); flash(name + ' unblocked.'); }}
              onMyListings={() => navigate('/mylistings')}
              onDeleteAccount={() => { setLoggedIn(false); navigate('/login'); flash('Account deletion requested.'); }}
            />
          )} />

          <Route path="/wishlist" element={(
            <WishlistScreen
              saved={savedAll.filter((l) => l.status !== 'Sold')}
              autoRemoved={savedAll.filter((l) => l.status === 'Sold')}
              alerts={alerts} matches={[]} categories={CATEGORIES}
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
              categories={CATEGORIES.map((c) => ({
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
