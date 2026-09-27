# RachaSA UI — React source

Frontend only. No API layer, no data fetching, no backend assumptions — every screen is a
presentational component driven by props and callbacks. Wire your own hooks and it works.

## Run the demo

```bash
cd react
npm install
npm run dev
```

`src/App.jsx` is a working reference wiring over `src/data/mockListings.js` — sign in, browse,
filter, open a listing, place an order, scan, rate, publish. Read it once, then delete it and
wire the screens to your own state.

## Use in your project

Copy `src/theme`, `src/components`, `src/layout`, `src/screens` and `src/hooks` into your app.
Zero dependencies beyond React 18. Styling is inline style objects — no CSS files, no Tailwind,
no styled-components, nothing to configure. Mount `<GlobalStyles />` once at the root (it loads
Bai Jamjuree and two keyframes).

```jsx
import { GlobalStyles, AppShell, TopNav, ListingGrid, color } from './ui';
```

## What's here

**Theme** — `theme/tokens.js` (all colors, fonts, shadows, the `baht()` formatter, `photoFill`),
`theme/GlobalStyles.jsx`.

**Components**

| Component | Notes |
|---|---|
| `Button` | `variant`: primary / outline / ghost / ink · `size`: md / sm · `full` |
| `Chip` | filter and option chip, controlled by `active` |
| `Field` | label + input/textarea/select, `as="textarea"`, shared pink focus |
| `Toggle` | 44×26 switch for notification prefs |
| `StatusBadge` | Available / Reserved / Sold / Completed / Cancelled / Empty |
| `StarRating` | read-only, or an input when you pass `onChange` |
| `PhotoSlot` | pass `src` for a real photo, omit for the hatched placeholder |
| `ListingCard` | the workhorse — photo, reserved scrim, condition badge, price, faculty, rating |
| `ListingGrid` | responsive grid + skeletons, `density="compact"` |
| `SellerTrustCard` | avatar, verified badge, rating, 3-stat row |
| `OrderTimeline` | `steps: [{ name, when, done }]` |
| `RateSellerDialog` | modal, returns `{ stars, text }` |
| `EmptyState` · `Skeleton` · `Toast` | |

**Layout** — `AppShell` (canvas + 1240px card), `TopNav` (desktop pink header),
`BottomTabs` (mobile 5-tab bar).

**Screens** — `LoginScreen`, `CatalogScreen`, `BrowseScreen`, `ListingScreen`, `SellScreen`,
`OrderScreen`, `ProfileScreen`, `AdminCategoriesScreen`.

**Hooks** — `useToast()` → `{ toast, flash }`; `useCatalogFilters(listings, query)` →
`{ filters, setFilters, results, counts, reset }` (client-side; swap the body for a server query,
keep the return shape).

## Two rules baked into the components

1. **`ProfileScreen` gates on `isSelf`.** Own profile shows Edit profile, ♥ Wishlist, + Sell, and
   the Purchases and Notifications tabs. Someone else's shows Chat with seller and Report, and only
   Listings + Reviews. Don't add a second component for this — pass the flag.
2. **`OrderScreen` never renders a QR for the buyer.** The buyer gets pickup details, the order
   reference, "Scan seller's QR", "Chat with seller" and Cancel. The QR lives on the seller's
   screen (not built this sprint).

## Before shipping

Every photo is a hatched placeholder until you pass `src` to `PhotoSlot` / `listing.photo`.
Glyphs are text characters (★ ♥ ⌕) — swap for your icon library. Copy is English-only; the font
already covers Thai. Mobile screens reuse the same components inside `BottomTabs` — build those
routes with the same props.


## Sprint 2 modules

| Screen | Requirements | Key props |
|---|---|---|
| `WishlistScreen` | FR 4.1–4.7 | `saved`, `autoRemoved`, `alerts`, `matches`, `onCreateAlert/onUpdateAlert/onDeleteAlert/onToggleAlert`, `onRemove` |
| `NotificationsScreen` | FR 6.1–6.4 | `notifications`, `prefs`, `prefItems`, `onOpen`, `onMarkAllRead`, `onTogglePref` |
| `ChatScreen` | FR 3.1–3.5 | `threads`, `activeId`, `typingId`, `compact`, `onSend(threadId, text)`, `onAttachPhoto`, `onToggleBlock`, `onReport` |
| `HandoverScreen` | FR 2.3–2.5 | `role`, `order`, `stage`, `codeError`, `onScan`, `onVerifyCode(code)`, `onCancelReservation` |
| `ReviewScreen` | FR 2.9 | `order` (locked unless Completed), `sellerStats`, `submitted`, `onSubmit({ stars, tags, text })` |
| `MyListingsScreen` | FR 5.2, 2.5 | `listings`, `reservations`, `onSave`, `onDelete`, `onShowQr`, `onCancelReservation` |
| `ReportScreen` | FR 7.1, 7.3 | `target`, `photos`, `onSubmit({ type, reason, text, photos, attachLinked })` |
| `AccountScreen` | FR 1.5–1.8 | `user`, `profile`, `sessions`, `myReports`, `blocked`, `openOrderRef`, `onLogout`, `onDeleteAccount` |
| `SuspendedScreen` | FR 7.7 | `suspension` — render when `GET /me` returns 423 |
| `ModerationScreen` | FR 7.4–7.9 | `cases`, `audit`, `categoriesTab`, `onStartReview/onDismiss/onRemoveListing/onSuspend` |
| `AdminCategoriesScreen` | FR 7.10–7.12 | `categories` (with `count`), `onCreate/onUpdate/onDelete/onMerge`, `embedded` |

New building blocks: `Segmented`, `Checkbox`, `Pill`, `Avatar`, `HandoverQr` (visual stand-in — swap for `qrcode.react`), and `useAutoMatch(listings, alerts)`.

Seed data lives in `src/data/mockModules.js`. `App.jsx` fakes the chat counterpart and the live audit feed with timers — replace `sendMessage` and the moderation `setInterval` with your WebSocket client.
