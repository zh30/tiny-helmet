import * as React from 'react';
import {
  extensionConfig,
  isHostAllowed,
  type ExtensionSettings,
  type ThemePreference,
} from '@/shared/config/extension';
import { parseUrl } from '@/shared/lib/utils';
import { getMessage } from '@/shared/platform/i18n';
import { loadSettings, subscribeToSettings } from '@/shared/platform/storage';

const PAGE_FLAG = 'data-tiny-helmet';

function applyThemePreference(preference: ThemePreference) {
  const root = document.documentElement;
  root.setAttribute(PAGE_FLAG, 'ready');
  root.dataset.theme = preference;

  if (preference === 'system') {
    root.removeAttribute('data-force-theme');
  } else {
    root.setAttribute('data-force-theme', preference);
  }
}

type ContentState = {
  status: 'loading' | 'ready';
  settings: ExtensionSettings;
  isAllowed: boolean;
};

const OPEN_LABEL = getMessage('content_open_side_panel', 'Open side panel');
const READY_LABEL = getMessage('content_side_panel_ready', 'Side panel ready');
const OPEN_ARIA_LABEL = getMessage(
  'content_open_side_panel_aria',
  'Open Tiny Helmet side panel',
);

export function ContentApp() {
  const url = React.useMemo(() => parseUrl(window.location.href), []);
  const hostname = url?.hostname.toLowerCase() ?? null;
  const [{ status, settings, isAllowed }, setState] = React.useState<ContentState>(
    () => ({
      status: 'loading',
      settings: extensionConfig.defaultSettings,
      isAllowed: false,
    }),
  );

  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    let active = true;

    async function hydrate() {
      if (!hostname) {
        setState((current) => ({ ...current, status: 'ready', isAllowed: false }));
        return;
      }

      const nextSettings = await loadSettings();

      if (!active) {
        return;
      }

      applyThemePreference(nextSettings.theme);

      const allowed =
        isHostAllowed(hostname) || nextSettings.pinnedHosts.includes(hostname);

      setState({ status: 'ready', settings: nextSettings, isAllowed: allowed });

      unsub = subscribeToSettings((incoming) => {
        applyThemePreference(incoming.theme);
        const allowedHost =
          isHostAllowed(hostname) || incoming.pinnedHosts.includes(hostname);
        setState({ status: 'ready', settings: incoming, isAllowed: allowedHost });
      });
    }

    hydrate().catch((error) => {
      console.error('Failed to bootstrap content script', error);
      setState((current) => ({ ...current, status: 'ready', isAllowed: false }));
    });

    return () => {
      active = false;
      unsub?.();
    };
  }, [hostname]);

  React.useEffect(() => {
    return () => {
      document.documentElement.removeAttribute(PAGE_FLAG);
      document.documentElement.removeAttribute('data-force-theme');
      delete document.documentElement.dataset.theme;
    };
  }, []);

  const handleOpenSidePanel = React.useCallback(() => {
    if (!chrome.runtime?.sendMessage) {
      return;
    }

    chrome.runtime
      .sendMessage({ type: 'tiny-helmet:open-side-panel' })
      .catch((error) => console.error('Failed to open side panel from content script', error));
  }, []);

  if (!hostname || status === 'loading' || !isAllowed) {
    return null;
  }

  const autoOpen = settings.sidePanel.autoOpen;
  const label = autoOpen ? READY_LABEL : OPEN_LABEL;

  return (
    <button
      type="button"
      className="fixed bottom-6 right-6 z-[2147483647] inline-flex items-center justify-center gap-2 rounded-full border border-primary/35 bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-2xl shadow-primary/30 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
      aria-label={`${OPEN_ARIA_LABEL} (${hostname})`}
      data-host={hostname}
      onClick={handleOpenSidePanel}
    >
      <span className="flex size-2 rounded-full bg-primary-foreground/80" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
