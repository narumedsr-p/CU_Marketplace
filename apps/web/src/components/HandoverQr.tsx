import { useMemo } from 'react';
import { color } from '../theme/tokens';

/**
 * Visual stand-in for the handover QR (FR 2.3). It is deterministic per code but is NOT a
 * scannable QR. In production render the real payload, e.g.
 *   import { QRCodeSVG } from 'qrcode.react';  <QRCodeSVG value={code} size={220} />
 * and keep this frame + the human-readable code underneath.
 */
export function qrMatrix(code = '', n = 25): boolean[] {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  const finders: [number, number][] = [[0, 0], [0, n - 7], [n - 7, 0]];
  const cells: boolean[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let v: boolean | undefined;
      for (const [r0, c0] of finders) {
        const y = r - r0, x = c - c0;
        if (y >= 0 && x >= 0 && y <= 6 && x <= 6) {
          v = y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4);
          break;
        }
        if (r >= r0 - 1 && r <= r0 + 7 && c >= c0 - 1 && c <= c0 + 7) { v = false; break; }
      }
      cells.push(v === undefined ? rnd() > 0.52 : v);
    }
  }
  return cells;
}

interface HandoverQrProps {
  code: string;
  size?: number;
}

export default function HandoverQr({ code, size = 250 }: HandoverQrProps) {
  const cells = useMemo(() => qrMatrix(code), [code]);
  return (
    <div style={{
      width: '100%', maxWidth: size, margin: '0 auto', padding: 14, borderRadius: 12,
      background: color.white, border: '1px solid ' + color.line,
    }}>
      <div role="img" aria-label={'Handover QR for ' + code} style={{
        display: 'grid', gridTemplateColumns: 'repeat(25,1fr)', aspectRatio: '1/1',
      }}>
        {cells.map((on, i) => <div key={i} style={{ background: on ? color.ink : color.white }} />)}
      </div>
    </div>
  );
}
