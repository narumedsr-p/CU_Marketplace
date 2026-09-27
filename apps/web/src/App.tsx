import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobalStyles from './theme/GlobalStyles';
import AppShell from './layout/AppShell';
import TopNav from './layout/TopNav';
import AppRouter from './router';
import Toast from './components/Toast';
import RateSellerDialog from './components/RateSellerDialog';
import useToast from './hooks/useToast';
import useCatalogFilters from './hooks/useCatalogFilters';

import LoginScreen from './screens/LoginScreen';
import CatalogScreen from './screens/CatalogScreen';
import SellScreen from './screens/SellScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminCategoriesScreen from './screens/AdminCategoriesScreen';

import {
  LISTINGS, CATEGORIES, CONDITIONS, FACULTIES, SPOTS,
  CURRENT_USER, PURCHASES, REVIEWS, NOTIFICATION_PREFS,
} from './data/mockListings';
import type { Listing, NotificationPrefsState, Order, SellForm } from './types';

type Screen = 'login' | 'home' | 'sell' | 'profile' | 'admin';

const EMPTY_FORM: SellForm = {
  title: '', price: '', cat: 'Electronics', cond: 'Like new', desc: '', spot: 'Sala Phra Kiao',
};

/**
 * Reference wiring only. Replace the useState data with your own hooks —
 * every screen is a pure presentational component driven by props.
 */
