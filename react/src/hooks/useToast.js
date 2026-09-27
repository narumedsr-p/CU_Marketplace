import { useCallback, useEffect, useRef, useState } from 'react';

// const { toast, flash } = useToast();  flash('Saved.')
export default function useToast(duration = 2400) {
  const [toast, setToast] = useState('');
  const timer = useRef();

  const flash = useCallback((msg) => {
    clearTimeout(timer.current);
    setToast(msg);
    timer.current = setTimeout(() => setToast(''), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, flash };
}
