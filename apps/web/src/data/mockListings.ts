import type {
  AccountProfile, AccountUser, AuditEntry, AutoMatchAlert, BlockedUser, ChatThread,
  CurrentUser, Listing, ModerationCase, MyReportSummary, NotificationItem, NotificationPrefDef,
  Purchase, Review, SellerReservation, Session,
} from '../types';

// Replace with your own fetch layer. Shape is what the components expect.
export const CATEGORIES = ['Electronics', 'Books', 'Apparel', 'Home', 'Stationery', 'Sports', 'Other'];
export const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'];
export const FACULTIES = ['Engineering', 'Science', 'Arts', 'Medicine', 'Business', 'Economics'];
export const SPOTS = ['Sala Phra Kiao', 'Chamchuri Square', 'Engineering Canteen', 'CU Dorm Lobby'];

export const CURRENT_USER: CurrentUser = {
  id: 'u0', name: 'Poonnawit Supawasuwat', memberType: 'Student',
  faculty: 'Engineering', joined: 'Aug 2025',
};

export const LISTINGS: Listing[] = [
  { id: 1, title: 'iPad Air 4 64GB, Wi-Fi, space grey', price: 8900, was: 11500, cat: 'Electronics', cond: 'Like new', faculty: 'Engineering', seller: 'Kannawich Munsak', rating: 4.9, reviewCount: 37, sold: 12, watchers: 28, posted: '2h ago', status: 'Available', spot: 'Sala Phra Kiao', handovers: 24, replyTime: '8 min', since: '2024', desc: 'Bought Aug 2024, used for lecture notes only. Battery health 94%, no dents. Includes original charger and a clear case.' },
  { id: 2, title: 'CU Engineering lab coat, size M', price: 250, was: 450, cat: 'Apparel', cond: 'Good', faculty: 'Engineering', seller: 'Sirawit Longjun', rating: 4.7, reviewCount: 19, sold: 6, watchers: 11, posted: '5h ago', status: 'Available', spot: 'Engineering Canteen', handovers: 9, replyTime: '22 min', since: '2025', desc: 'Worn for two semesters of chem lab. Washed, no stains, one small pen mark inside the pocket.' },
  { id: 3, title: 'Calculus I & II textbook bundle + solution manual', price: 400, was: 1200, cat: 'Books', cond: 'Good', faculty: 'Science', seller: 'Narumedsr Pitayachamrat', rating: 4.8, reviewCount: 26, sold: 14, watchers: 41, posted: '1d ago', status: 'Available', spot: 'Chamchuri Square', handovers: 17, replyTime: '15 min', since: '2024', desc: 'Both volumes, highlighting in the first three chapters only. Solution manual is clean.' },
  { id: 4, title: 'Dorm desk lamp, warm white, clip-on', price: 180, was: 320, cat: 'Home', cond: 'Like new', faculty: 'Arts', seller: 'Panat Lorchatchawankul', rating: 4.6, reviewCount: 12, sold: 4, watchers: 7, posted: '1d ago', status: 'Available', spot: 'CU Dorm Lobby', handovers: 5, replyTime: '40 min', since: '2025', desc: 'Three brightness levels, USB-C powered. Clip fits a standard dorm shelf.' },
  { id: 5, title: 'Wacom Intuos S drawing tablet with pen', price: 1450, was: 2790, cat: 'Electronics', cond: 'Good', faculty: 'Fine Arts', seller: 'Ploy Wanichkul', rating: 4.9, reviewCount: 44, sold: 21, watchers: 19, posted: '2d ago', status: 'Available', spot: 'Fine Arts Courtyard', handovers: 30, replyTime: '11 min', since: '2023', desc: 'Nib wear is normal, two spare nibs included. Light surface scratches, tracking unaffected.' },
  { id: 6, title: 'CU football jersey 2025, size L, unworn', price: 690, was: 890, cat: 'Apparel', cond: 'New', faculty: 'Sports Science', seller: 'Tanapat Chaiyo', rating: 4.5, reviewCount: 8, sold: 3, watchers: 22, posted: '2d ago', status: 'Available', spot: 'Sports Complex', handovers: 3, replyTime: '1 hr', since: '2025', desc: 'Ordered the wrong size. Tags still attached, never worn.' },
  { id: 7, title: 'Muji mechanical pencil set, 0.3 / 0.5 / 0.7', price: 120, was: 240, cat: 'Stationery', cond: 'New', faculty: 'Comm Arts', seller: 'Mint Rojanasakul', rating: 4.8, reviewCount: 15, sold: 9, watchers: 5, posted: '3d ago', status: 'Available', spot: 'Chamchuri Square', handovers: 11, replyTime: '18 min', since: '2024', desc: 'Duplicate gift set, still sealed. One lead refill tube per size.' },
  { id: 8, title: 'Casio fx-991EX scientific calculator', price: 550, was: 780, cat: 'Electronics', cond: 'Good', faculty: 'Engineering', seller: 'Kannawich Munsak', rating: 4.9, reviewCount: 37, sold: 12, watchers: 63, posted: '3d ago', status: 'Available', spot: 'Sala Phra Kiao', handovers: 24, replyTime: '8 min', since: '2024', desc: 'Exam sticker removed, all keys responsive, cover included.' },
  { id: 9, title: 'Hatari standing fan 16 inch, works fine', price: 420, was: 990, cat: 'Home', cond: 'Fair', faculty: 'Economics', seller: 'Beam Suksawat', rating: 4.2, reviewCount: 6, sold: 2, watchers: 4, posted: '4d ago', status: 'Available', spot: 'CU Dorm Lobby', handovers: 2, replyTime: '2 hr', since: '2025', desc: 'Three speeds, oscillation works. Base has a scuff, remote missing. Pickup only.' },
  { id: 10, title: 'Nintendo Switch OLED + 2 games', price: 8200, was: 12500, cat: 'Electronics', cond: 'Like new', faculty: 'Business', seller: 'Ice Thanawat', rating: 4.7, reviewCount: 23, sold: 8, watchers: 102, posted: '4d ago', status: 'Reserved', spot: 'Chamchuri Square', handovers: 12, replyTime: '25 min', since: '2024', desc: 'White Joy-Cons, no drift. Includes Mario Kart 8 and Zelda TotK, dock and cables.' },
  { id: 11, title: 'Anatomy atlas 8th edition, hardcover', price: 900, was: 2400, cat: 'Books', cond: 'Like new', faculty: 'Medicine', seller: 'Fah Ratchanon', rating: 5.0, reviewCount: 31, sold: 11, watchers: 34, posted: '5d ago', status: 'Available', spot: 'Faculty of Medicine', handovers: 15, replyTime: '30 min', since: '2023', desc: 'No writing anywhere, spine intact. Current edition used in the course.' },
  { id: 12, title: 'Chem lab safety goggles, anti-fog', price: 90, was: 180, cat: 'Other', cond: 'New', faculty: 'Science', seller: 'Narumedsr Pitayachamrat', rating: 4.8, reviewCount: 26, sold: 14, watchers: 3, posted: '6d ago', status: 'Available', spot: 'Science Building 1', handovers: 17, replyTime: '15 min', since: '2024', desc: 'Extra pair from the lab kit, never used. Fits over glasses.' },
];

