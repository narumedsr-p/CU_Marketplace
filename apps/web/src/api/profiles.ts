import { api, getCurrentUserId } from './client';
import type { CurrentUser } from '../types';

export interface ApiProfile {
  userId: string;
  displayName: string;
  avatarUrl: string;
  contactInfo: string;
  role: 'Student' | 'Admin';
  accountStatus: 'Active' | 'Banned' | 'Deleted';
  createdAt: string;
}

export interface ProfileUpdate {
  displayName?: string;
  avatarUrl?: string;
  contactInfo?: string;
}

const PROFILES = '/api/v1/profiles';

const cache = new Map<string, Promise<ApiProfile | null>>();

export function fetchProfile(userId: string) {
  let profile = cache.get(userId);
  if (!profile) {
    profile = api<ApiProfile | null>(`${PROFILES}/${userId}`).then((p) => p || null).catch(() => null);
    cache.set(userId, profile);
  }
  return profile;
}

export function fetchMyProfile() {
  const userId = getCurrentUserId();
  return userId ? fetchProfile(userId) : Promise.resolve(null);
}

export async function updateMyProfile(patch: ProfileUpdate) {
  const profile = await api<ApiProfile>(`${PROFILES}/me`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  cache.set(profile.userId, Promise.resolve(profile));
  return profile;
}

export function memberSince(profile: ApiProfile) {
  return String(new Date(profile.createdAt).getFullYear());
}

export function toUser(profile: ApiProfile): CurrentUser {
  return {
    id: profile.userId,
    name: profile.displayName,
    memberType: profile.role,
    faculty: '',
    joined: new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
  };
}
