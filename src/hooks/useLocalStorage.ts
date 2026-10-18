import { useCallback, useEffect, useRef, useState } from "react";
import { readStorage, removeStorage, writeStorage } from "../utils/storage";

/**
 * Persists a value in localStorage with runtime validation on read.
 *
 * `parse` receives the raw stored JSON (as `unknown`) and returns a valid
 * value, or `null` if the data is missing, malformed or outdated, in which
 * case `initialValue` is used. Changes made in other tabs are picked up too.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  parse: (raw: unknown) => T | null,
): readonly [value: T, setValue: (next: T) => void, reset: () => void] {
  const parseRef = useRef(parse);
  const initialRef = useRef(initialValue);

  useEffect(() => {
    parseRef.current = parse;
    initialRef.current = initialValue;
  });

  const read = useCallback((): T => {
    const raw = readStorage(key);
    if (raw === undefined) return initialRef.current;
    return parseRef.current(raw) ?? initialRef.current;
  }, [key]);

  const [value, setState] = useState<T>(() => {
    const raw = readStorage(key);
    return raw === undefined ? initialValue : (parse(raw) ?? initialValue);
  });

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setState(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, read]);

  const setValue = useCallback(
    (next: T) => {
      setState(next);
      writeStorage(key, next);
    },
    [key],
  );

  const reset = useCallback(() => {
    removeStorage(key);
    setState(initialRef.current);
  }, [key]);

  return [value, setValue, reset] as const;
}
