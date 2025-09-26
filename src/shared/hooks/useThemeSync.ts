import * as React from 'react';

import type { ThemePreference } from '@/shared/config/extension';

const DARK_QUERY = '(prefers-color-scheme: dark)';

type ThemeTarget = Document | HTMLElement;

type ResolvedTheme = 'light' | 'dark';

function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return preference;
}

function applyTheme(target: ThemeTarget, preference: ThemePreference, resolved: ResolvedTheme) {
  const element = target instanceof Document ? target.documentElement : target;
  if (!element) {
    return;
  }

  element.setAttribute('data-theme-preference', preference);
  element.setAttribute('data-theme', resolved);

  if (target instanceof Document) {
    element.classList.toggle('dark', resolved === 'dark');
    element.classList.toggle('light', resolved === 'light');
    element.style.colorScheme = resolved;
  }
}

export function useThemeSync(theme: ThemePreference, target?: ThemeTarget | null) {
  React.useEffect(() => {
    const resolvedTarget: ThemeTarget | null = target ?? (typeof document !== 'undefined' ? document : null);
    if (!resolvedTarget) {
      return undefined;
    }

    const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(DARK_QUERY)
      : null;

    const apply = (matches = media?.matches ?? false) => {
      const resolved = resolveTheme(theme, matches);
      applyTheme(resolvedTarget, theme, resolved);
    };

    apply();

    if (theme === 'system' && media) {
      const listener = (event: MediaQueryListEvent) => apply(event.matches);
      media.addEventListener('change', listener);
      return () => {
        media.removeEventListener('change', listener);
        if (!(resolvedTarget instanceof Document)) {
          const element = resolvedTarget;
          element.removeAttribute('data-theme');
          element.removeAttribute('data-theme-preference');
        }
      };
    }

    return () => {
      if (!(resolvedTarget instanceof Document)) {
        const element = resolvedTarget;
        element.removeAttribute('data-theme');
        element.removeAttribute('data-theme-preference');
      }
    };
  }, [theme, target]);
}
