import type { CSSProperties } from 'react';
import type { ListingStatus } from '../types';

// RachaSA design tokens. Single source of truth for the UI.
export const color = {
  pink: '#D6206E',
  pinkHover: '#B81A5E',
  pinkLight: '#FF5C9E',
  pinkDeep: '#8E0F45',
  pinkGlow: '#FF8FBB',
  pinkTint: '#FFF5F9',
  pinkLine: '#FFE4EF',
  ink: '#1A1016',
  body: '#4A3A42',
  muted: '#7A6570',
  faint: '#A8909B',
  line: '#EFE1E7',
  lineSoft: '#F4E7ED',
  field: '#EFD9E3',
  canvas: '#F7F2F4',
  white: '#FFFFFF',
  star: '#F5A524',
  starOff: '#EAD9E1',
};

export const status: Record<ListingStatus, { bg: string; fg: string }> = {
  Available: { bg: '#EAF7EE', fg: '#1E7A44' },
  Completed: { bg: '#EAF7EE', fg: '#1E7A44' },
  Reserved: { bg: '#FFF3E0', fg: '#9A5B00' },
  Sold: { bg: '#F2ECEF', fg: '#7A6570' },
  Empty: { bg: '#F2ECEF', fg: '#7A6570' },
  Cancelled: { bg: '#FDECEF', fg: '#A11B3C' },
};

// Status tint map for listing and order labels.
export const pillStatus: Record<string, { bg: string; fg: string }> = {
  ...status,
  Hidden: { bg: '#F2ECEF', fg: '#7A6570' },
  Active: { bg: '#EAF7EE', fg: '#1E7A44' },
};

export const danger = { fg: '#A11B3C', bg: '#FDECEF', line: '#F6C9D3' };

export const font = "'Bai Jamjuree', system-ui, sans-serif";

export const radius = { badge: 6, chip: 9, input: 10, card: 12, shell: 16 };

export const shadow = {
  cardHover: '0 10px 24px rgba(93,20,54,.13)',
  primary: '0 8px 20px rgba(214,32,110,.28)',
  toast: '0 12px 34px rgba(26,16,22,.3)',
};

// Hatched placeholder fill used wherever a real photo will go.
export const photoFill = 'repeating-linear-gradient(45deg,#FFE9F1 0 9px,#FFF5F9 9px 18px)';

export const gradient = 'radial-gradient(120% 90% at 8% 0%,#FF5C9E 0%,#D6206E 46%,#8E0F45 100%)';

// Integer baht, no decimals.
export const baht = (n: number | string | undefined) => '฿' + Number(n || 0).toLocaleString('en-US');

export const labelStyle: CSSProperties = {
  font: `600 11px/1 ${font}`,
  letterSpacing: '.1em',
  color: color.faint,
  textTransform: 'uppercase',
};

export const initialsOf = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('');

export const card: CSSProperties = { border: '1px solid #EFE1E7', borderRadius: 12, background: '#FFFFFF' };
export const pageTitle: CSSProperties = { font: `700 22px/1.2 ${font}`, letterSpacing: '-.01em' };
export const pageSub: CSSProperties = { font: `400 13.5px/1.6 ${font}`, color: '#7A6570', marginTop: 5, textWrap: 'pretty' };

export const shortName = (name = '') => {
  const [a, b] = name.split(' ');
  return b ? a + ' ' + b[0] + '.' : a;
};

export const slugify = (s = '') =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const clock = (d = new Date()) =>
  String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
