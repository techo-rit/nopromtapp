import { useState, useEffect } from 'react';

/**
 * Debounce a value by delay milliseconds
 * 
 * Usage:
 *   const debouncedQuery = useDebounce(searchQuery, 250);
 *   // debouncedQuery updates 250ms after searchQuery stops changing
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
