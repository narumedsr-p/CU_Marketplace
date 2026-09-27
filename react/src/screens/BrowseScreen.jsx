import { color, font, baht, labelStyle } from '../theme/tokens';
import Chip from '../components/Chip';
import ListingGrid from '../components/ListingGrid';
import EmptyState from '../components/EmptyState';

const SORTS = ['Newest', 'Price', 'Most viewed'];

// Search results with the sticky filter sidebar.
export default function BrowseScreen({
  results, filters, onFilterChange, categories, conditions, faculties,
  counts = {}, totalCount = 0, query, onOpenListing, onReset, loading,
}) {
  const set = (patch) => onFilterChange({ ...filters, ...patch });
  const heading = query ? `Results for “${query}”`
    : filters.cat === 'All' ? 'All listings' : filters.cat;
  const summary = [
    filters.cat === 'All' ? 'any category' : filters.cat,
    filters.cond === 'Any' ? 'any condition' : filters.cond,
    'under ' + baht(filters.maxPrice),
  ].join(' · ');

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '248px minmax(0,1fr)',
      gap: 22, padding: '22px 24px 40px', alignItems: 'start',
    }}>
      <aside style={{
        border: '1px solid ' + color.line, borderRadius: 12, padding: '16px 16px 18px',
        position: 'sticky', top: 90,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ font: `700 14px/1 ${font}` }}>Filters</div>
          <div onClick={onReset} style={{ font: `500 11.5px/1 ${font}`, color: color.pink, cursor: 'pointer' }}>
            Reset
          </div>
        </div>

        <div style={{ ...labelStyle, margin: '18px 0 9px' }}>Category</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {['All', ...categories].map((c) => {
            const on = filters.cat === c;
            return (
              <div key={c} onClick={() => set({ cat: c })} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 9px', borderRadius: 7, cursor: 'pointer',
                background: on ? color.pink : 'transparent',
                color: on ? color.white : color.body, font: `500 12.5px/1.3 ${font}`,
              }}>
                <span>{c}</span>
                <span style={{
                  font: `500 11px/1.3 ${font}`, color: on ? 'rgba(255,255,255,.75)' : color.faint,
                }}>{c === 'All' ? totalCount : (counts[c] || 0)}</span>
              </div>
            );
          })}
        </div>

        <div style={{ ...labelStyle, margin: '18px 0 9px' }}>Condition</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Any', ...conditions].map((c) => (
            <Chip key={c} size="sm" active={filters.cond === c} onClick={() => set({ cond: c })}>{c}</Chip>
          ))}
        </div>

        <div style={{ ...labelStyle, margin: '18px 0 9px' }}>Max price</div>
        <input
          type="range" min={90} max={9000} step={10} value={filters.maxPrice}
          onChange={(e) => set({ maxPrice: Number(e.target.value) })}
          style={{ width: '100%', accentColor: color.pink }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          font: `500 11.5px/1.3 ${font}`, color: color.muted, marginTop: 5,
        }}>
          <span>{baht(90)}</span>
          <span style={{ color: color.pink, fontWeight: 700 }}>up to {baht(filters.maxPrice)}</span>
        </div>

        <div style={{ ...labelStyle, margin: '18px 0 9px' }}>Faculty</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Any', ...faculties].map((c) => (
            <Chip key={c} size="sm" active={filters.faculty === c} onClick={() => set({ faculty: c })}>{c}</Chip>
          ))}
        </div>
      </aside>

      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 14, flexWrap: 'wrap', paddingBottom: 14,
        }}>
          <div>
            <div style={{ font: `700 19px/1.2 ${font}`, letterSpacing: '-.01em' }}>{heading}</div>
            <div style={{ font: `400 13px/1.5 ${font}`, color: color.muted, marginTop: 4 }}>
              {results.length} results · {summary}
            </div>
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 3, background: color.pinkTint,
            border: '1px solid ' + color.pinkLine, borderRadius: 9, padding: 3,
          }}>
            {SORTS.map((s) => {
              const on = filters.sort === s;
              return (
                <div key={s} onClick={() => set({ sort: s })} style={{
                  padding: '7px 12px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
                  font: `600 12px/1.2 ${font}`,
                  background: on ? color.white : 'transparent',
                  color: on ? color.pink : color.muted,
                }}>{s}</div>
              );
            })}
          </div>
        </div>

        {results.length === 0 && !loading ? (
          <EmptyState
            title="Nothing matches yet"
            body="Save it as an auto-match and we will notify you when it is posted."
            actionLabel={query ? `Create auto-match for “${query}”` : 'Create an auto-match'}
          />
        ) : (
          <ListingGrid listings={results} onOpen={onOpenListing} loading={loading} showFaculty={false} />
        )}
      </div>
    </div>
  );
}
