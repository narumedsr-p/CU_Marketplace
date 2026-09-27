import { useState, type ChangeEvent, type ReactNode } from 'react';
import { color, font, labelStyle, card, pageTitle } from '../theme/tokens';
import Chip from '../components/Chip';
import Pill from '../components/Pill';
import Button from '../components/Button';
import Field from '../components/Field';
import type { AuditEntry, AuditKind, ModerationCase, ReportCaseState, SuspendPayload } from '../types';

const OPEN: ReportCaseState[] = ['Pending', 'In review'];
type StateFilter = 'Open' | 'Pending' | 'In review' | 'Closed' | 'All';
const inState = (c: ModerationCase, f: StateFilter) => f === 'All' ? true : f === 'Open' ? OPEN.includes(c.state)
  : f === 'Closed' ? (['Closed', 'Dismissed'] as ReportCaseState[]).includes(c.state) : c.state === f;

type ModerationTab = 'reports' | 'audit' | 'categories';
type SeverityFilter = 'Any' | 'High' | 'Medium' | 'Low';
type AuditFilter = 'All' | AuditKind;

interface ModerationScreenProps {
  cases?: ModerationCase[];
  audit?: AuditEntry[];
  live?: boolean;
  compact?: boolean;
  categoriesTab?: ReactNode;
  initialTab?: ModerationTab;
  onStartReview: (id: string) => void;
  onDismiss: (id: string) => void;
  onRemoveListing: (id: string) => void;
  onSuspend: (id: string, payload: SuspendPayload) => void;
  onOpenEvidence: (c: ModerationCase, e: { k: string; v: string }) => void;
}

