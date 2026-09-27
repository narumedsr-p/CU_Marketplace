import { useEffect, useState } from 'react';
import { color, font, labelStyle, card, pageTitle, pageSub, danger } from '../theme/tokens';
import Field from '../components/Field';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import Pill from '../components/Pill';

/**
 * Account settings (FR 1.5–1.8, 7.2, 7.3).
 *   user        { name, memberType, faculty, email, photo }   — directory-owned, read-only
 *   profile     { bio, contact }                               — PATCH /me
 *   sessions    [{ id, device, meta }]
 *   myReports   [{ id, title, state, reason, when, resolution }]
 *   blocked     [{ name, since }]
 *   openOrderRef  when set, account deletion is blocked until the order closes
 */
export default function AccountScreen({
  user, profile = { bio: '', contact: '' }, sessions = [], myReports = [], blocked = [],
  listingSummary, openOrderRef,
  onSaveProfile, onChangePhoto, onLogout, onLogoutAll, onUnblock, onMyListings, onDeleteAccount,
}) {
  const [draft, setDraft] = useState(profile);
  const [delOpen, setDelOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  useEffect(() => setDraft(profile), [profile]);
  const canDelete = confirmText === 'DELETE' && !openOrderRef;

  const section = { ...card, overflow: 'hidden' };
  const head = { ...labelStyle, padding: '13px 16px', borderBottom: '1px solid ' + color.lineSoft };

  return (
    <div style={{ padding: '22px 24px 40px', maxWidth: 1008 }}>
      <div style={pageTitle}>Account</div>
      <div style={pageSub}>Your profile, reports you've filed, people you've blocked, and your session.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18, marginTop: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, padding: 18 }}>
            <div style={labelStyle}>Edit profile</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
              <Avatar name={user.name} src={user.photo} size={62} />
              <div>
                <Button size="sm" variant="ghost" onClick={onChangePhoto}>Change photo</Button>
                <div style={{ font: `400 11.5px/1.5 ${font}`, color: color.faint, marginTop: 6 }}>JPG, PNG or WebP · max 5 MB</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginTop: 16 }}>
              {[['Name', user.name], ['Member type', user.memberType], ['Faculty', user.faculty], ['Email', user.email]].map(([k, v]) => (
                <div key={k} style={{ padding: '10px 12px', borderRadius: 9, background: color.canvas }}>
                  <div style={{ ...labelStyle, fontSize: 10.5 }}>{k}</div>
                  <div style={{ font: `500 13px/1.35 ${font}`, color: color.body, marginTop: 6, wordBreak: 'break-all' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ font: `400 11.5px/1.5 ${font}`, color: color.faint, marginTop: 7 }}>These come from the CU directory and can't be edited here.</div>
            <div style={{ marginTop: 16 }}>
              <Field label="Bio" as="textarea" rows={3} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Contact" placeholder="LINE ID or phone" value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} />
            </div>
            <Button full size="sm" onClick={() => onSaveProfile && onSaveProfile(draft)} style={{ marginTop: 14, padding: 12 }}>Save profile</Button>
          </div>

          <div style={{ ...card, padding: 18 }}>
            <div style={labelStyle}>Sessions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {sessions.map((x) => (
                <div key={x.id || x.device}>
                  <div style={{ font: `600 13px/1.3 ${font}` }}>{x.device}</div>
                  <div style={{ font: `500 12px/1.4 ${font}`, color: color.muted, marginTop: 2 }}>{x.meta}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <Button size="sm" variant="ink" onClick={onLogout} style={{ flex: 1 }}>Log out</Button>
              <Button size="sm" variant="ghost" onClick={onLogoutAll} style={{ flex: 1 }}>Log out everywhere</Button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {onMyListings && (
            <div onClick={onMyListings} style={{ ...card, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ font: `600 14px/1.3 ${font}` }}>My listings</div>
                {listingSummary && <div style={{ font: `500 12px/1.4 ${font}`, color: color.muted, marginTop: 3 }}>{listingSummary}</div>}
              </div>
              <div style={{ font: `600 16px/1 ${font}`, color: color.pink }}>›</div>
            </div>
          )}

          <div style={section}>
            <div style={head}>My reports</div>
            {myReports.map((r) => (
              <div key={r.id} style={{ padding: '12px 16px', borderBottom: '1px solid ' + color.lineSoft }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ font: '600 11px/1 ui-monospace,monospace', color: color.faint }}>{r.id}</span>
                  <Pill value={r.state} style={{ marginLeft: 'auto' }} />
                </div>
                <div style={{ font: `600 13px/1.35 ${font}`, marginTop: 6 }}>{r.title}</div>
                <div style={{ font: `500 12px/1.5 ${font}`, color: color.muted, marginTop: 2 }}>
                  {r.reason} · {r.when}{r.resolution ? ' · ' + r.resolution : ''}
                </div>
              </div>
            ))}
            {!myReports.length && <div style={{ padding: 16, font: `400 13px/1.5 ${font}`, color: color.muted }}>You haven't reported anything.</div>}
          </div>

          <div style={section}>
            <div style={head}>Blocked users</div>
            {blocked.map((b) => (
              <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid ' + color.lineSoft }}>
                <Avatar name={b.name} size={32} muted />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 13px/1.3 ${font}` }}>{b.name}</div>
                  <div style={{ font: `500 11.5px/1.4 ${font}`, color: color.faint }}>Blocked {b.since}</div>
                </div>
                <span onClick={() => onUnblock && onUnblock(b.name)} style={{ font: `600 12.5px/1 ${font}`, color: color.pink, cursor: 'pointer' }}>Unblock</span>
              </div>
            ))}
            {!blocked.length && <div style={{ padding: 16, font: `400 13px/1.5 ${font}`, color: color.muted }}>You haven't blocked anyone.</div>}
          </div>

          <div style={{ border: '1px solid ' + danger.line, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ ...labelStyle, color: danger.fg }}>Delete account</div>
            <div style={{ font: `400 13px/1.6 ${font}`, color: color.body, marginTop: 9, textWrap: 'pretty' }}>
              Removes your profile, listings, chats and wishlist. Personal data is erased within 30 days under PDPA; completed-order records are kept anonymised.
            </div>
            {!delOpen ? (
              <Button size="sm" variant="ghost" onClick={() => setDelOpen(true)} style={{ marginTop: 12, color: danger.fg, borderColor: danger.line }}>Delete my account</Button>
            ) : (
              <div style={{ marginTop: 12 }}>
                {openOrderRef && (
                  <div style={{ padding: '10px 12px', borderRadius: 9, background: '#FFF3E0', font: `500 12.5px/1.5 ${font}`, color: '#9A5B00', marginBottom: 10 }}>
                    You have an open order ({openOrderRef}). Complete or cancel it before deleting your account.
                  </div>
                )}
                <Field label="Type DELETE to confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Button size="sm" variant="ghost" onClick={() => { setDelOpen(false); setConfirmText(''); }}>Cancel</Button>
                  <Button size="sm" disabled={!canDelete} onClick={() => onDeleteAccount && onDeleteAccount()} style={{
                    flex: 1, background: canDelete ? danger.fg : '#E3CDD8', boxShadow: 'none',
                  }}>Permanently delete</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
