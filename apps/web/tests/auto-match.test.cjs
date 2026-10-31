const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Compile the actual presentational components without adding a test framework.
const src = path.resolve(__dirname, '../src');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = new Module(file);
  loaded.filename = file;
  loaded.paths = Module._nodeModulePaths(path.dirname(file));
  cache.set(file, loaded);
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = name => {
    if (name.startsWith('.')) {
      const base = path.resolve(path.dirname(file), name);
      const candidate = [base, `${base}.ts`, `${base}.tsx`].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      if (candidate && /\.tsx?$/.test(candidate)) return load(candidate);
    }
    return originalRequire(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file,
  }).outputText, file);
  return loaded.exports;
}

const Catalog = load(path.join(src, 'screens/CatalogScreen.tsx')).default;
const Wishlist = load(path.join(src, 'screens/WishlistScreen.tsx')).default;
const alerts = [
  { id: 'rule-1', text: 'MacBook', cat: 'Electronics', on: true },
  { id: 'rule-2', text: 'Calculus', cat: 'Books', on: true },
  { id: 'rule-3', text: 'Dorm lamp', cat: 'Any', on: false },
  { id: 'rule-4', text: 'Headphones', cat: 'Any', on: true },
];
const catalogProps = { listings: [], categories: [], alerts, onOpenListing() {}, onPickCategory() {},
  onSeeAll() {}, onOpenAutoMatch() {}, onNewAutoMatch() {} };
const wishlistProps = { initialTab: 'alerts', alerts, categories: [], onRetry: async () => {},
  onOpenListing() {}, onRemove: async () => {}, onBrowse() {}, onShowAllAlerts() {},
  onCreateAlert: async () => {}, onUpdateAlert: async () => {}, onDeleteAlert: async () => {},
  onToggleAlert: async () => {}, matches: [
    { id: 'hit-1', ruleId: 'rule-1', keyword: 'MacBook', listing: { id: 'item-1', title: 'Matching laptop', cat: 'Electronics', price: 100 } },
    { id: 'hit-2', ruleId: 'rule-2', keyword: 'Calculus', listing: { id: 'item-2', title: 'Matching textbook', cat: 'Books', price: 50 } },
  ] };
const html = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
function buttons(element) {
  if (!element || typeof element !== 'object') return [];
  const children = React.Children.toArray(element.props?.children);
  return [...(element.type === 'button' ? [element] : []), ...children.flatMap(buttons)];
}

test('home shows real account alerts, marks paused rules, and links the overflow', () => {
  const output = html(Catalog, catalogProps);
  assert.match(output, /MacBook/);
  assert.match(output, /Calculus/);
  assert.match(output, /Dorm lamp.*Paused/);
  assert.match(output, /View all \(4\)/);
  assert.doesNotMatch(output, /fx-991|lab coat M|Headphones/);
});

test('home keyword buttons pass their rule ID; + new and view all have handlers', () => {
  const opened = [];
  let created = 0;
  const rendered = Catalog({ ...catalogProps,
    onOpenAutoMatch: id => opened.push(id), onNewAutoMatch: () => created++ });
  const controls = buttons(rendered);
  for (const button of controls) button.props.onClick();
  assert.deepEqual(opened, ['rule-1', 'rule-2', 'rule-3', undefined]);
  assert.equal(created, 1);
  assert.ok(controls.every(button => button.props.type === 'button'));
});

test('empty account never displays example alerts and still offers + new', () => {
  const output = html(Catalog, { ...catalogProps, alerts: [] });
  assert.match(output, /No alerts yet/);
  assert.match(output, /Add a new auto-match alert/);
  assert.doesNotMatch(output, /View auto-match for|fx-991|lab coat M/);
});

test('loading does not pretend an account has no alerts', () => {
  const output = html(Catalog, { ...catalogProps, alerts: [], alertsLoading: true });
  assert.match(output, /Loading your alerts/);
  assert.doesNotMatch(output, /No alerts yet/);
});

test('load error has a working management entry point, not an empty-success message', () => {
  const output = html(Catalog, { ...catalogProps, alerts: [], alertsError: 'Unavailable' });
  assert.match(output, /Could not refresh your alerts/);
  assert.match(output, /Open Auto-match/);
  assert.doesNotMatch(output, /No alerts yet/);
});

test('keywords are escaped as text, not injected HTML', () => {
  const output = html(Catalog, { ...catalogProps, alerts: [{ ...alerts[0], text: '<script>alert(1)</script>' }] });
  assert.match(output, /&lt;script&gt;/);
  assert.doesNotMatch(output, /<script>/);
});

test('selected alert filters match cards by rule ID', () => {
  const output = html(Wishlist, { ...wishlistProps, selectedAlertId: 'rule-1' });
  assert.match(output, /Selected alert: “MacBook”/);
  assert.match(output, /Matching laptop/);
  assert.doesNotMatch(output, /Matching textbook/);
  assert.match(output, /Show all alerts/);
});

test('all-alerts view keeps results from different rules', () => {
  const output = html(Wishlist, wishlistProps);
  assert.match(output, /Matching laptop/);
  assert.match(output, /Matching textbook/);
  assert.doesNotMatch(output, /Selected alert:/);
});

test('paused selected rule has its own empty state', () => {
  const output = html(Wishlist, { ...wishlistProps, selectedAlertId: 'rule-3' });
  assert.match(output, /This alert is paused/);
  assert.doesNotMatch(output, /Matching laptop|Matching textbook/);
});

test('unknown or deleted selected rule safely falls back to all matches', () => {
  const output = html(Wishlist, { ...wishlistProps, selectedAlertId: 'missing' });
  assert.match(output, /This alert is no longer available/);
  assert.match(output, /Matching laptop/);
  assert.match(output, /Matching textbook/);
});

test('new-alert view contains an empty named input and the create action', () => {
  const output = html(Wishlist, { ...wishlistProps, focusNewAlert: true });
  assert.match(output, /aria-label="New auto-match keyword"/);
  assert.match(output, /value=""/);
  assert.match(output, /Create alert/);
  assert.doesNotMatch(output, /Selected alert:|Save changes/);
});
