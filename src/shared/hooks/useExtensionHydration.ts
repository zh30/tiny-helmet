import * as React from 'react';
import { ensureExtensionHydrated, useExtensionStore } from '@/shared/state/useExtensionStore';

export function useExtensionHydration() {
  const status = useExtensionStore((state) => state.status);

  React.useEffect(() => {
    ensureExtensionHydrated().catch((error) => {
      console.error('Failed to hydrate extension settings', error);
    });
  }, []);

  return {
    status,
    ready: status === 'ready',
    loading: status === 'loading',
  } as const;
}
