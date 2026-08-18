import * as React from 'react';
import {
  getStorageItem,
  type StorageAreaName,
  setStorageItem,
  subscribeToStorageKey,
} from '@/shared/platform/storage';

export interface UseExtensionStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => Promise<void>;
  loading: boolean;
}

/**
 * A reactive React hook that binds to a Chrome storage key with automatic
 * cross-context updates.
 */
export function useExtensionStorage<T>(
  key: string,
  defaultValue: T,
  area: StorageAreaName = 'sync'
): [T, (value: T | ((prev: T) => T)) => Promise<void>, boolean] {
  const [value, setLocalValue] = React.useState<T>(defaultValue);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const initial = await getStorageItem<T>(key, defaultValue, area);
        if (active) {
          setLocalValue(initial);
          setLoading(false);
        }
      } catch (error) {
        console.error(`Failed to load storage key "${key}"`, error);
        if (active) {
          setLoading(false);
        }
      }
    }

    initialize();

    const unsubscribe = subscribeToStorageKey<T>(
      key,
      (next) => {
        if (active) {
          setLocalValue(next ?? defaultValue);
        }
      },
      area
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [key, defaultValue, area]);

  const updateValue = React.useCallback(
    async (nextValOrFn: T | ((prev: T) => T)) => {
      const nextValue =
        typeof nextValOrFn === 'function' ? (nextValOrFn as (prev: T) => T)(value) : nextValOrFn;

      setLocalValue(nextValue);
      await setStorageItem(key, nextValue, area);
    },
    [key, value, area]
  );

  return [value, updateValue, loading];
}
