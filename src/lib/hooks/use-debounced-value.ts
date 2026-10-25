"use client";

import { useEffect, useState } from "react";

// Returns `value` only after it has stopped changing for `delayMs`. Used so
// typing in the search box sends one database query when the person pauses,
// instead of one per keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
