import { color, font } from '../theme/tokens';
import ListingGrid from '../components/ListingGrid';
import Button from '../components/Button';

// Category rail + two promo panels + the newest-first feed.
export default function CatalogScreen({
  listings, categories, onOpenListing, onPickCategory, onSeeAll, loading, density,
}) {
  return (
    <div style={{ padding: '0 0 40px' }}>
      <div className="rsa-scroll" style={{ display: 'flex', gap: 10, padding: '20px 24px 6px', overflowX: 'auto' }}>
        {categories.map((c) => (
          <div key={c} onClick={() => onPickCategory(c)} style={{
            flex: 'none', width: 88, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 4px', borderRadius: 12,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: color.pinkTint,
              border: '1px solid ' + color.pinkLine, display: 'grid', placeItems: 'center',
              font: `700 15px/1 ${font}`, color: color.pink,
            }}>{c[0]}</div>
            <div style={{ font: `500 11.5px/1.3 ${font}`, color: color.body, textAlign: 'center' }}>{c}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 14 }}>
          <div style={{
            borderRadius: 14, padding: '26px 28px', background: color.pinkTint,
            border: '1px solid ' + color.pinkLine, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', minHeight: 150,
          }}>
            <div style={{ font: `600 11.5px/1 ${font}`, letterSpacing: '.12em', color: color.pink }}>
              SEMESTER TURNOVER
            </div>
            <div style={{
              font: `700 27px/1.18 ${font}`, marginTop: 10, letterSpacing: '-.01em',
              maxWidth: '18em', textWrap: 'pretty',
            }}>Textbooks from last term, priced by the people who passed the course</div>
            <Button size="sm" onClick={() => onPickCategory('Books')} style={{ marginTop: 16, alignSelf: 'flex-start' }}>
              Browse books
            </Button>
          </div>

          <div style={{
            borderRadius: 14, padding: '22px 24px', background: color.ink, color: color.white,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 150,
          }}>
            <div>
              <div style={{ font: `600 11.5px/1 ${font}`, letterSpacing: '.12em', color: color.pinkGlow }}>
                AUTO-MATCH
              </div>
              <div style={{ font: `600 16px/1.4 ${font}`, marginTop: 9, textWrap: 'pretty' }}>
                Tell us the keyword. We ping you the second it is posted.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
              {['"fx-991"', '"lab coat M"', '+ new'].map((k) => (
                <div key={k} style={{
                  padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,.12)',
                  font: `500 11.5px/1.4 ${font}`, whiteSpace: 'nowrap',
                }}>{k}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '30px 24px 14px', gap: 14, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ font: `700 19px/1.2 ${font}`, letterSpacing: '-.01em' }}>Fresh on campus</div>
          <div style={{ font: `400 13px/1.5 ${font}`, color: color.muted, marginTop: 4 }}>
            {listings.length} available listings · sorted by newest
          </div>
        </div>
        <div onClick={onSeeAll} style={{ font: `600 13px/1 ${font}`, color: color.pink, cursor: 'pointer' }}>
          See all →
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        <ListingGrid listings={listings} onOpen={onOpenListing} loading={loading} density={density} />
      </div>
    </div>
  );
}
