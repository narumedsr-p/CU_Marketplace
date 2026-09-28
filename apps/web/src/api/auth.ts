import { api, clearToken, setToken } from './client';

export async function signIn(userId?: string) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const { accessToken } = await api<{ accessToken: string }>(`/auth/callback${query}`);
  setToken(accessToken);
}

export function signOut() {
  clearToken();
}
