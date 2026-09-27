import { color, font, shadow } from '../theme/tokens';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)',
      zIndex: 300, background: color.ink, color: color.white,
      padding: '13px 20px', borderRadius: 11, font: `500 13.5px/1.4 ${font}`,
      boxShadow: shadow.toast, animation: 'rsaToast 2.4s ease forwards',
      maxWidth: '88vw', textAlign: 'center',
    }}>{message}</div>
  );
}
