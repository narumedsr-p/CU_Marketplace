// Seed data for the modules added in sprint 2. Replace with your API layer — shapes are the
// contract the screens expect.

export const SESSIONS = [
  { id: 's1', device: 'Chrome on macOS', meta: 'This device · Bangkok · active now' },
  { id: 's2', device: 'Safari on iPhone', meta: 'Last active 2 h ago' },
];

export const AUTO_MATCH_ALERTS = [
  { id: 1, text: 'fx-991', cat: 'Any', max: 1000, on: true },
  { id: 2, text: 'lab coat', cat: 'Apparel', max: 400, on: true },
  { id: 3, text: 'switch', cat: 'Electronics', max: 7500, on: false },
];

export const NOTIFICATIONS = [
  { id: 1, kind: 'match', category: 'Auto-match', group: 'today', read: false, time: '4 min', title: 'Auto-match: “fx-991”', body: 'Casio fx-991EX scientific calculator · ฿550 — posted by Kannawich M. at Sala Phra Kiao.', cta: 'View listing', channel: 'Push · delivered', action: { type: 'listing', id: 8 } },
  { id: 2, kind: 'chat', category: 'Chat', group: 'today', read: false, time: '18 min', title: 'Ploy W. replied', body: '“Yes, two spare nibs. Can meet at 5 at the Fine Arts courtyard?”', cta: 'Open chat', channel: 'In-app', action: { type: 'chat', id: 2 } },
  { id: 3, kind: 'order', category: 'Orders', group: 'today', read: false, time: '1 h', title: 'Pickup window closes at 19:00', body: 'Mint R.’s reservation on your standing fan expires today. If not handed over, it returns to Available.', cta: 'View my listings', channel: 'Push · delivered after 1 retry', action: { type: 'mylistings' } },
  { id: 4, kind: 'price', category: 'Auto-match', group: 'today', read: true, time: '3 h', title: 'Price drop on a saved item', body: 'Anatomy atlas 8th edition is now ฿900 (was ฿1,100).', cta: 'View listing', channel: 'In-app', action: { type: 'listing', id: 11 } },
  { id: 5, kind: 'order', category: 'Orders', group: 'earlier', read: true, time: 'Yesterday', title: 'Handover confirmed', body: 'Calculus I & II textbook bundle — rate Narumedsr P. while it’s fresh.', cta: 'Rate seller', channel: 'Push · delivered', action: { type: 'review' } },
  { id: 6, kind: 'account', category: 'Account', group: 'earlier', read: true, time: 'Mon', title: 'Your report was resolved', body: 'Case CASE-1031 “Replica jersey”: the listing was removed by a moderator. Thanks for flagging it.', cta: 'See my reports', channel: 'In-app', action: { type: 'account' } },
  { id: 7, kind: 'match', category: 'Auto-match', group: 'earlier', read: true, time: 'Sun', title: 'Auto-match: “lab coat”', body: 'CU Engineering lab coat, size M · ฿250 — Engineering Canteen.', cta: 'View listing', channel: 'Push · delivered', action: { type: 'listing', id: 2 } },
];

