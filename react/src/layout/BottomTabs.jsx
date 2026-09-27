import { color, font } from '../theme/tokens';

const TABS = [
  { key: 'home', name: 'Home', initial: 'H' },
  { key: 'browse', name: 'Browse', initial: 'B' },
  { key: 'sell', name: 'Sell', initial: '+' },
  { key: 'orders', name: 'Orders', initial: 'O' },
  { key: 'profile', name: 'Me', initial: 'M' },
];

// Mobile shell. Fixed bottom bar, 44px+ hit targets, safe-area padding.
export default function BottomTabs({ active, onChange }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
      background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid ' + color.lineSoft,
      padding: '9px 8px calc(30px + env(safe-area-inset-bottom))',
      display: 'flex', alignItems: 'flex-start',
    }}>
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <div key={t.key} onClick={() => onChange(t.key)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, cursor: 'pointer', padding: '4px 0', minHeight: 44,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: on ? color.pink : '#F7EEF2',
              display: 'grid', placeItems: 'center',
              font: `700 11px/1 ${font}`, color: on ? color.white : color.faint,
            }}>{t.initial}</div>
            <div style={{
              font: `600 10px/1.2 ${font}`, color: on ? color.pink : color.faint,
              whiteSpace: 'nowrap',
            }}>{t.name}</div>
          </div>
        );
      })}
    </div>
  );
}