export const PURCHASES: Purchase[] = [
  { id: 'p1', title: 'Casio fx-991EX scientific calculator', price: 550, seller: 'Kannawich Munsak', when: '12 Aug 2026', status: 'Completed', action: 'Rated ★★★★★', spot: 'Sala Phra Kiao' },
  { id: 'p2', title: 'Calculus I & II textbook bundle', price: 400, seller: 'Narumedsr Pitayachamrat', when: '28 Jul 2026', status: 'Completed', action: 'Rate seller', spot: 'Chamchuri Square' },
  { id: 'p3', title: 'Dorm desk lamp, warm white', price: 180, seller: 'Panat Lorchatchawankul', when: '19 Jul 2026', status: 'Cancelled', action: 'Buyer cancelled', spot: 'CU Dorm Lobby' },
  { id: 'p4', title: 'Muji mechanical pencil set', price: 120, seller: 'Mint Rojanasakul', when: '02 Jul 2026', status: 'Completed', action: 'Rated ★★★★☆', spot: 'Chamchuri Square' },
];

export const REVIEWS: Review[] = [
  { id: 'r1', name: 'Kannawich M.', item: 'Casio fx-991EX', when: '2 weeks ago', stars: 5, text: 'Replied fast, met at Sala Phra Kiao exactly on time. Item was cleaner than the photos.' },
  { id: 'r2', name: 'Mint R.', item: 'Desk lamp', when: 'last month', stars: 5, text: 'Honest about the scuff on the base. Easy handover, would buy again.' },
  { id: 'r3', name: 'Beam S.', item: 'Calculus bundle', when: 'last month', stars: 4, text: 'Good price for the bundle. Had to reschedule once but they were flexible.' },
];

export const NOTIFICATION_PREFS: NotificationPrefDef[] = [
  { key: 'chat', name: 'Chat messages', desc: 'New message from a buyer or seller' },
  { key: 'wishlist', name: 'Wishlist & auto-match', desc: 'A saved keyword matched a new listing' },
  { key: 'order', name: 'Order status', desc: 'Reserved, cancelled, expired, completed' },
  { key: 'promo', name: 'Campus announcements', desc: 'Faculty sale events and category drops' },
];

export const ACCOUNT_USER: AccountUser = {
  name: CURRENT_USER.name, memberType: CURRENT_USER.memberType,
  faculty: CURRENT_USER.faculty, email: '6731332321@student.chula.ac.th',
};

export const ACCOUNT_PROFILE: AccountProfile = {
  bio: 'Engineering year 2. Usually free after 4 pm near Sala Phra Kiao.',
  contact: 'LINE: poonnawit.s',
};

export const SESSIONS: Session[] = [
  { id: 's1', device: 'Chrome on macOS', meta: 'This device · Bangkok · active now' },
  { id: 's2', device: 'Safari on iPhone', meta: 'Bangkok · last active 2h ago' },
];

