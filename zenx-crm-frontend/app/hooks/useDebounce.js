// app/hooks/useDebounce.js
import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay.
 * @param {any} value
 * @param {number} delay - milliseconds
 * @returns debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
