import { useState, type FormEvent, type ReactNode, type ChangeEvent } from 'react';
import { color, font, baht, labelStyle, card, pageTitle, pageSub, shortName } from '../theme/tokens';
import Segmented from '../components/Segmented';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import PhotoSlot from '../components/PhotoSlot';
import HandoverQr from '../components/HandoverQr';
import type { HandoverOrder, HandoverRole, HandoverStage } from '../types';

const CHECKS: Record<HandoverRole, string[]> = {
  buyer: ['Item matches the listing photos', 'You tested that it works', 'Entering the code completes the sale — only enter it when satisfied'],
  seller: ['Bring the item and its accessories', 'Let the buyer inspect it before giving the code', 'Only share the code in person'],
};

interface HandoverScreenProps {
  role?: HandoverRole;
  onRoleChange?: (role: HandoverRole) => void;
  order: HandoverOrder;
  stage?: HandoverStage;
  error?: string | null;
  codeLoading?: boolean;
  onVerifyCode: (code: string) => void;
  onCancelReservation?: () => void;
  onChat: () => void;
  onRate: () => void;
  onHome: () => void;
}

// QR handover (FR 2.3–2.5). The SELLER shows the QR; the BUYER scans it.
export default function HandoverScreen({
  role = 'buyer', onRoleChange, order, stage = 'ready', error, codeLoading,
  onVerifyCode, onCancelReservation, onChat, onRate, onHome,
}: HandoverScreenProps) {
  const [code, setCode] = useState('');
  const [checks, setChecks] = useState([false, false, false]);
  const isSeller = role === 'seller';
  const done = stage === 'done';
  const verifying = stage === 'verifying';

  const doneBlock = (title: string, body: string, actions?: ReactNode) => (
    <div style={{ padding: '26px 6px', textAlign: 'center' }}>
      <div style={{ width: 62, height: 62, borderRadius: '50%', background: '#EAF7EE', color: '#1E7A44', display: 'grid', placeItems: 'center', font: `700 28px/1 ${font}`, margin: '0 auto' }}>✓</div>
      <div style={{ font: `700 19px/1.3 ${font}`, marginTop: 14 }}>{title}</div>
      <div style={{ font: `400 13px/1.6 ${font}`, color: color.muted, marginTop: 6 }}>{body}</div>
      {actions}
    </div>
  );

  const corner = (pos: string) => ({
    position: 'absolute' as const, width: 28, height: 28, borderColor: color.pinkLight, borderStyle: 'solid' as const, borderWidth: 0,
    ...(pos.includes('t') ? { top: '18%', borderTopWidth: 3 } : { bottom: '18%', borderBottomWidth: 3 }),
    ...(pos.includes('l') ? { left: '18%', borderLeftWidth: 3 } : { right: '18%', borderRightWidth: 3 }),
  });

  return (
    <div style={{ padding: '22px 24px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={pageTitle}>Handover · {order.reference}</div>
          <div style={pageSub}>The seller shows the handover code. The buyer enters it to close the order.</div>
        </div>
        {onRoleChange && (
          <Segmented value={role} onChange={(v) => onRoleChange(v as HandoverRole)} options={[{ value: 'buyer', label: 'I’m the buyer' }, { value: 'seller', label: 'I’m the seller' }]} />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 18, marginTop: 18, alignItems: 'start' }}>
        <div style={{ ...card, borderRadius: 14, padding: isSeller ? 22 : 18, textAlign: isSeller ? 'center' : 'left' }}>
          {isSeller && !done && (
            <>
              <div style={labelStyle}>Handover code</div>
              {codeLoading ? (
                <div style={{ font: `500 13px/1.6 ${font}`, color: color.muted, padding: '28px 0' }}>Generating code…</div>
              ) : error ? (
                <div style={{ font: `500 13px/1.6 ${font}`, color: '#A11B3C', padding: '28px 0' }}>{error}</div>
              ) : (
                <>
                  <div style={{ marginTop: 14 }}>
                    <HandoverQr code={order.handoverCode} />
                  </div>
                  <div style={{
                    font: `700 22px/1.5 ui-monospace, monospace`, letterSpacing: '.08em', marginTop: 14,
                    padding: '16px 12px', borderRadius: 12, border: '1px solid ' + color.line, wordSpacing: '.2em',
                  }}>{order.handoverCode}</div>
                  <div style={{ font: `400 12.5px/1.6 ${font}`, color: color.muted, marginTop: 10, textWrap: 'pretty' }}>
                    Give this code to {order.buyer} after they check the item. It works once. This page updates when the sale completes.
                  </div>
                </>
              )}
              {onCancelReservation && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
                  <Button size="sm" variant="ghost" onClick={onCancelReservation}>Cancel reservation</Button>
                </div>
              )}
            </>
          )}
          {isSeller && done && doneBlock('Buyer entered the code — sale complete', 'Listing marked Sold. The buyer is asked to rate you.')}

          {!isSeller && !done && (
            <>
              <div style={{ position: 'relative', aspectRatio: '1/1', maxWidth: 320, margin: '0 auto 18px', borderRadius: 14, background: color.ink, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: '18%', border: '2px solid rgba(255,255,255,.18)', borderRadius: 10 }} />
                {['tl', 'tr', 'bl', 'br'].map((p) => <div key={p} style={corner(p)} />)}
                <div style={{ position: 'absolute', left: '20%', right: '20%', top: '50%', height: 2, background: color.pinkLight, boxShadow: '0 0 12px ' + color.pinkLight }} />
                <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', font: `500 12px/1.4 ${font}`, color: 'rgba(255,255,255,.8)' }}>
                  {verifying ? 'Verifying code…' : 'Point at the seller’s QR'}
                </div>
              </div>
              <div style={labelStyle}>Enter the seller’s handover code</div>
              <div style={{ font: `400 12.5px/1.6 ${font}`, color: color.muted, marginTop: 6, textWrap: 'pretty' }}>
                Ask {order.seller} for the code once you have checked the item. Entering it completes the sale.
              </div>
              <form onSubmit={(e: FormEvent) => { e.preventDefault(); onVerifyCode(code); }} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  value={code}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                  placeholder="XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX"
                  disabled={verifying}
                  style={{
                    flex: 1, minWidth: 0, padding: '11px 13px', borderRadius: 10, outline: 'none', letterSpacing: '.04em',
                    border: '1px solid ' + (error ? '#A11B3C' : color.field), font: `600 13px/1 ui-monospace, monospace`,
                  }}
                />
                <Button type="submit" size="sm" variant="ink" disabled={verifying}>{verifying ? 'Verifying…' : 'Verify'}</Button>
              </form>
              {error && (
                <div style={{ font: `500 12.5px/1.5 ${font}`, color: '#A11B3C', marginTop: 7 }}>{error}</div>
              )}
            </>
          )}
          {!isSeller && done && doneBlock('Handover confirmed', order.reference + ' is closed and the item is marked Sold.', (
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <Button full onClick={onRate}>Rate {shortName(order.seller)}</Button>
              <Button full variant="ghost" onClick={onHome}>Back to catalog</Button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, padding: 15, display: 'flex', gap: 13 }}>
            <PhotoSlot src={order.photo} label="" radius={9} style={{ width: 64, flex: 'none' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ font: `600 14px/1.35 ${font}`, textWrap: 'pretty' }}>{order.title}</div>
              <div style={{ font: `700 17px/1 ${font}`, color: color.pink, marginTop: 6 }}>{baht(order.price)}</div>
              <div style={{ font: `500 12px/1.5 ${font}`, color: color.muted, marginTop: 5 }}>
                {isSeller ? 'Buyer ' + order.buyer : 'Seller ' + order.seller}
              </div>
            </div>
          </div>
          <div style={{ ...card, padding: '15px 16px' }}>
            <div style={labelStyle}>Pickup</div>
            <div style={{ font: `600 14.5px/1.4 ${font}`, marginTop: 8 }}>{order.window}</div>
            <div style={{ font: `500 13px/1.5 ${font}`, color: color.muted, marginTop: 2 }}>{order.spot}</div>
          </div>
          <div style={{ ...card, padding: '15px 16px' }}>
            <div style={labelStyle}>{isSeller ? 'Before you show the QR' : 'Before you scan'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 11 }}>
              {CHECKS[role].map((t, i) => (
                <Checkbox key={t} checked={checks[i]} onChange={() => setChecks(checks.map((c, j) => (j === i ? !c : c)))}>{t}</Checkbox>
              ))}
            </div>
          </div>
          <Button variant="outline" full onClick={onChat}>{isSeller ? 'Chat with buyer' : 'Chat with seller'}</Button>
        </div>
      </div>
    </div>
  );
}