export const BLOCKED_USERS: BlockedUser[] = [
  { name: 'Win Prasert', since: '26 Sep 2026' },
];

export const NOTIFICATIONS: NotificationItem[] = [
  { id: 1, kind: 'match', category: 'Auto-match', group: 'today', read: false, time: '4 min', title: 'Auto-match: “fx-991”', body: 'Casio fx-991EX scientific calculator · ฿550 — posted by Kannawich M. at Sala Phra Kiao.', cta: 'View listing', channel: 'Push · delivered', action: { type: 'listing', id: 8 } },
  { id: 2, kind: 'chat', category: 'Chat', group: 'today', read: false, time: '18 min', title: 'Ploy W. replied', body: '“Yes, two spare nibs. Can meet at 5 at the Fine Arts courtyard?”', cta: 'Open chat', channel: 'In-app', action: { type: 'chat', id: 2 } },
  { id: 3, kind: 'order', category: 'Orders', group: 'today', read: false, time: '1 h', title: 'Pickup window closes at 19:00', body: 'Mint R.’s reservation on your standing fan expires today.', cta: 'View my listings', channel: 'Push', action: { type: 'mylistings' } },
  { id: 4, kind: 'account', category: 'Account', group: 'earlier', read: true, time: 'Mon', title: 'Your report was resolved', body: 'Case CASE-1031 “Replica jersey”: the listing was removed by a moderator.', cta: 'See my reports', channel: 'In-app', action: { type: 'account' } },
];

export const THREADS: ChatThread[] = [
  {
    id: 1, name: 'Kannawich Munsak', faculty: 'Engineering', online: true, presence: 'Online now', unread: 1, blocked: false,
    listing: { id: 1, title: 'iPad Air 4 64GB, Wi-Fi, space grey', price: 8900, status: 'Available' },
    messages: [
      { id: 'm1', from: 'them', text: 'Hi! Yes, it’s still available.', time: '14:02' },
      { id: 'm2', from: 'me', text: 'Great, can I pick it up today?', time: '14:05', status: 'Seen' },
    ],
  },
  {
    id: 2, name: 'Ploy Wanichkul', faculty: 'Fine Arts', online: false, presence: 'Active 1h ago', unread: 0, blocked: false,
    listing: { id: 5, title: 'Wacom Intuos S drawing tablet with pen', price: 1450, status: 'Available' },
    messages: [
      { id: 'm3', from: 'system', text: 'Chat started from the listing page' },
      { id: 'm4', from: 'them', text: '“Yes, two spare nibs. Can meet at 5 at the Fine Arts courtyard?”', time: '13:40' },
    ],
  },
];

export const RESERVATIONS: Record<number, SellerReservation> = {
  10: { buyer: 'Ice Thanawat', reference: 'ORD-2609-0131', window: 'Today 17:00–19:00', spot: 'Chamchuri Square' },
};

export const AUTO_MATCH_ALERTS: AutoMatchAlert[] = [
  { id: 1, text: 'fx-991', cat: 'Electronics', max: 700, on: true, liveMatches: 1 },
  { id: 2, text: 'lab coat M', cat: 'Any', on: true, liveMatches: 0 },
];

export const MODERATION_CASES: ModerationCase[] = [
  {
    id: 'CASE-1042', type: 'Listing', sev: 'High', state: 'Pending',
    title: '“Official” CU jersey 2025 at 3× retail', target: 'Jirayu Kaewmanee', targetFac: 'Economics',
    reason: 'Counterfeit or misleading', reporter: 'Mint R.', when: '12 min ago', count: 3,
    note: 'Tag photo shows a different logo from the co-op store.',
    evidence: [{ k: 'Listing photos', v: '4 photos · tag photo flagged' }, { k: 'Order history', v: '5 completed, 2 disputed' }],
    activeListings: 6, accountAge: '4 months', prior: '1 warning (Aug)',
  },
  {
    id: 'CASE-1031', type: 'Listing', sev: 'High', state: 'Closed',
    title: 'Replica CU jersey sold as official', target: 'Jirayu Kaewmanee', targetFac: 'Economics',
    reason: 'Counterfeit or misleading', reporter: 'You', when: 'Mon', count: 3,
    note: 'Print peeled after one wash.', evidence: [{ k: 'Listing photos', v: '2 photos' }],
    activeListings: 6, accountAge: '4 months', prior: 'none', resolution: 'Listing removed · seller warned.',
  },
];

export const AUDIT_LOG: AuditEntry[] = [
  { id: 'a1', t: '14:02', actor: 'You (admin)', code: 'REPORT_REVIEW', target: 'CASE-1042', detail: 'Pending → In review', kind: 'Moderation' },
  { id: 'a2', t: '09:14', actor: 'System', code: 'AUTOMATCH_EVAL', target: 'Listing #13', detail: '1 alert matched', kind: 'System' },
];

export const MY_REPORTS: MyReportSummary[] = [
  { id: 'CASE-1031', title: 'Replica CU jersey sold as official', state: 'Closed', reason: 'Counterfeit or misleading', when: 'Mon', resolution: 'Listing removed · seller warned.' },
];
