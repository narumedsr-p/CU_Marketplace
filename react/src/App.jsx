import { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import GlobalStyles from './theme/GlobalStyles';
import { clock, slugify } from './theme/tokens';
import AppShell from './layout/AppShell';
import TopNav from './layout/TopNav';
import Toast from './components/Toast';
import RateSellerDialog from './components/RateSellerDialog';
import useToast from './hooks/useToast';
import useCatalogFilters from './hooks/useCatalogFilters';
import useAutoMatch from './hooks/useAutoMatch';

import LoginScreen from './screens/LoginScreen';
import SuspendedScreen from './screens/SuspendedScreen';
import CatalogScreen from './screens/CatalogScreen';
import BrowseScreen from './screens/BrowseScreen';
import ListingScreen from './screens/ListingScreen';
import SellScreen from './screens/SellScreen';
import OrderScreen from './screens/OrderScreen';
import HandoverScreen from './screens/HandoverScreen';
import ReviewScreen from './screens/ReviewScreen';
import ProfileScreen from './screens/ProfileScreen';
import MyListingsScreen from './screens/MyListingsScreen';
import AccountScreen from './screens/AccountScreen';
import WishlistScreen from './screens/WishlistScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ChatScreen from './screens/ChatScreen';
import ReportScreen from './screens/ReportScreen';
import ModerationScreen from './screens/ModerationScreen';
import AdminCategoriesScreen from './screens/AdminCategoriesScreen';

import {
  LISTINGS, CATEGORIES, CONDITIONS, FACULTIES, SPOTS,
  CURRENT_USER, PURCHASES, REVIEWS, NOTIFICATION_PREFS,
} from './data/mockListings';
import {
  SESSIONS, AUTO_MATCH_ALERTS, NOTIFICATIONS, THREADS, SELLER_RESERVATIONS, BLOCKED_USERS,
  CASES, AUDIT_LOG, LIVE_EVENTS, DEMO_SUSPENSION, HIGH_SEVERITY_REASONS,
} from './data/mockModules';

const EMPTY_FORM = { title: '', price: '', cat: 'Electronics', cond: 'Like new', desc: '', spot: 'Sala Phra Kiao' };
const ME = { ...CURRENT_USER, email: '6731332321@student.chula.ac.th' };
const DEMO_SUSPENDED = false; // flip to preview the 423 / suspended login state (FR 7.7)

// Screen-key -> route path, used by go() so most existing call sites are untouched.
const PATH = {
  login: '/login', suspended: '/suspended', home: '/', browse: '/browse',
  sell: '/sell', order: '/order', handover: '/handover', review: '/review',
  profile: '/profile', mylistings: '/mylistings', account: '/account',
  wishlist: '/wishlist', notifications: '/notifications', chat: '/chat',
  report: '/report', moderation: '/moderation', admin: '/admin',
};

/**
 * Reads :id from the URL, keeps `selectedId` (App state) in sync with it, and
 * renders ListingScreen against that URL-resolved listing so refresh/back/forward
 * and direct links to /listing/:id all resolve to the right item.
 */
function ListingRoute({ listings, wishIds, setWishIds, setSelectedId, placeOrder, openChat, openReport, setBlocked, flash }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const numId = Number(id);
  useEffect(() => { setSelectedId(numId); }, [numId, setSelectedId]);
  const listing = listings.find((l) => l.id === numId);
  if (!listing) return <Navigate to="/" replace />;
  return (
    <ListingScreen
      listing={listing} wished={wishIds.includes(listing.id)}
      onPlaceOrder={() => placeOrder(listing)}
      onChat={() => openChat(listing)}
      onToggleWishlist={() => {
        const on = wishIds.includes(listing.id);
        setWishIds((w) => (on ? w.filter((x) => x !== listing.id) : [...w, listing.id]));
        flash(on ? 'Removed from wishlist' : 'Added to wishlist');
      }}
      onViewSeller={() => navigate('/profile/' + encodeURIComponent(listing.seller))}
      onReport={() => openReport({ type: 'Listing', title: listing.title, target: listing.seller })}
      onBlock={() => { setBlocked((b) => [...b, { name: listing.seller, since: 'today' }]); flash(listing.seller + ' blocked. Their listings are hidden from you.'); }}
    />
  );
}

/** Reads :seller from the URL and keeps `profileOf` (App state) in sync with it. */
function ProfileRoute({ setProfileOf, children }) {
  const { seller } = useParams();
  const name = decodeURIComponent(seller);
  useEffect(() => { setProfileOf(name); }, [name, setProfileOf]);
  return children;
}

/**
 * Reference wiring only. Every screen is presentational — replace these useState blocks with
 * your data layer (TanStack Query, WebSocket client, etc.) and keep the props.
 */
export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const go = (key) => navigate(PATH[key] || '/' + key);
  const [loggedIn, setLoggedIn] = useState(false);

  const [listings, setListings] = useState(LISTINGS);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(1);
  const [order, setOrder] = useState(null);
  const [wishIds, setWishIds] = useState([3, 11, 10]);
  const [profileOf, setProfileOf] = useState(null);
  const [prefs, setPrefs] = useState({ chat: true, wishlist: true, order: true, promo: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [profile, setProfile] = useState({ bio: 'Engineering year 2. Usually free after 4 pm near Sala Phra Kiao.', contact: 'LINE: poonnawit.s' });

  const [rawAlerts, setRawAlerts] = useState(AUTO_MATCH_ALERTS);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [threads, setThreads] = useState(THREADS);
  const [activeThread, setActiveThread] = useState(1);
  const [typingId, setTypingId] = useState(null);
  const [blocked, setBlocked] = useState(BLOCKED_USERS);
  const [cases, setCases] = useState(CASES);
  const [audit, setAudit] = useState(AUDIT_LOG);
  const [categories, setCategories] = useState(CATEGORIES.map((name, i) => ({ id: i + 1, name, slug: slugify(name), parent: null })));
  const [catMap, setCatMap] = useState({});
  const [reservations, setReservations] = useState(SELLER_RESERVATIONS);
  const [reportTarget, setReportTarget] = useState(null);
  const [handover, setHandover] = useState({ role: 'buyer', listingId: null, stage: { buyer: 'ready', seller: 'ready' }, codeError: false });
  const [review, setReview] = useState({ submitted: false, stats: null });
  const [showRateDialog, setShowRateDialog] = useState(false);

  const { toast, flash } = useToast();
  const visible = useMemo(() => listings.filter((l) => l.status !== 'Hidden'), [listings]);
  const { filters, setFilters, results, counts, reset } = useCatalogFilters(visible, query);
  const { alerts, matches, evaluate } = useAutoMatch(visible, rawAlerts);

  const selected = listings.find((l) => l.id === selectedId) || listings[0];
  const mine = visible.filter((l) => l.seller === ME.name);
  const openListing = (l) => { const id = typeof l === 'object' ? l.id : l; setSelectedId(id); navigate('/listing/' + id); };
  const patchListing = (id, patch) => setListings((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const log = (code, target, detail, kind = 'Moderation', actor = 'You (admin)') =>
    setAudit((a) => [{ id: 'a' + Date.now() + Math.random(), t: clock(), actor, code, target, detail, kind, fresh: true }, ...a.map((x) => ({ ...x, fresh: false }))]);

  // ---- timers (demo realtime) ----
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    if (location.pathname !== '/moderation') return undefined;
    let i = 0;
    const id = setInterval(() => { const e = LIVE_EVENTS[i++ % LIVE_EVENTS.length]; log(e.code, e.target, e.detail, e.kind, e.actor); }, 7000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ---- orders ----
  const placeOrder = (listing) => {
    if (listing.status !== 'Available') { flash('This item was just reserved by another buyer.'); return; }
    patchListing(listing.id, { status: 'Reserved' });
    setOrder({
      reference: 'ORD-2609-0148', handoverCode: 'RSA-4K7Q-2X', listingId: listing.id,
      title: listing.title, price: listing.price, seller: listing.seller,
      faculty: listing.faculty, spot: listing.spot,
      window: 'Today 17:00–19:00', placedAt: 'Today 14:22', status: 'Reserved', rated: false,
    });
    setReview({ submitted: false, stats: null });
    openChat(listing, 'Order ORD-2609-0148 placed · item reserved for you', false);
    go('order');
    flash('Item reserved. Seller notified in chat.');
  };
  const completeBuyerOrder = () => {
    patchListing(order.listingId, { status: 'Sold' });
    setOrder((o) => ({ ...o, status: 'Completed', completedAt: clock() }));
    setHandover((h) => ({ ...h, stage: { ...h.stage, buyer: 'done' }, codeError: false }));
    setShowRateDialog(true);
    flash('Handover confirmed. Order closed.');
  };
  const cancelOrder = () => {
    patchListing(order.listingId, { status: 'Available' });
    setOrder(null);
    go('home');
    flash('Order cancelled. Item is Available again.');
  };

  const baseStatsFor = (sellerName) => {
    const seller = listings.find((l) => l.seller === sellerName) || {};
    return { avg: seller.rating || 4.8, count: seller.reviewCount || 26 };
  };
  const submitQuickRating = ({ stars }) => {
    if (!order) { setShowRateDialog(false); return; }
    const base = baseStatsFor(order.seller);
    const count = base.count + 1;
    const avg = Math.round(((base.avg * base.count + stars) / count) * 100) / 100;
    setReview({ submitted: true, stats: { avg, count } });
    setOrder((o) => (o ? { ...o, rated: true } : o));
    setShowRateDialog(false);
    flash('Review posted. Seller average updated.');
  };

  const buyerHandover = order ? { ...order, buyer: 'Poonnawit S.' } : null;
  const sellerListing = listings.find((l) => l.id === handover.listingId);
  const sellerRes = reservations[handover.listingId];
  const sellerHandover = sellerListing && sellerRes ? {
    reference: sellerRes.reference, handoverCode: sellerRes.handoverCode, title: sellerListing.title,
    price: sellerListing.price, seller: ME.name, buyer: sellerRes.buyer, spot: sellerRes.spot, window: sellerRes.window,
  } : null;

  const cancelSellerReservation = (id) => {
    patchListing(id, { status: 'Available' });
    setReservations((r) => { const n = { ...r }; delete n[id]; return n; });
    flash('Reservation cancelled. The buyer was notified and the item is Available again.');
    go('mylistings');
  };

  // ---- publish + auto-match (UC-04) ----
  const publish = () => {
    if (!form.title.trim() || !form.price) { flash('Title and price are required.'); return; }
    const id = Math.max(...listings.map((l) => l.id)) + 1;
    const item = {
      id, title: form.title.trim(), price: Number(form.price), was: Math.round(form.price * 1.6),
      cat: form.cat, cond: form.cond, faculty: ME.faculty, seller: ME.name,
      rating: 4.8, reviewCount: 21, sold: 7, watchers: 0, posted: 'just now', status: 'Available',
      spot: form.spot, handovers: 13, replyTime: '12 min', since: '2025',
      desc: form.desc.trim() || 'No description provided.',
    };
    setListings((ls) => [item, ...ls]);
    const hit = evaluate(item);
    log('AUTOMATCH_EVAL', 'Listing #' + id, hit.length + ' alerts matched', 'System', 'System');
    setForm(EMPTY_FORM);
    go('home');
    flash(hit.length ? `Published. Matched ${hit.length} auto-match alert${hit.length > 1 ? 's' : ''}.` : 'Published.');
  };

  // ---- chat ----
  const openChat = (l, systemText, shouldNavigate = true) => {
    const existing = threads.find((t) => t.name === l.seller && t.listing.id === l.id) || threads.find((t) => t.name === l.seller);
    const sys = systemText ? [{ id: 'sys' + Date.now(), from: 'system', text: systemText }] : [];
    if (existing) {
      setThreads((ts) => ts.map((t) => (t.id === existing.id ? { ...t, unread: 0, messages: [...t.messages, ...sys] } : t)));
      setActiveThread(existing.id);
    } else {
      const id = Date.now();
      setThreads((ts) => [{
        id, name: l.seller, faculty: l.faculty, online: true, presence: 'Online now', unread: 0, blocked: false,
        listing: { id: l.id, title: l.title, price: l.price, status: l.status },
        messages: sys.length ? sys : [{ id: 's0', from: 'system', text: 'Chat started from the listing page' }],
        replies: ['Hi! Yes, it’s still available.', 'Sure — what time works for you?'],
      }, ...ts]);
      setActiveThread(id);
    }
    if (shouldNavigate) go('chat');
  };
  // Replace with socket.emit('message', …); push server events into `threads`.
  const sendMessage = (threadId, msg) => {
    const t = threads.find((x) => x.id === threadId);
    if (!t || t.blocked) { flash('Message not sent — this conversation is blocked.'); return; }
    const m = { id: 'me' + Date.now(), from: 'me', time: clock(), status: 'Sent', ...msg };
    const upd = (fn) => setThreads((ts) => ts.map((x) => (x.id === threadId ? fn(x) : x)));
    upd((x) => ({ ...x, messages: [...x.messages, m] }));
    later(() => upd((x) => ({ ...x, messages: x.messages.map((y) => (y.id === m.id ? { ...y, status: 'Seen' } : y)) })), 600);
    later(() => setTypingId(threadId), 900);
    later(() => {
      setTypingId(null);
      upd((x) => {
        const n = x.replyIdx || 0;
        return { ...x, replyIdx: n + 1, messages: [...x.messages, { id: 'th' + Date.now(), from: 'them', text: x.replies[n % x.replies.length], time: clock() }] };
      });
    }, 2300);
  };
  const toggleBlock = (t) => {
    const nowBlocked = !t.blocked;
    setThreads((ts) => ts.map((x) => (x.id === t.id ? { ...x, blocked: nowBlocked } : x)));
    setBlocked((b) => (nowBlocked ? [...b, { name: t.name, since: 'today' }] : b.filter((x) => x.name !== t.name)));
    flash(nowBlocked ? t.name + ' blocked. Neither of you can message or see each other’s listings.' : t.name + ' unblocked.');
  };

  // ---- reports ----
  const openReport = (target) => { setReportTarget(target); go('report'); };
  const submitReport = ({ type, reason, text, photos, attachLinked, target }) => {
    const id = 'CASE-' + (1044 + cases.filter((c) => c.mine && c.id !== 'CASE-1031').length);
    const evidence = [];
    if (attachLinked) evidence.push({ k: type === 'Listing' ? 'Listing photos' : type === 'Order' ? 'Order history' : 'Chat log', v: 'Attached by reporter' });
    if (photos.length) evidence.push({ k: 'Reporter photos', v: photos.length + ' images' });
    setCases((cs) => [{
      id, mine: true, type, sev: HIGH_SEVERITY_REASONS.includes(reason) ? 'High' : 'Medium', state: 'Pending',
      title: type === 'User' ? target.target : target.title, target: target.target, targetFac: '—', reason,
      reporter: 'Poonnawit S.', when: 'just now', count: 1, note: text || 'No details provided.',
      evidence: evidence.length ? evidence : [{ k: 'None', v: 'No evidence attached' }], activeListings: 1, accountAge: '—', prior: 'none',
    }, ...cs]);
    log('REPORT_CREATE', id, type + ' · ' + reason, 'Moderation', 'Poonnawit S.');
    flash(id + ' created — Pending. Track it under Account › My reports.');
    go('account');
  };

  // ---- moderation ----
  const patchCase = (id, patch) => setCases((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const caseById = (id) => cases.find((c) => c.id === id);

  // ---- categories ----
  const catName = (c) => catMap[c] || c;
  const catRows = categories.map((c) => ({ ...c, count: visible.filter((l) => catName(l.cat) === c.name).length }));
  const remap = (map, from, to) => { const m = { ...map }; Object.keys(m).forEach((k) => { if (m[k] === from) m[k] = to; }); m[from] = to; return m; };

  // ---- notifications ----
  const unread = notifications.filter((n) => !n.read).length;
  const openNotification = (n) => {
    setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    const a = n.action || {};
    if (a.type === 'listing') openListing(a.id);
    else if (a.type === 'chat') { setActiveThread(a.id); go('chat'); }
    else if (a.type) go(a.type === 'account' ? 'account' : a.type);
  };

  // ---- review target: current order if not yet rated, else a pending past purchase ----
  const reviewOrder = order && !order.rated
    ? { title: order.title, price: order.price, seller: order.seller, when: order.status === 'Completed' ? 'Today' : order.window, status: order.status }
    : { title: 'Calculus I & II textbook bundle', price: 400, seller: 'Narumedsr Pitayachamrat', when: '28 Jul 2026', status: 'Completed' };
  const reviewSeller = listings.find((l) => l.seller === reviewOrder.seller) || {};
  const baseStats = { avg: reviewSeller.rating || 4.8, count: reviewSeller.reviewCount || 26 };

  // ---------------------------------------------------------------------------------------
  const authRoutes = (
    <Routes>
      <Route path="/suspended" element={<><GlobalStyles /><SuspendedScreen suspension={DEMO_SUSPENSION} onBack={() => navigate('/login')} /></>} />
      <Route
        path="*"
        element={(
          <>
            <GlobalStyles />
            <AppShell>
              <LoginScreen onSignIn={() => {
                if (DEMO_SUSPENDED) { navigate('/suspended'); return; }
                setLoggedIn(true);
                navigate('/');
              }} />
            </AppShell>
          </>
        )}
      />
    </Routes>
  );

  if (!loggedIn) return authRoutes;

  const viewingSelf = profileOf === null;
  const savedAll = listings.filter((l) => wishIds.includes(l.id));

  const moderationScreen = (initialTab) => (
    <ModerationScreen
      cases={cases} audit={audit} initialTab={initialTab}
      onStartReview={(id) => { patchCase(id, { state: 'In review' }); log('REPORT_REVIEW', id, 'Pending → In review'); }}
      onDismiss={(id) => { patchCase(id, { state: 'Dismissed', resolution: 'Dismissed — no policy violation found.' }); log('REPORT_DISMISS', id, 'No violation'); flash(id + ' dismissed.'); }}
      onRemoveListing={(id) => { const c = caseById(id); patchCase(id, { state: 'Closed', resolution: 'Listing removed · seller notified.' }); log('LISTING_REMOVE', c.title, c.reason + ' · ' + id); flash('Listing removed.'); }}
      onSuspend={(id, { duration, reason }) => {
        const c = caseById(id); const perm = duration === 'Permanent ban';
        patchCase(id, { state: 'Closed', resolution: (perm ? 'Permanently banned' : 'Suspended ' + duration) + ' · sessions revoked · ' + c.activeListings + ' listings hidden.' });
        log(perm ? 'USER_BAN' : 'USER_SUSPEND', c.target, (perm ? 'Permanent' : duration) + ' · “' + reason + '” · ' + id);
        flash(c.target + (perm ? ' banned.' : ' suspended for ' + duration + '.'));
      }}
      onOpenEvidence={(c, e) => flash(e.k + ' for ' + c.id + ' opens read-only.')}
      categoriesTab={(
        <AdminCategoriesScreen
          embedded categories={catRows}
          onCreate={(c) => { setCategories((cs) => [...cs, { id: Date.now(), ...c }]); log('CATEGORY_CREATE', c.name, '/' + c.slug, 'Categories'); flash('Category created.'); }}
          onUpdate={(id, patch) => {
            const old = categories.find((c) => c.id === id);
            if (patch.name !== old.name) setCatMap((m) => remap(m, old.name, patch.name));
            setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
            log('CATEGORY_UPDATE', old.name, '→ ' + patch.name + ' /' + patch.slug, 'Categories');
          }}
          onDelete={(id) => {
            const c = catRows.find((x) => x.id === id);
            setCatMap((m) => remap(m, c.name, 'Other'));
            setCategories((cs) => cs.filter((x) => x.id !== id));
            log('CATEGORY_DELETE', c.name, c.count + ' listings moved to Other', 'Categories');
            flash(`“${c.name}” deleted · ${c.count} listings moved to Other.`);
          }}
          onMerge={(sourceIds, targetId) => {
            const target = catRows.find((c) => c.id === targetId);
            const src = catRows.filter((c) => sourceIds.includes(c.id));
            const n = src.reduce((a, c) => a + c.count, 0);
            setCatMap((m) => src.reduce((acc, c) => remap(acc, c.name, target.name), m));
            setCategories((cs) => cs.filter((c) => !sourceIds.includes(c.id)));
            log('CATEGORY_MERGE', src.map((c) => c.name).join(' + ') + ' → ' + target.name, n + ' listings reassigned', 'Categories');
            flash(`Merged into ${target.name} · ${n} listings reassigned.`);
          }}
        />
      )}
    />
  );

  const profileScreenElement = (
    <ProfileScreen
      isSelf={viewingSelf}
      user={viewingSelf ? ME : { name: profileOf, memberType: 'Student', faculty: selected.faculty, since: selected.since }}
      stats={viewingSelf
        ? [['SELLER RATING', '4.8★'], ['HANDOVERS', '13'], ['ITEMS BOUGHT', String(PURCHASES.length)], ['AVG REPLY', '12 min']]
        : [['SELLER RATING', selected.rating + '★'], ['HANDOVERS', selected.handovers], ['REVIEWS', selected.reviewCount], ['AVG REPLY', selected.replyTime]]}
      listings={viewingSelf ? mine : visible.filter((l) => l.seller === profileOf)}
      purchases={PURCHASES} reviews={REVIEWS}
      prefs={prefs} notificationPrefs={NOTIFICATION_PREFS}
      onTogglePref={(k) => setPrefs((p) => ({ ...p, [k]: !p[k] }))}
      onEditProfile={() => go('account')} onWishlist={() => go('wishlist')}
      onMyListings={() => go('mylistings')} onSell={() => go('sell')}
      onChat={() => openChat(selected)}
      onReport={() => openReport({ type: 'User', title: profileOf, target: profileOf })}
      onOpenListing={openListing}
    />
  );

  return (
    <>
      <GlobalStyles />
      <AppShell>
        <TopNav
          user={ME} query={query} onQueryChange={setQuery} onSearch={() => go('browse')}
          orderCount={order ? 1 : 0} unreadCount={unread}
          onHome={() => go('home')} onWishlist={() => go('wishlist')} onChat={() => go('chat')}
          onNotifications={() => go('notifications')} onOrders={() => go('order')}
          onSell={() => go('sell')} onProfile={() => { setProfileOf(null); go('profile'); }}
        />

        <Routes>
          <Route path="/" element={(
            <CatalogScreen
              listings={visible.filter((l) => l.status !== 'Sold').slice(0, 10)} categories={CATEGORIES}
              onOpenListing={openListing}
              onPickCategory={(c) => { setFilters({ ...filters, cat: c }); setQuery(''); go('browse'); }}
              onSeeAll={() => go('browse')}
            />
          )} />

          <Route path="/browse" element={(
            <BrowseScreen
              results={results} filters={filters} onFilterChange={setFilters}
              categories={CATEGORIES} conditions={CONDITIONS} faculties={FACULTIES}
              counts={counts} totalCount={visible.length} query={query}
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
            <OrderScreen
              order={order}
              onScanQr={() => { setHandover((h) => ({ ...h, role: 'buyer' })); go('handover'); }}
              onChat={() => { const l = listings.find((x) => x.id === order.listingId); openChat(l); }}
              onCancel={cancelOrder} onRate={() => go('review')} onBrowse={() => go('home')}
            />
          )} />

          <Route path="/handover" element={(() => {
            const isSeller = handover.role === 'seller' && sellerHandover;
            const o = isSeller ? sellerHandover : buyerHandover;
            if (!o) return <OrderScreen order={null} onBrowse={() => go('home')} />;
            return (
              <HandoverScreen
                role={isSeller ? 'seller' : 'buyer'} order={o}
                stage={handover.stage[isSeller ? 'seller' : 'buyer']} codeError={handover.codeError}
                onRoleChange={sellerHandover && buyerHandover ? (r) => setHandover((h) => ({ ...h, role: r })) : undefined}
                onScan={() => { setHandover((h) => ({ ...h, stage: { ...h.stage, buyer: 'verifying' } })); later(completeBuyerOrder, 1200); }}
                onVerifyCode={(code) => (code === order.handoverCode ? completeBuyerOrder() : setHandover((h) => ({ ...h, codeError: true })))}
                onSimulateScan={() => { patchListing(handover.listingId, { status: 'Sold' }); setReservations((r) => { const n = { ...r }; delete n[handover.listingId]; return n; }); setHandover((h) => ({ ...h, stage: { ...h.stage, seller: 'done' } })); }}
                onCancelReservation={() => cancelSellerReservation(handover.listingId)}
                onChat={() => go('chat')} onRate={() => go('review')} onHome={() => go('home')}
              />
            );
          })()} />

          <Route path="/review" element={(
            <ReviewScreen
              order={reviewOrder} reviewerName={ME.name}
              sellerStats={review.stats || baseStats} submitted={review.submitted}
              onGoHandover={() => { setHandover((h) => ({ ...h, role: 'buyer' })); go('handover'); }}
              onHome={() => go('home')}
              onSubmit={({ stars }) => {
                const count = baseStats.count + 1;
                const avg = Math.round(((baseStats.avg * baseStats.count + stars) / count) * 100) / 100;
                setReview({ submitted: true, stats: { avg, count } });
                if (order && order.status === 'Completed') setOrder((o) => ({ ...o, rated: true }));
                flash('Review posted. Seller average updated.');
              }}
            />
          )} />

          <Route path="/profile" element={profileScreenElement} />
          <Route path="/profile/:seller" element={<ProfileRoute setProfileOf={setProfileOf}>{profileScreenElement}</ProfileRoute>} />

          <Route path="/mylistings" element={(
            <MyListingsScreen
              listings={mine} reservations={reservations} conditions={CONDITIONS}
              onSave={(id, patch) => { patchListing(id, patch); flash('Listing updated.'); }}
              onDelete={(id) => { patchListing(id, { status: 'Hidden' }); setWishIds((w) => w.filter((x) => x !== id)); flash('Listing deleted.'); }}
              onShowQr={(id) => { setHandover((h) => ({ ...h, role: 'seller', listingId: id })); go('handover'); }}
              onCancelReservation={cancelSellerReservation}
              onNew={() => go('sell')}
            />
          )} />

          <Route path="/account" element={(
            <AccountScreen
              user={ME} profile={profile} sessions={SESSIONS}
              myReports={cases.filter((c) => c.mine)} blocked={blocked}
              listingSummary={`${mine.filter((l) => l.status === 'Available').length} active · ${mine.filter((l) => l.status === 'Reserved').length} reserved · ${mine.filter((l) => l.status === 'Sold').length} sold`}
              openOrderRef={order && order.status === 'Reserved' ? order.reference : null}
              onSaveProfile={(p) => { setProfile(p); flash('Profile saved.'); }}
              onChangePhoto={() => flash('Photo picker — replaces the directory photo.')}
              onLogout={() => { setLoggedIn(false); navigate('/login'); flash('Signed out. Session revoked.'); }}
              onLogoutAll={() => { setLoggedIn(false); navigate('/login'); flash('Signed out on all devices.'); }}
              onUnblock={(name) => {
                setBlocked((b) => b.filter((x) => x.name !== name));
                setThreads((ts) => ts.map((t) => (t.name === name ? { ...t, blocked: false } : t)));
                flash(name + ' unblocked.');
              }}
              onMyListings={() => go('mylistings')}
              onDeleteAccount={() => { setLoggedIn(false); navigate('/login'); flash('Account deletion requested. Personal data is erased within 30 days (PDPA).'); }}
            />
          )} />

          <Route path="/wishlist" element={(
            <WishlistScreen
              saved={savedAll.filter((l) => l.status !== 'Sold' && l.status !== 'Hidden')}
              autoRemoved={savedAll.filter((l) => l.status === 'Sold')}
              alerts={alerts} matches={matches} categories={CATEGORIES}
              notifyOn={prefs.wishlist} onEnableNotify={() => setPrefs((p) => ({ ...p, wishlist: true }))}
              onOpenListing={openListing} onBrowse={() => go('browse')}
              onRemove={(id) => { setWishIds((w) => w.filter((x) => x !== id)); flash('Removed from wishlist'); }}
              onCreateAlert={(a) => { setRawAlerts((as) => [{ id: Date.now(), on: true, ...a }, ...as]); flash('Alert created.'); }}
              onUpdateAlert={(id, patch) => { setRawAlerts((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a))); flash('Alert updated.'); }}
              onDeleteAlert={(id) => { setRawAlerts((as) => as.filter((a) => a.id !== id)); flash('Alert deleted.'); }}
              onToggleAlert={(id) => setRawAlerts((as) => as.map((a) => (a.id === id ? { ...a, on: !a.on } : a)))}
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
              threads={threads} activeId={activeThread} typingId={typingId}
              onSelectThread={(id) => { setActiveThread(id); setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, unread: 0 } : t))); }}
              onBack={() => setActiveThread(null)}
              onSend={(id, text) => sendMessage(id, { text })}
              onAttachPhoto={(id) => sendMessage(id, { image: true })}
              onToggleBlock={toggleBlock}
              onReport={(t) => openReport({ type: 'User', title: t.name, target: t.name })}
              onOpenListing={(l) => openListing(l.id)}
            />
          )} />

          <Route path="/report" element={reportTarget ? (
            <ReportScreen
              target={{ ...reportTarget, orderRef: order ? order.reference : undefined }}
              photos={[]} onAddPhoto={() => flash('Photo picker — up to 4 images.')}
              onSubmit={submitReport} onCancel={() => navigate(-1)}
            />
          ) : <Navigate to="/account" replace />} />

          <Route path="/moderation" element={moderationScreen('reports')} />
          <Route path="/admin" element={moderationScreen('categories')} />

          <Route path="/suspended" element={<SuspendedScreen suspension={DEMO_SUSPENSION} onBack={() => { setLoggedIn(false); navigate('/login'); }} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <div style={{ padding: '0 24px 22px', display: 'flex', gap: 14, flexWrap: 'wrap', font: "500 11.5px/1.4 'Bai Jamjuree'", color: '#A8909B' }}>
          {/* Demo-only shortcuts to screens that have no nav entry for a regular user. */}
          <span>Demo:</span>
          {[['moderation', 'Admin · moderation'], ['admin', 'Admin · categories'], ['account', 'Account'], ['mylistings', 'My listings']].map(([k, l]) => (
            <span key={k} onClick={() => go(k)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{l}</span>
          ))}
          <span onClick={() => go('suspended')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Suspended login</span>
        </div>
      </AppShell>
      <Toast message={toast} />
      <RateSellerDialog open={showRateDialog} onClose={() => setShowRateDialog(false)} onSubmit={submitQuickRating} />
    </>
  );
}