// Admin Trust & Safety (FR 7.4–7.9). Every callback must write an AuditLog row server-side.
export default function ModerationScreen({
  cases = [], audit = [], live = true, compact = false, categoriesTab, initialTab = 'reports',
  onStartReview, onDismiss, onRemoveListing, onSuspend, onOpenEvidence,
}: ModerationScreenProps) {
  const [tab, setTab] = useState<ModerationTab>(initialTab);
  const [stFilter, setStFilter] = useState<StateFilter>('Open');
  const [sevFilter, setSevFilter] = useState<SeverityFilter>('Any');
  const [auFilter, setAuFilter] = useState<AuditFilter>('All');
  const [selId, setSelId] = useState<string | undefined>(cases[0]?.id);
  const [detailOpen, setDetailOpen] = useState(!compact);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [duration, setDuration] = useState<SuspendPayload['duration']>('7 days');
  const [reason, setReason] = useState('');

  const shown = cases.filter((c) => inState(c, stFilter) && (sevFilter === 'Any' || c.sev === sevFilter));
  const cs = cases.find((c) => c.id === selId) || shown[0] || cases[0];
  const openCount = cases.filter((c) => OPEN.includes(c.state)).length;
  const perm = duration === 'Permanent ban';

  const tabs: [ModerationTab, string][] = [['reports', `Reports · ${openCount} open`], ['audit', 'Audit log']];
  if (categoriesTab) tabs.push(['categories', 'Categories']);

  return (
    <div style={{ padding: compact ? '16px 14px 0' : '22px 24px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ padding: '3px 7px', borderRadius: 5, background: color.ink, color: color.white, font: `600 10px/1.5 ${font}`, letterSpacing: '.08em' }}>ADMIN</div>
        <div style={pageTitle}>Trust &amp; Safety</div>
      </div>
      <div style={{ display: 'flex', gap: 22, borderBottom: '1px solid ' + color.line, marginTop: 14, overflowX: 'auto' }}>
        {tabs.map(([k, label]) => (
          <div key={k} onClick={() => setTab(k)} style={{
            padding: '10px 0 11px', marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: '2px solid ' + (tab === k ? color.pink : 'transparent'),
            color: tab === k ? color.pink : color.muted, font: `600 13.5px/1 ${font}`,
          }}>{label}</div>
        ))}
      </div>

      {tab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: compact ? 'minmax(0,1fr)' : '380px minmax(0,1fr)', gap: 18, marginTop: 16, alignItems: 'start' }}>
          {(!compact || !detailOpen) && (
            <div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['Open', 'Pending', 'In review', 'Closed', 'All'] as StateFilter[]).map((f) => (
                  <Chip key={f} size="sm" active={stFilter === f} onClick={() => setStFilter(f)}>{f} · {cases.filter((c) => inState(c, f)).length}</Chip>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7, alignItems: 'center' }}>
                <div style={{ ...labelStyle, marginRight: 2 }}>Severity</div>
                {(['Any', 'High', 'Medium', 'Low'] as SeverityFilter[]).map((f) => (
                  <span key={f} onClick={() => setSevFilter(f)} style={{
                    padding: '5px 10px', borderRadius: 7, cursor: 'pointer', font: `600 11.5px/1.2 ${font}`,
                    background: sevFilter === f ? color.ink : color.canvas, color: sevFilter === f ? color.white : color.body,
                  }}>{f}</span>
                ))}
              </div>
              <div style={{ ...card, overflow: 'hidden', marginTop: 12 }}>
                {shown.map((c) => (
                  <div key={c.id} onClick={() => { setSelId(c.id); setDetailOpen(true); setSuspendOpen(false); }} style={{
                    padding: '13px 14px', borderBottom: '1px solid ' + color.lineSoft, cursor: 'pointer',
                    background: cs && c.id === cs.id && !compact ? color.pinkTint : color.white,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ font: '600 11px/1 ui-monospace,monospace', color: color.faint }}>{c.id}</span>
                      <Pill bg={color.canvas} fg={color.body}>{c.type}</Pill>
                      <Pill tone="severity" value={c.sev} />
                      <Pill value={c.state} style={{ marginLeft: 'auto' }} />
                    </div>
                    <div style={{ font: `600 13.5px/1.35 ${font}`, marginTop: 8, textWrap: 'pretty' }}>{c.title}</div>
                    <div style={{ font: `500 12px/1.5 ${font}`, color: color.muted, marginTop: 3 }}>{c.reason} · {c.when}</div>
                  </div>
                ))}
                {!shown.length && <div style={{ padding: '30px 14px', textAlign: 'center', font: `400 13px/1.6 ${font}`, color: color.muted }}>No cases match these filters.</div>}
              </div>
            </div>
          )}

          {cs && (!compact || detailOpen) && (
            <div style={{ ...card, padding: 18 }}>
              {compact && <div onClick={() => { setDetailOpen(false); setSuspendOpen(false); }} style={{ font: `600 12.5px/1 ${font}`, color: color.pink, cursor: 'pointer', marginBottom: 14 }}>‹ All cases</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ font: '600 12px/1 ui-monospace,monospace', color: color.faint }}>{cs.id}</span>
                <Pill bg={color.canvas} fg={color.body}>{cs.type} report</Pill>
                <Pill tone="severity" value={cs.sev}>{cs.sev} severity</Pill>
                <Pill value={cs.state} />
              </div>
              <div style={{ font: `700 19px/1.3 ${font}`, marginTop: 12, textWrap: 'pretty' }}>{cs.title}</div>
              <div style={{ font: `500 12.5px/1.5 ${font}`, color: color.muted, marginTop: 5 }}>
                Reported by {cs.reporter} · {cs.when} · {cs.count} {cs.count === 1 ? 'report' : 'reports'} on this target
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 16 }}>
                <div>
                  <div style={labelStyle}>Reason</div>
                  <div style={{ font: `600 13.5px/1.4 ${font}`, marginTop: 7 }}>{cs.reason}</div>
                  <div style={{ font: `400 13px/1.6 ${font}`, color: color.body, marginTop: 6, textWrap: 'pretty' }}>“{cs.note}”</div>
                </div>
                <div style={{ background: '#FCF8FA', border: '1px solid ' + color.lineSoft, borderRadius: 10, padding: '12px 13px' }}>
                  <div style={labelStyle}>Target account</div>
                  <div style={{ font: `600 13.5px/1.3 ${font}`, marginTop: 8 }}>{cs.target}</div>
                  <div style={{ font: `500 12px/1.6 ${font}`, color: color.muted, marginTop: 3 }}>
                    {cs.targetFac} · member {cs.accountAge}<br />{cs.activeListings} active listings · prior: {cs.prior}
                  </div>
                </div>
              </div>

              <div style={{ ...labelStyle, marginTop: 18 }}>Linked evidence</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: color.lineSoft, border: '1px solid ' + color.lineSoft, borderRadius: 10, overflow: 'hidden', marginTop: 9 }}>
                {(cs.evidence || []).map((e) => (
                  <div key={e.k} style={{ background: color.white, padding: '11px 13px', display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <div style={{ font: `600 12.5px/1.3 ${font}`, width: 120, flex: 'none' }}>{e.k}</div>
                    <div style={{ flex: 1, minWidth: 160, font: `400 12.5px/1.5 ${font}`, color: color.body }}>{e.v}</div>
                    <span onClick={() => onOpenEvidence(cs, e)} style={{ font: `600 12px/1 ${font}`, color: color.pink, cursor: 'pointer' }}>Open</span>
                  </div>
                ))}
              </div>

              {OPEN.includes(cs.state) ? (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
                    {cs.state === 'Pending' && <Button size="sm" variant="ghost" onClick={() => onStartReview(cs.id)}>Start review</Button>}
                    <Button size="sm" variant="ghost" onClick={() => onDismiss(cs.id)}>Dismiss</Button>
                    {cs.type === 'Listing' && <Button size="sm" variant="ink" onClick={() => onRemoveListing(cs.id)}>Remove listing</Button>}
                    <Button size="sm" onClick={() => { setReason(cs.reason); setSuspendOpen(true); }}>Suspend or ban user</Button>
                  </div>
                  {suspendOpen && (
                    <div style={{ marginTop: 14, padding: 16, borderRadius: 12, background: color.pinkTint, border: '1px solid ' + color.pinkLine }}>
                      <div style={{ font: `700 15px/1.3 ${font}` }}>Suspend {cs.target}</div>
                      <div style={{ ...labelStyle, marginTop: 14 }}>Duration</div>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
                        {(['7 days', '30 days', 'Permanent ban'] as SuspendPayload['duration'][]).map((d) => <Chip key={d} size="sm" active={duration === d} onClick={() => setDuration(d)}>{d}</Chip>)}
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <Field label="Reason shown to user at login" value={reason} onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)} />
                      </div>
                      <div style={{ font: `500 12.5px/1.6 ${font}`, color: color.body, marginTop: 12, textWrap: 'pretty' }}>
                        This revokes all active sessions immediately, hides {cs.activeListings} active listing{cs.activeListings === 1 ? '' : 's'}, and cancels any reserved orders.{' '}
                        {perm ? 'The account can’t sign in again.' : `Access returns automatically after ${duration}.`}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <Button size="sm" variant="ghost" onClick={() => setSuspendOpen(false)}>Cancel</Button>
                        <Button size="sm" style={{ flex: 1 }} onClick={() => { onSuspend(cs.id, { duration, reason }); setSuspendOpen(false); }}>
                          {perm ? 'Confirm permanent ban' : 'Confirm suspension · ' + duration}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ marginTop: 18, padding: '13px 14px', borderRadius: 10, background: color.canvas, font: `500 13px/1.5 ${font}`, color: color.body }}>
                  Resolution: {cs.resolution || cs.state}
                </div>
              )}
              <div style={{ font: `400 11.5px/1.6 ${font}`, color: color.faint, marginTop: 14 }}>Every action here is written to the audit log with your admin ID.</div>
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {live && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 8, background: '#EAF7EE', color: '#1E7A44', font: `600 12px/1 ${font}` }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1E7A44' }} />Live
              </div>
            )}
            {(['All', 'Moderation', 'Categories', 'System'] as AuditFilter[]).map((f) => <Chip key={f} size="sm" active={auFilter === f} onClick={() => setAuFilter(f)}>{f}</Chip>)}
          </div>
          <div style={{ ...card, overflow: 'hidden', marginTop: 12 }}>
            {audit.filter((a) => auFilter === 'All' || a.kind === auFilter).map((a, i) => {
              const sys = a.actor === 'System';
              return (
                <div key={a.id || i} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', flexWrap: 'wrap',
                  borderBottom: '1px solid ' + color.lineSoft, background: a.fresh ? '#FFF8FB' : color.white,
                }}>
                  <div style={{ font: '500 12px/1.5 ui-monospace,monospace', color: color.faint, width: 44, flex: 'none' }}>{a.t}</div>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', font: `700 10px/1 ${font}`,
                    background: sys ? '#F2ECEF' : color.ink, color: sys ? color.muted : color.white,
                  }}>{sys ? 'SY' : a.actor.replace('Admin ', '').split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Pill mono bg={color.canvas} fg={color.ink}>{a.code}</Pill>
                      <span style={{ font: `600 13px/1.4 ${font}` }}>{a.target}</span>
                    </div>
                    <div style={{ font: `400 12.5px/1.5 ${font}`, color: color.muted, marginTop: 4 }}>{a.actor} · {a.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'categories' && categoriesTab}
    </div>
  );
}
