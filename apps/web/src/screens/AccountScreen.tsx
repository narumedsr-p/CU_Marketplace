import { useEffect, useState, type ChangeEvent } from 'react';
import { color, font, labelStyle, card, pageTitle, pageSub, danger } from '../theme/tokens';
import Field from '../components/Field';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import type { AccountProfile, AccountUser, Session } from '../types';

interface AccountScreenProps {
  user: AccountUser;
  profile?: AccountProfile;
  sessions?: Session[];
  listingSummary?: string;
  openOrderRef?: string | null;
  deletingAccount?: boolean;
  deleteAccountError?: string | null;
  onClearDeleteAccountError?: () => void;
  onSaveProfile: (profile: AccountProfile) => void;
  onChangePhoto: () => void;
  onLogout: () => void;
  onLogoutAll: () => void;
  onMyListings?: () => void;
  onDeleteAccount: () => Promise<void>;
}

// Account settings (FR 1.5–1.8).
export default function AccountScreen({
  user, profile = { contact: '' }, sessions = [],
  listingSummary, openOrderRef, deletingAccount = false, deleteAccountError = null, onClearDeleteAccountError,
  onSaveProfile, onChangePhoto, onLogout, onLogoutAll, onMyListings, onDeleteAccount,
}: AccountScreenProps) {
  const [draft, setDraft] = useState(profile);
  const [delOpen, setDelOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  useEffect(() => setDraft(profile), [profile]);
  const canDelete = confirmText === 'DELETE' && !openOrderRef && !deletingAccount;

  return (
    <div style={{ padding: '22px 24px 40px' }}>
      <div style={pageTitle}>Account</div>
      <div style={pageSub}>Your profile and session settings.</div>

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
              {([['Name', user.name], ['Member type', user.memberType], ['Faculty', user.faculty], ['Email', user.email]] as const).map(([k, v]) => (
                <div key={k} style={{ padding: '10px 12px', borderRadius: 9, background: color.canvas }}>
                  <div style={{ ...labelStyle, fontSize: 10.5 }}>{k}</div>
                  <div style={{ font: `500 13px/1.35 ${font}`, color: color.body, marginTop: 6, wordBreak: 'break-all' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ font: `400 11.5px/1.5 ${font}`, color: color.faint, marginTop: 7 }}>These come from the CU directory and can't be edited here.</div>
            <div style={{ marginTop: 16 }}>
              <Field label="Contact" placeholder="LINE ID or phone" value={draft.contact} onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, contact: e.target.value })} />
            </div>
            <Button full size="sm" onClick={() => onSaveProfile(draft)} style={{ marginTop: 14, padding: 12 }}>Save profile</Button>
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

          <div style={{ border: '1px solid ' + danger.line, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ ...labelStyle, color: danger.fg }}>Delete account</div>
            <div style={{ font: `400 13px/1.6 ${font}`, color: color.body, marginTop: 9, textWrap: 'pretty' }}>
              Your account will be marked as deleted and you will be signed out. Listings, chats, wishlists, and order records are not removed by this action.
            </div>
            {!delOpen ? (
              <Button size="sm" variant="ghost" onClick={() => { onClearDeleteAccountError?.(); setDelOpen(true); }} style={{ marginTop: 12, color: danger.fg, borderColor: danger.line }}>Delete my account</Button>
            ) : (
              <div style={{ marginTop: 12 }}>
                {openOrderRef && (
                  <div style={{ padding: '10px 12px', borderRadius: 9, background: '#FFF3E0', font: `500 12.5px/1.5 ${font}`, color: '#9A5B00', marginBottom: 10 }}>
                    You have an open order ({openOrderRef}). Complete or cancel it before deleting your account.
                  </div>
                )}
                <Field label="Type DELETE to confirm" value={confirmText} disabled={deletingAccount} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)} placeholder="DELETE" />
                {deleteAccountError && (
                  <div role="alert" style={{ marginTop: 10, font: `500 12.5px/1.5 ${font}`, color: danger.fg }}>
                    {deleteAccountError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Button size="sm" variant="ghost" disabled={deletingAccount} onClick={() => { setDelOpen(false); setConfirmText(''); onClearDeleteAccountError?.(); }}>Cancel</Button>
                  <Button size="sm" disabled={!canDelete} onClick={() => { void onDeleteAccount(); }} style={{
                    flex: 1, background: canDelete ? danger.fg : '#E3CDD8', boxShadow: 'none',
                  }}>{deletingAccount ? 'Deleting…' : 'Confirm account deletion'}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
