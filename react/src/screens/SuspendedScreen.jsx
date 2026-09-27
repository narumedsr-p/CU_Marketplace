import { color, font, labelStyle } from '../theme/tokens';
import Button from '../components/Button';

/**
 * Shown instead of the catalog when GET /me returns 423 (FR 7.7).
 *   suspension { until, reason, caseId, since, duration, permanent }
 */
export default function SuspendedScreen({ suspension, supportEmail = 'trust@rachasa.chula.ac.th', onBack }) {
  const s = suspension;
  return (
    <div style={{ minHeight: '100vh', background: '#FCF8FA', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 470, background: color.white, border: '1px solid ' + color.line, borderRadius: 16, padding: '28px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: color.pink, display: 'grid', placeItems: 'center', font: `700 14px/1 ${font}`, color: color.white }}>R</div>
          <div style={{ font: `700 16px/1 ${font}` }}>RachaSA</div>
        </div>
        <div style={{ display: 'inline-block', marginTop: 22, padding: '4px 9px', borderRadius: 6, background: '#FDECEF', color: '#A11B3C', font: `600 11px/1.4 ${font}`, letterSpacing: '.08em' }}>
          {s.permanent ? 'ACCOUNT BANNED' : 'ACCOUNT SUSPENDED'}
        </div>
        <div style={{ font: `700 23px/1.25 ${font}`, letterSpacing: '-.01em', marginTop: 12, textWrap: 'pretty' }}>
          {s.permanent ? 'This account can no longer sign in' : `You can't sign in until ${s.until}`}
        </div>
        <div style={{ marginTop: 16, padding: '14px 15px', borderRadius: 11, background: color.canvas }}>
          <div style={labelStyle}>Reason from the moderator</div>
          <div style={{ font: `500 14px/1.55 ${font}`, marginTop: 8 }}>{s.reason}</div>
          <div style={{ font: `500 12px/1.5 ${font}`, color: color.muted, marginTop: 6 }}>
            Case {s.caseId} · suspended {s.since}{s.duration ? ' · ' + s.duration : ''}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 16, font: `400 13px/1.5 ${font}`, color: color.body }}>
          <div>· All active sessions were signed out.</div>
          <div>· Your listings are hidden and reserved orders were cancelled.</div>
          {!s.permanent && <div>· Access returns automatically when the suspension ends.</div>}
        </div>
        <div style={{ font: `400 12.5px/1.6 ${font}`, color: color.muted, marginTop: 16, textWrap: 'pretty' }}>
          Think this is a mistake? Email <a href={'mailto:' + supportEmail} style={{ color: color.pink }}>{supportEmail}</a> with your case ID.
        </div>
        <Button full variant="ghost" onClick={onBack} style={{ marginTop: 20 }}>Back to sign in</Button>
      </div>
    </div>
  );
}
