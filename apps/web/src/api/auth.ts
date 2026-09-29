import { clearToken, setToken } from './client';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: 'Sign-in session expired or was tampered with. Please try again.',
  google_auth_failed: 'Google sign-in failed. Please try again.',
  domain_not_allowed: 'Please sign in with a verified @chula.ac.th Google account.',
  service_unavailable: 'Sign-in is temporarily unavailable. Please try again later.',
  account_deleted: 'This account has been deleted.',
};

export function signIn() {
  window.location.assign('/auth/google');
}

export function signOut() {
  clearToken();
}

export function consumeAuthRedirect(): { error: string | null } {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('token');
  const error = url.searchParams.get('error');
  if (!token && !error) return { error: null };

  url.searchParams.delete('token');
  url.searchParams.delete('error');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);

  if (token) {
    setToken(token);
    return { error: null };
  }
  return { error: AUTH_ERROR_MESSAGES[error!] ?? 'Sign-in failed. Please try again.' };
}
