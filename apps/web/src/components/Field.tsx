import { useState, type CSSProperties, type ReactNode } from 'react';
import { color, font, labelStyle } from '../theme/tokens';

interface FieldProps {
  label?: string;
  as?: 'input' | 'textarea' | 'select';
  style?: CSSProperties;
  children?: ReactNode;
  [rest: string]: unknown;
}

// Label + input/textarea/select with the shared pink focus treatment.
export default function Field({ label, as = 'input', style, children, ...rest }: FieldProps) {
  const [focus, setFocus] = useState(false);
  // Polymorphic tag: props are validated per-call-site, not here.
  const Tag = as as any;
  const base: CSSProperties = {
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
