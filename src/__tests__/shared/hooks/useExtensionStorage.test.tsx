import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useExtensionStorage } from '@/shared/hooks/useExtensionStorage';
import * as storageModule from '@/shared/platform/storage';

describe('useExtensionStorage hook', () => {
  it('hydrates initial value and updates value reactively', async () => {
    vi.spyOn(storageModule, 'getStorageItem').mockResolvedValue('test-val');
    const setStorageSpy = vi.spyOn(storageModule, 'setStorageItem').mockResolvedValue(undefined);

    const { result } = renderHook(() => useExtensionStorage('myKey', 'default-val'));

    // Wait for effect hydration
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current[0]).toBe('test-val');
    expect(result.current[2]).toBe(false);

    // Call updater
    await act(async () => {
      await result.current[1]('updated-val');
    });

    expect(result.current[0]).toBe('updated-val');
    expect(setStorageSpy).toHaveBeenCalledWith('myKey', 'updated-val', 'sync');
  });
});
