import { useCallback, useEffect, useRef, useState } from 'react';

// const { toast, flash } = useToast();  flash('Saved.')
export default function useToast(duration = 2400) {
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const flash = useCallback((msg: string) => {
    clearTimeout(timer.current);
    setToast(msg);
    timer.current = setTimeout(() => setToast(''), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, flash };
}