export default function App() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('login');
  const [listings, setListings] = useState<Listing[]>(LISTINGS);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(1);
  const [order, setOrder] = useState<Order | null>(null);
  const [wished, setWished] = useState(false);
  const [profileOf, setProfileOf] = useState<string | null>(null); // null = own profile
  const [prefs, setPrefs] = useState<NotificationPrefsState>({ chat: true, wishlist: true, order: true, promo: false });
  const [form, setForm] = useState<SellForm>(EMPTY_FORM);
  const [rateOpen, setRateOpen] = useState(false);

  const { toast, flash } = useToast();
  const { filters, setFilters, results, counts, reset } = useCatalogFilters(listings, query);

  const selected = useMemo(
    () => listings.find((l) => l.id === selectedId) || listings[0],
    [listings, selectedId],
  );

  const openScreen = (nextScreen: Screen) => {
    setScreen(nextScreen);
    navigate('/');
  };

  const openListing = (listing: Listing) => {
    setSelectedId(listing.id);
    navigate(`/listings/${listing.id}`);
  };

  const placeOrder = (listing: Listing) => {
    if (listing.status !== 'Available') {
      flash('This item was just reserved by another buyer.');
      return;
    }
    setListings((ls) => ls.map((l) => (l.id === listing.id ? { ...l, status: 'Reserved' as const } : l)));
    const newOrder: Order = {
      reference: 'ORD-2609-0148', handoverCode: 'RSA-4K7Q-2X', listingId: listing.id,
      title: listing.title, price: listing.price, seller: listing.seller,
      faculty: listing.faculty ?? '', spot: listing.spot,
      window: 'Today 17:00–19:00', placedAt: 'Today 14:22', status: 'Reserved', rated: false,
    };
    setOrder(newOrder);
    navigate(`/orders/${newOrder.reference}`);
    flash('Item reserved. Seller notified in chat.');
  };

  const scanQr = () => {
    if (!order) return;
    setListings((ls) => ls.map((l) => (l.id === order.listingId ? { ...l, status: 'Sold' as const } : l)));
    setOrder((o) => o && { ...o, status: 'Completed' as const, completedAt: 'Today 17:41' });
    setRateOpen(true);
    flash('Handover confirmed. Order closed.');
  };

  const cancelOrder = () => {
    if (!order) return;
    setListings((ls) => ls.map((l) => (l.id === order.listingId ? { ...l, status: 'Available' as const } : l)));
    setOrder(null);
    openScreen('home');
    flash('Order cancelled. Item is Available again.');
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
    setScreen('home');
    flash('Published. 3 buyers matched by auto-match keyword.');
  };

  if (screen === 'login') {
    return (
      <>
        <GlobalStyles />
        <AppShell><LoginScreen onSignIn={() => setScreen('home')} /></AppShell>
      </>
    );
  }

  const viewingSelf = profileOf === null;
  const sellerListings = listings.filter((l) => l.seller === profileOf);

  const orderRouteProps = {
    order,
    onScanQr: scanQr,
    onChat: () => order && flash('Chat opened with ' + order.seller + '.'),
    onCancel: cancelOrder,
    onRate: () => setRateOpen(true),
    onBrowse: () => openScreen('home'),
  };

  const listingsRouteProps = {
    results,
    filters,
    onFilterChange: setFilters,
    categories: CATEGORIES,
    conditions: CONDITIONS,
    faculties: FACULTIES,
    counts,
    totalCount: listings.length,
    query,
    onOpenListing: openListing,
    onReset: reset,
  };

  const getListingScreenProps = (listing: Listing) => ({
    listing,
    wished,
    onPlaceOrder: () => placeOrder(listing),
    onChat: () => flash('Chat opened with ' + listing.seller + '.'),
    onToggleWishlist: () => {
      setWished((value) => !value);
      flash(wished ? 'Removed from wishlist' : 'Added to wishlist');
    },
    onViewSeller: () => {
      setSelectedId(listing.id);
      setProfileOf(listing.seller);
      openScreen('profile');
    },
    onReport: () => flash('Report submitted — case created as Pending.'),
    onBlock: () => flash(listing.seller + ' blocked.'),
  });

  const currentScreen = (
    <>
      {screen === 'home' && (
        <CatalogScreen
          listings={listings.filter((l) => l.status !== 'Sold').slice(0, 10)}
          categories={CATEGORIES}
          onOpenListing={openListing}
          onPickCategory={(c) => { setFilters({ ...filters, cat: c }); setQuery(''); navigate('/listings'); }}
          onSeeAll={() => navigate('/listings')}
        />
      )}

      {screen === 'sell' && (
        <SellScreen
          form={form} onChange={setForm} onPublish={publish}
          categories={CATEGORIES} conditions={CONDITIONS} spots={SPOTS}
          onAddPhoto={() => flash('Photo picker — max 6, 5MB each.')}
        />
      )}

      {screen === 'profile' && (
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
          onEditProfile={() => flash('Editable: photo, contact, bio. Name and faculty come from the directory.')}
          onWishlist={() => flash('Wishlist — saved listings and auto-match keywords.')}
          onSell={() => setScreen('sell')}
          onChat={() => flash('Chat opened with ' + profileOf + '.')}
          onReport={() => flash('Report submitted.')}
          onOpenListing={openListing}
        />
      )}

      {screen === 'admin' && (
        <AdminCategoriesScreen
          categories={CATEGORIES.map((c) => ({
            id: c, name: c, slug: c.toLowerCase(), count: counts[c] || 0,
          }))}
          onNew={() => flash('New category — name, slug, parent.')}
          onMerge={() => flash('Select two or more categories to merge.')}
          onEdit={(c) => flash('Edit ' + c.name + ' — rename, re-slug, or merge.')}
        />
      )}
    </>
  );

  return (
    <>
      <GlobalStyles />
      <AppShell>
        <TopNav
          user={CURRENT_USER}
          query={query}
          onQueryChange={setQuery}
          onSearch={() => navigate('/listings')}
          orderCount={order ? 1 : 0}
          onHome={() => openScreen('home')}
          onWishlist={() => flash('Wishlist — saved listings and auto-match keywords.')}
          onOrders={() => navigate('/orders')}
          onSell={() => openScreen('sell')}
          onProfile={() => { setProfileOf(null); openScreen('profile'); }}
        />

        <AppRouter
          currentScreen={currentScreen}
          listingDetailRouteProps={{ listings, getScreenProps: getListingScreenProps }}
          listingsRouteProps={listingsRouteProps}
          orderRouteProps={orderRouteProps}
        />
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
