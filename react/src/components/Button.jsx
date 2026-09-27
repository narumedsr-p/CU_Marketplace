import { useState } from 'react';
import { color, font, shadow } from '../theme/tokens';

// variant: primary | outline | ghost | ink   size: md | sm
export default function Button({
  variant = 'primary', size = 'md', full, children, style, ...rest
}) {
  const [hover, setHover] = useState(false);
  const pad = size === 'sm' ? '9px 16px' : '15px 20px';
  const fs = size === 'sm' ? 13 : 15;

  const variants = {
    primary: {
      background: hover ? color.pinkHover : color.pink,
      color: color.white, border: '1.5px solid transparent',
      boxShadow: shadow.primary,
    },
    outline: {
      background: hover ? color.pinkTint : color.white,
      color: color.pink, border: '1.5px solid ' + color.pink,
    },
    ghost: {
      background: color.white,
      color: hover ? color.pink : color.muted,
      border: '1.5px solid ' + (hover ? color.pink : color.field),
    },
    ink: {
      background: hover ? '#000' : color.ink,
      color: color.white, border: '1.5px solid transparent',
    },
  };

  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: pad, borderRadius: 11, cursor: 'pointer',
        font: `600 ${fs}px/1 ${font}`, whiteSpace: 'nowrap',
        width: full ? '100%' : undefined,
        transition: 'background .16s,border-color .16s,color .16s',
        ...variants[variant], ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
