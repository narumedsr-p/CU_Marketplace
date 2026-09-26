import { color, font } from '../theme/tokens';
import type { TimelineStep } from '../types';

interface OrderTimelineProps {
  steps: TimelineStep[];
}

export default function OrderTimeline({ steps }: OrderTimelineProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {steps.map((s, i) => (
        <div key={s.name} style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: s.done ? color.pink : '#E9D3DD',
              border: '2px solid ' + color.white,
              boxShadow: '0 0 0 1.5px ' + (s.done ? color.pink : '#E9D3DD'),
            }} />
            {i < steps.length - 1 && (
              <div style={{
                width: 2, flex: 1, minHeight: 22,
                background: s.done ? '#F6C7DA' : '#F2E4EA',
              }} />
            )}
          </div>
          <div style={{ paddingBottom: 14 }}>
            <div style={{ font: `600 13.5px/1.3 ${font}`, color: s.done ? color.ink : color.faint }}>
              {s.name}
            </div>
            <div style={{ font: `400 12px/1.5 ${font}`, color: color.faint, marginTop: 3 }}>
              {s.when}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