// `replies` is demo-only — it drives the simulated counterpart in App.jsx.
export const THREADS = [
  { id: 1, name: 'Kannawich Munsak', faculty: 'Engineering', online: true, presence: 'Online now', unread: 0, blocked: false,
    listing: { id: 1, title: 'iPad Air 4 64GB, Wi-Fi, space grey', price: 8900, status: 'Available' },
    messages: [
      { id: 'm1', from: 'me', text: 'Hi, is the iPad still available?', time: '14:02' },
      { id: 'm2', from: 'them', text: 'Yes! Battery health is 94%, charger and case included.', time: '14:05' },
      { id: 'm3', from: 'me', image: true, time: '14:05' },
      { id: 'm4', from: 'me', text: 'Is the scratch in this photo on the back?', time: '14:06' },
      { id: 'm5', from: 'them', text: 'Only a hairline, you can’t feel it. Happy to show you at Sala Phra Kiao around 5.', time: '14:08' },
    ],
    replies: ['Sure, see you at 5.', 'I’ll bring the original box too.', 'Message me when you’re at the Sala.'] },
  { id: 2, name: 'Ploy Wanichkul', faculty: 'Fine Arts', online: true, presence: 'Online now', unread: 1, blocked: false,
    listing: { id: 5, title: 'Wacom Intuos S drawing tablet with pen', price: 1450, status: 'Available' },
    messages: [
      { id: 'm1', from: 'me', text: 'Are the spare nibs included?', time: '13:40' },
      { id: 'm2', from: 'them', text: 'Yes, two spare nibs. Can meet at 5 at the Fine Arts courtyard?', time: '13:52' },
    ],
    replies: ['Great, I’ll hold it for you.', 'Place the order whenever you’re ready.'] },
  { id: 3, name: 'Ice Thanawat', faculty: 'Business', online: false, presence: 'Active 1 h ago', unread: 0, blocked: false,
    listing: { id: 10, title: 'Nintendo Switch OLED + 2 games', price: 8200, status: 'Reserved' },
    messages: [
      { id: 'm1', from: 'me', text: 'Is the Switch still up for sale?', time: 'Yesterday' },
      { id: 'm2', from: 'them', text: 'Sorry, it’s reserved right now. I’ll message you if the buyer cancels.', time: 'Yesterday' },
    ],
    replies: ['Will let you know!'] },
  { id: 4, name: 'Mint Rojanasakul', faculty: 'Comm Arts', online: true, presence: 'Online now', unread: 0, blocked: false,
    listing: { id: 9, title: 'Hatari standing fan 16 inch, works fine', price: 420, status: 'Reserved' },
    messages: [
      { id: 'm1', from: 'system', text: 'Order ORD-2609-0139 placed · item reserved for Mint R.' },
      { id: 'm2', from: 'them', text: 'I’ll be at the dorm lobby at 17:30, is that ok?', time: '12:10' },
    ],
    replies: ['Perfect, see you then.', 'I’m at the lobby now.'] },
];

// Seller-side reservation on one of the current user's listings (drives MyListings + seller handover).
export const SELLER_RESERVATIONS = {
  9: { buyer: 'Mint R.', reference: 'ORD-2609-0139', handoverCode: 'RSA-9TQM-4L', window: 'Today 17:00–19:00', spot: 'CU Dorm Lobby' },
};

export const BLOCKED_USERS = [{ name: 'Win Prasert', since: '26 Sep 2026' }];

export const CASES = [
  { id: 'CASE-1042', type: 'Listing', sev: 'High', state: 'Pending', title: '“Official” CU jersey 2025 at 3× retail', target: 'Jirayu Kaewmanee', targetFac: 'Economics', reason: 'Counterfeit or misleading', reporter: 'Mint R.', when: '12 min ago', count: 3, note: 'Tag photo shows a different logo from the co-op store. A friend bought one and the print peeled after one wash.', evidence: [{ k: 'Listing photos', v: '4 photos · tag photo flagged' }, { k: 'Listing text', v: '“100% authentic, official supporter edition”' }, { k: 'Order history', v: '5 completed, 2 disputed' }], activeListings: 6, accountAge: '4 months', prior: '1 warning (Aug)' },
  { id: 'CASE-1041', type: 'Order', sev: 'High', state: 'Pending', title: 'ORD-2609-0131 · deposit demanded before handover', target: 'Win Prasert', targetFac: 'Law', reason: 'Off-platform payment request', reporter: 'Fah R.', when: '40 min ago', count: 1, note: 'Seller insisted on a bank-transfer deposit before meeting, then stopped replying.', evidence: [{ k: 'Chat log', v: '“Transfer ฿500 deposit first or I sell to someone else”' }, { k: 'Order history', v: 'Reserved 26 Sep · not handed over' }], activeListings: 3, accountAge: '2 months', prior: 'none' },
  { id: 'CASE-1040', type: 'User', sev: 'Medium', state: 'In review', title: 'Repeated no-show at handover', target: 'Top Kittisak', targetFac: 'Architecture', reason: 'No-show / unreliable', reporter: 'Kannawich M.', when: '3 h ago', count: 4, note: 'Third time reserving and not showing up — the item is locked for everyone else each time.', evidence: [{ k: 'Order history', v: '4 expired reservations in 30 days' }, { k: 'Chat log', v: 'No replies after reserving' }], activeListings: 0, accountAge: '1 year', prior: '1 warning' },
  { id: 'CASE-1039', type: 'Listing', sev: 'Medium', state: 'Pending', title: 'Midterm answer sheets 2301107', target: 'Anon Chaiwat', targetFac: 'Science', reason: 'Academic integrity', reporter: 'Staff · Faculty of Science', when: '5 h ago', count: 2, note: 'Listing claims to sell this term’s midterm answers.', evidence: [{ k: 'Listing photos', v: '2 photos' }, { k: 'Listing text', v: '“Answers for this term, PDF after handover”' }], activeListings: 2, accountAge: '8 months', prior: 'none' },
  { id: 'CASE-1036', type: 'Listing', sev: 'Low', state: 'Dismissed', title: 'Sharp rice cooker 1L', target: 'Beam Suksawat', targetFac: 'Economics', reason: 'Wrong category', reporter: 'Ice T.', when: 'Yesterday', count: 1, note: 'Should be in Electronics?', evidence: [{ k: 'Listing text', v: 'Category: Home' }], activeListings: 1, accountAge: '1 year', prior: 'none', resolution: 'Dismissed — Home is the correct category.' },
  { id: 'CASE-1033', type: 'User', sev: 'High', state: 'Closed', title: 'Fake QR shown at handover', target: 'Nop Srisuk', targetFac: 'Political Science', reason: 'Fraud', reporter: 'Panat L.', when: 'Sat', count: 2, note: 'Showed a screenshot QR from another order and asked for cash.', evidence: [{ k: 'Order history', v: 'CODE_MISMATCH ×3' }, { k: 'Chat log', v: '12 messages' }], activeListings: 0, accountAge: '3 months', prior: 'none', resolution: 'Suspended 30 days · sessions revoked · 2 listings hidden.' },
  { id: 'CASE-1031', mine: true, type: 'Listing', sev: 'High', state: 'Closed', title: 'Replica CU jersey sold as official', target: 'Jirayu Kaewmanee', targetFac: 'Economics', reason: 'Counterfeit or misleading', reporter: 'You', when: 'Mon', count: 3, note: 'Print peeled after one wash.', evidence: [{ k: 'Listing photos', v: '2 photos' }], activeListings: 6, accountAge: '4 months', prior: 'none', resolution: 'Listing removed · seller warned.' },
];

