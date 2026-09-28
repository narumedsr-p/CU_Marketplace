const TOKEN_KEY = 'cu-marketplace.token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token && !isExpired(token) ? token : null;
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { }
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { }
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodePayload(token);
  return !payload || (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now());
}

export function getCurrentUserId(): string | null {
  const token = getToken();
  const userId = token ? decodePayload(token)?.userId : null;
  return typeof userId === 'string' ? userId : null;
}

let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      unauthorizedHandler?.();
    }
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new ApiError(res.status, message || res.statusText);
  }
  return data as T;
}
