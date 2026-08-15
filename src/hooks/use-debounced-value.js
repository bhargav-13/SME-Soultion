import { useEffect, useState } from 'react';

/**
 * A copy of [value] that only updates once it has stopped changing for [delay] ms.
 *
 * Used for search boxes so the work behind them — a request, or a filter pass over a few thousand
 * inventory rows — runs when the user pauses rather than on every keystroke.
 */
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
