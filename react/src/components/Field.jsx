import { useState } from 'react';
import { color, font, labelStyle } from '../theme/tokens';

// Label + input/textarea/select with the shared pink focus treatment.
export default function Field({ label, as = 'input', style, children, ...rest }) {
  const [focus, setFocus] = useState(false);
  const Tag = as;
  const base = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid ' + (focus ? color.pink : color.field),
    font: `400 14px/1.4 ${font}`, outline: 'none', background: color.white,
    resize: as === 'textarea' ? 'vertical' : undefined,
    ...style,
  };
  return (
    <div>
      {label && <div style={{ ...labelStyle, marginBottom: 8 }}>{label}</div>}
      <Tag onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={base} {...rest}>
        {children}
      </Tag>
    </div>
  );
}
