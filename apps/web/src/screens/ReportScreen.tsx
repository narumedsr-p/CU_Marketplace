import { useEffect, useState, type ChangeEvent } from 'react';
import { color, font, labelStyle, card, pageTitle, pageSub } from '../theme/tokens';
import Segmented from '../components/Segmented';
import Chip from '../components/Chip';
import Field from '../components/Field';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import PhotoSlot from '../components/PhotoSlot';
import type { ReportPhoto, ReportTarget, ReportType } from '../types';

export const REPORT_REASONS: Record<ReportType, string[]> = {
  Listing: ['Counterfeit or misleading', 'Prohibited item', 'Scam or suspicious price', 'Wrong category', 'Academic integrity'],
  User: ['Harassment', 'No-show / unreliable', 'Fraud', 'Impersonation'],
  Order: ['Off-platform payment request', 'Item not as described', 'Seller no-show', 'Fake QR / handover issue'],
};

interface ReportScreenProps {
  target: ReportTarget;
  reasons?: Record<ReportType, string[]>;
  photos?: ReportPhoto[];
  onAddPhoto: () => void;
  onSubmit: (payload: { type: ReportType; reason: string; text: string; photos: ReportPhoto[]; attachLinked: boolean; target: ReportTarget }) => void;
  onCancel: () => void;
}

// Submit report (FR 7.1, 7.3) → POST /reports. Creates a Pending case.
export default function ReportScreen({
  target, reasons = REPORT_REASONS, photos = [], onAddPhoto, onSubmit, onCancel,
}: ReportScreenProps) {
  const [type, setType] = useState<ReportType>(target?.type || 'Listing');
  const [reason, setReason] = useState('');
  const [text, setText] = useState('');
  const [attach, setAttach] = useState(true);
  useEffect(() => { setType(target?.type || 'Listing'); setReason(''); }, [target]);

  const line = type === 'User' ? 'User: ' + target.target
    : type === 'Order' ? 'Order ' + (target.orderRef || '—') + ' with ' + target.target
      : 'Listing: ' + target.title + ' · by ' + target.target;
  const attachLabel = type === 'Listing' ? 'Attach the listing photos and text'
    : type === 'Order' ? 'Attach this order’s history and chat log' : 'Attach our chat history with ' + target.target;

  return (
    <div style={{ padding: '22px 24px 40px' }}>
      <div style={pageTitle}>Report a problem</div>
      <div style={pageSub}>Reports go to Trust &amp; Safety as a trackable case. The person you report isn't told who filed it.</div>

      <div style={{ ...card, padding: 18, marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={labelStyle}>What are you reporting</div>
          <Segmented style={{ marginTop: 9 }} value={type} onChange={(t) => { setType(t as ReportType); setReason(''); }} options={['Listing', 'User', 'Order']} />
          <div style={{ marginTop: 10, padding: '11px 13px', borderRadius: 10, background: '#FCF8FA', border: '1px solid ' + color.lineSoft, font: `500 13px/1.5 ${font}`, color: color.body }}>{line}</div>
        </div>
        <div>
          <div style={labelStyle}>Reason</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
            {reasons[type].map((r) => <Chip key={r} size="sm" active={reason === r} onClick={() => setReason(r)}>{r}</Chip>)}
          </div>
        </div>
        <Field
          label="What happened" as="textarea" rows={4} value={text}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          placeholder="Describe what happened, with dates or times if you can."
        />
        <div>
          <div style={labelStyle}>Evidence</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 9 }}>
            {photos.map((p, i) => <PhotoSlot key={i} src={p.src} label={'IMG ' + (i + 1)} radius={9} style={{ width: 64 }} />)}
            {photos.length < 4 && (
              <div onClick={onAddPhoto} style={{
                width: 64, height: 64, borderRadius: 9, border: '1.5px dashed ' + color.field, display: 'grid', placeItems: 'center',
                font: `600 11.5px/1.3 ${font}`, color: color.muted, cursor: 'pointer', textAlign: 'center',
              }}>+ Photo</div>
            )}
          </div>
          <Checkbox checked={attach} onChange={() => setAttach(!attach)} style={{ marginTop: 12 }}>{attachLabel}</Checkbox>
        </div>
        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            size="sm" disabled={!reason} style={{ opacity: reason ? 1 : 0.45 }}
            onClick={() => onSubmit({ type, reason, text: text.trim(), photos, attachLinked: attach, target })}
          >Submit report</Button>
        </div>
      </div>
    </div>
  );
}
