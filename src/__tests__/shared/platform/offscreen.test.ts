import { describe, expect, it, vi } from 'vitest';
import {
  closeOffscreenDocument,
  ensureOffscreenDocument,
  hasOffscreenDocument,
} from '@/shared/platform/offscreen';

describe('offscreen document helper', () => {
  it('detects if offscreen document exists', async () => {
    vi.spyOn(chrome.offscreen, 'hasDocument').mockImplementation((callback?: any) => {
      if (typeof callback === 'function') {
        callback(true);
        return undefined as any;
      }
      return Promise.resolve(true) as any;
    });

    const exists = await hasOffscreenDocument('offscreen.html');
    expect(exists).toBe(true);
  });

  it('creates offscreen document if not existing', async () => {
    vi.spyOn(chrome.offscreen, 'hasDocument').mockImplementation((callback?: any) => {
      if (typeof callback === 'function') {
        callback(false);
        return undefined as any;
      }
      return Promise.resolve(false) as any;
    });

    const createSpy = vi
      .spyOn(chrome.offscreen, 'createDocument')
      .mockImplementation((_parameters: any, callback?: any) => {
        if (typeof callback === 'function') {
          callback();
          return undefined as any;
        }
        return Promise.resolve() as any;
      });

    await ensureOffscreenDocument({
      path: 'offscreen.html',
      reasons: ['DOM_PARSER' as chrome.offscreen.Reason],
      justification: 'Parsing HTML content in background',
    });

    expect(createSpy).toHaveBeenCalled();
  });

  it('closes offscreen document safely', async () => {
    const closeSpy = vi
      .spyOn(chrome.offscreen, 'closeDocument')
      .mockImplementation((callback?: any) => {
        if (typeof callback === 'function') {
          callback();
          return undefined as any;
        }
        return Promise.resolve() as any;
      });

    await closeOffscreenDocument();
    expect(closeSpy).toHaveBeenCalled();
  });
});
