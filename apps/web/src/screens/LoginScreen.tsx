import { color, font, gradient } from '../theme/tokens';
import Button from '../components/Button';

const STATS: [string, string][] = [
  ['1,842', 'ACTIVE LISTINGS'],
  ['19', 'FACULTIES'],
  ['4.8★', 'AVG SELLER'],
];

interface LoginScreenProps {
  onSignIn: () => void;
}

export default function LoginScreen({ onSignIn }: LoginScreenProps) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,.95fr)',
      minHeight: 620, borderRadius: 15, overflow: 'hidden',
    }}>
      <div style={{
        background: color.pink, backgroundImage: gradient, padding: '52px 48px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: color.white,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, background: color.white,
            display: 'grid', placeItems: 'center', font: `700 15px/1 ${font}`, color: color.pink,
          }}>R</div>
          <div style={{ font: `700 17px/1 ${font}` }}>RachaSA</div>
        </div>

        <div>
          <div style={{
            font: `700 46px/1.08 ${font}`, letterSpacing: '-.02em',
            maxWidth: '9em', textWrap: 'pretty',
          }}>One campus. One marketplace.</div>
          <div style={{
            font: `400 16px/1.6 ${font}`, color: 'rgba(255,255,255,.82)',
            marginTop: 18, maxWidth: '26em', textWrap: 'pretty',
          }}>
            Buy and sell inside Chula — with people whose faculty, rating and handover
            history you can actually see.
          </div>
          <div style={{ display: 'flex', gap: 26, marginTop: 34 }}>
            {STATS.map(([v, k]) => (
              <div key={k}>
                <div style={{ font: `700 24px/1 ${font}` }}>{v}</div>
                <div style={{
                  font: `500 11.5px/1.4 ${font}`, color: 'rgba(255,255,255,.68)',
                  letterSpacing: '.06em', marginTop: 5,
                }}>{k}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ font: `400 12px/1.5 ${font}`, color: 'rgba(255,255,255,.6)' }}>
          PDPA-compliant · Chula members only
        </div>
      </div>

      <div style={{ padding: '52px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ font: `700 27px/1.2 ${font}`, letterSpacing: '-.01em' }}>Sign in</div>
        <div style={{ font: `400 14.5px/1.6 ${font}`, color: color.muted, marginTop: 9 }}>
          Accounts are created only from a verified Chula email domain.
        </div>

        <Button onClick={onSignIn} full style={{
          marginTop: 28, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 11,
        }}>
          <span style={{
            width: 20, height: 20, borderRadius: 5, background: color.white,
            display: 'grid', placeItems: 'center', font: `700 11px/1 ${font}`, color: color.pink,
          }}>G</span>
          Continue with Chula Google
        </Button>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['@student.chula.ac.th', '@chula.ac.th'].map((d) => (
            <div key={d} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              font: `500 12.5px/1.5 ${font}`, color: color.muted,
            }}>
              <span style={{ color: color.pink }}>✓</span>{d}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 26, padding: '15px 17px', borderRadius: 11,
          background: color.pinkTint, border: '1px solid ' + color.pinkLine,
        }}>
          <div style={{ font: `600 12.5px/1.4 ${font}`, color: '#A81756' }}>First sign-in</div>
          <div style={{
            font: `400 12.5px/1.6 ${font}`, color: color.muted, marginTop: 5, textWrap: 'pretty',
          }}>
            Your profile is generated from the directory — name, member type, faculty and photo.
            You can edit contact and bio later.
          </div>
        </div>
      </div>
    </div>
  );
}
