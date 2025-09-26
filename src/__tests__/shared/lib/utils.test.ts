import { vi } from 'vitest';
import {
  cn,
  isChromeRuntimeAvailable,
  isSidePanelSupported,
  parseUrl,
} from '@/shared/lib/utils';

describe('cn', () => {
  it('merges class names while removing falsy values', () => {
    expect(cn('base', ['shadow'], { hidden: false, active: true })).toBe('base shadow active');
  });
});

describe('parseUrl', () => {
  it('returns a URL instance when the input is valid', () => {
    const result = parseUrl('https://example.com/features?tab=overview');

    expect(result).not.toBeNull();
    expect(result?.hostname).toBe('example.com');
    expect(result?.searchParams.get('tab')).toBe('overview');
  });

  it('returns null when no href is provided', () => {
    expect(parseUrl(undefined)).toBeNull();
    expect(parseUrl(null)).toBeNull();
  });

  it('logs a warning and returns null for invalid URLs', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(parseUrl('not-a-url')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0]?.[0]).toBe('Unable to parse URL');

    warnSpy.mockRestore();
  });
});

describe('Chrome runtime helpers', () => {
  const chromeGlobal = globalThis as typeof globalThis & {
    chrome?: {
      runtime?: unknown;
      sidePanel?: unknown;
    };
  };

  let originalChrome: typeof chromeGlobal.chrome;

  beforeEach(() => {
    originalChrome = chromeGlobal.chrome;
  });

  afterEach(() => {
    chromeGlobal.chrome = originalChrome;
  });

  it('returns true when chrome.runtime is available', () => {
    chromeGlobal.chrome = {
      ...(originalChrome ?? {}),
      runtime: {},
    };

    expect(isChromeRuntimeAvailable()).toBe(true);
  });

  it('returns false when chrome runtime is missing', () => {
    chromeGlobal.chrome = undefined;

    expect(isChromeRuntimeAvailable()).toBe(false);
  });

  it('detects side panel support when chrome.sidePanel exists', () => {
    chromeGlobal.chrome = {
      ...(originalChrome ?? {}),
      runtime: {},
      sidePanel: {},
    };

    expect(isSidePanelSupported()).toBe(true);
  });
});
