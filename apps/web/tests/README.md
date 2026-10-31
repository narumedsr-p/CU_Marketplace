# Home Auto-match regression checks

From the repository root:

```bash
pnpm --filter web test
pnpm --filter web build
```

The tests compile and render the actual Catalog/Wishlist components with React's
server renderer. No new test dependency, database, JWT or running backend is needed.
They cover real alert labels (no hard-coded example chips), keyword/new/all button
callbacks, empty/loading/error states, escaped keywords, selected-rule filtering,
paused/deleted rules and the empty create form.

These tests do **not** simulate DOM focus, browser navigation or backend persistence.
Check those separately in a browser:

1. With no rules, the home card shows an empty state and a working `+ new` button.
2. `+ new` opens `/wishlist?tab=alerts&new=1`, selects the Auto-match tab and focuses
   the empty keyword input. Creating a rule uses the existing match-rule API.
3. Return home: the card shows up to three account rules (the API returns newest
   first), with a View all entry when there are more. Paused rules are labelled.
4. Click a keyword: `/wishlist?tab=alerts&ruleId=...` highlights that alert and shows
   only its match cards. Show all alerts restores the full match list.
5. Refresh or use Back/Forward: the tab/selected rule comes from the URL, not stale
   form state. A new-route navigation resets an old edit/create draft.
6. Check paused and deleted/missing rule links, loading and API failure states.
7. Sign out and into another account: old alert labels must not carry over.

The homepage is wired to the same account alert state as Wishlist; no Backend API
or schema changes are included. Browser smoke checks can use a separate in-memory
mock API origin to avoid creating demo data; those checks do not prove persistence
against the deployed backend. A K3s installation needs a rebuilt/imported web image
and a web Deployment restart before these source changes appear on port 30080.
