import type { ReactNode } from 'react';
import { color, font } from '../theme/tokens';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import type { AdminCategory } from '../types';

interface AdminCategoriesScreenProps {
  categories: AdminCategory[];
  selected?: string[];
  onToggleSelect?: (slug: string) => void;
  onNew: () => void;
  onMerge: () => void;
  onEdit?: (category: AdminCategory) => void;
}

// categories: [{ id, name, slug, count }]
export default function AdminCategoriesScreen({
  categories, selected = [], onToggleSelect, onNew, onMerge, onEdit,
}: AdminCategoriesScreenProps) {
  const head = {
    background: color.pinkTint, padding: '11px 15px',
    font: `600 10.5px/1.4 ${font}`, letterSpacing: '.1em', color: '#A81756',
  };
  const cell = { background: color.white, padding: '13px 15px', display: 'flex', alignItems: 'center' };

  return (
    <div style={{ padding: '22px 24px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{
          padding: '3px 8px', borderRadius: 6, background: color.ink, color: color.white,
          font: `600 10px/1.5 ${font}`, letterSpacing: '.08em',
        }}>ADMIN</div>
        <div style={{ font: `700 22px/1.2 ${font}`, letterSpacing: '-.01em' }}>Category manager</div>
      </div>
      <div style={{ font: `400 13.5px/1.6 ${font}`, color: color.muted, marginTop: 6 }}>
        Create, edit and merge categories. Every action is written to the moderation audit trail.
      </div>

      <div style={{ display: 'flex', gap: 9, marginTop: 18, flexWrap: 'wrap' }}>
        <Button size="sm" onClick={onNew}>+ New category</Button>
        <Button size="sm" variant="ghost" onClick={onMerge}>Merge selected</Button>
      </div>

      <div style={{
        border: '1px solid ' + color.lineSoft, borderRadius: 12, overflow: 'hidden', marginTop: 16,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 1fr 1fr 1fr 110px',
          gap: 1, background: color.lineSoft,
        }}>
          {['CATEGORY', 'SLUG', 'LISTINGS', 'STATUS', 'ACTION'].map((h) => (
            <div key={h} style={head}>{h}</div>
          ))}

          {categories.map((c) => (
            <Fragmentish key={c.id || c.slug}>
              <div style={{ ...cell, gap: 10, font: `600 13.5px/1.3 ${font}` }}>
                <input
                  type="checkbox"
                  checked={selected.includes(c.slug)}
                  onChange={() => onToggleSelect && onToggleSelect(c.slug)}
                  style={{ width: 15, height: 15, accentColor: color.pink, flex: 'none' }}
                />
                {c.name}
              </div>
              <div style={{ ...cell, font: '500 12.5px/1.3 ui-monospace,monospace', color: color.muted }}>
                {c.slug}
              </div>
              <div style={{ ...cell, font: `500 13px/1.3 ${font}` }}>{c.count}</div>
              <div style={cell}><StatusBadge status={c.count > 0 ? 'Available' : 'Empty'} /></div>
              <div style={cell}>
                <span onClick={() => onEdit && onEdit(c)} style={{
                  font: `600 12.5px/1 ${font}`, color: color.pink, cursor: 'pointer',
                }}>Edit</span>
              </div>
            </Fragmentish>
          ))}
        </div>
      </div>

      <div style={{ font: `400 12px/1.6 ${font}`, color: color.faint, marginTop: 12 }}>
        Deleting or merging a category reassigns its listings — the affected count is shown for
        confirmation before the action commits.
      </div>
    </div>
  );
}

// Grid children must be direct siblings; this keeps the row grouped in source only.
function Fragmentish({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