export const AUDIT_LOG = [
  { id: 'a1', t: '14:31', actor: 'System', code: 'AUTOMATCH_EVAL', target: 'Listing #1024', detail: '3 alerts matched · 3 notifications sent', kind: 'System' },
  { id: 'a2', t: '14:12', actor: 'Admin Panat L.', code: 'REPORT_REVIEW', target: 'CASE-1040', detail: 'Pending → In review', kind: 'Moderation' },
  { id: 'a3', t: '13:58', actor: 'System', code: 'NOTIF_RETRY', target: 'push · u_83f2', detail: 'Delivery failed, retry 2/3 scheduled', kind: 'System' },
  { id: 'a4', t: '13:20', actor: 'Admin Sirawit L.', code: 'CATEGORY_MERGE', target: 'Gadgets → Electronics', detail: '14 listings reassigned', kind: 'Categories' },
  { id: 'a5', t: '12:47', actor: 'System', code: 'ORDER_EXPIRE', target: 'ORD-2609-0119', detail: 'Pickup window passed · item back to Available', kind: 'System' },
  { id: 'a6', t: '11:05', actor: 'Admin Panat L.', code: 'LISTING_REMOVE', target: 'Listing #0998', detail: 'Prohibited item (alcohol)', kind: 'Moderation' },
  { id: 'a7', t: '09:30', actor: 'Admin Sirawit L.', code: 'USER_SUSPEND', target: 'Nop Srisuk', detail: '30 days · sessions revoked · CASE-1033', kind: 'Moderation' },
];

// Demo-only: events the reference App streams into the audit log to show the live state.
export const LIVE_EVENTS = [
  { actor: 'System', code: 'ORDER_EXPIRE', target: 'ORD-2609-0127', detail: 'Pickup window passed · item back to Available', kind: 'System' },
  { actor: 'System', code: 'AUTOMATCH_EVAL', target: 'Listing #1031', detail: '1 alert matched · 1 notification sent', kind: 'System' },
  { actor: 'System', code: 'NOTIF_FAILED', target: 'push · u_19ab', detail: '3/3 retries failed · logged', kind: 'System' },
  { actor: 'System', code: 'ORDER_COMPLETE', target: 'ORD-2609-0150', detail: 'QR scanned · listing Sold', kind: 'System' },
];

export const DEMO_SUSPENSION = {
  until: '4 Oct 2026', since: '27 Sep 2026', duration: '7 days', caseId: 'CASE-1042',
  reason: 'Selling counterfeit goods — CU jersey listed as “official”.', permanent: false,
};

export const HIGH_SEVERITY_REASONS = [
  'Counterfeit or misleading', 'Prohibited item', 'Scam or suspicious price', 'Fraud', 'Harassment',
  'Off-platform payment request', 'Fake QR / handover issue',
];
