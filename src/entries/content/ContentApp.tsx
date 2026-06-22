import { motion } from 'framer-motion';
import * as React from 'react';
import { type ExtensionSettings, extensionConfig, isHostAllowed } from '@/shared/config/extension';
import { useThemeSync } from '@/shared/hooks/useThemeSync';
import { parseUrl } from '@/shared/lib/utils';
import { getMessage } from '@/shared/platform/i18n';
import { sendMessage } from '@/shared/platform/messaging';
import { loadSettings, subscribeToSettings } from '@/shared/platform/storage';

const PAGE_FLAG = 'data-crxkit';

type ContentState = {
  status: 'loading' | 'ready';
  settings: ExtensionSettings;
  isAllowed: boolean;
};

const OPEN_LABEL = getMessage('content_open_side_panel', 'Open side panel');
const READY_LABEL = getMessage('content_side_panel_ready', 'Side panel ready');
const OPEN_ARIA_LABEL = getMessage('content_open_side_panel_aria', 'Open CRXKit side panel');

export function ContentApp({ themeTarget }: { themeTarget: HTMLElement }) {
  const url = React.useMemo(() => parseUrl(window.location.href), []);
  const hostname = url?.hostname.toLowerCase() ?? null;
  const [{ status, settings, isAllowed }, setState] = React.useState<ContentState>(() => ({
    status: 'loading',
    settings: extensionConfig.defaultSettings,
    isAllowed: false,
  }));

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

      const allowed = isHostAllowed(hostname) || nextSettings.pinnedHosts.includes(hostname);

      setState({ status: 'ready', settings: nextSettings, isAllowed: allowed });

      unsub = subscribeToSettings((incoming) => {
        const allowedHost = isHostAllowed(hostname) || incoming.pinnedHosts.includes(hostname);
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
    const root = document.documentElement;
    root.setAttribute(PAGE_FLAG, 'ready');
    return () => {
      root.removeAttribute(PAGE_FLAG);
    };
  }, []);

  useThemeSync(settings.theme ?? 'system', themeTarget);

  const handleOpenSidePanel = React.useCallback(async () => {
    try {
      await sendMessage('crxkit:open-side-panel', undefined);
    } catch (error) {
      console.error('Failed to open side panel from content script', error);
    }
  }, []);

  if (!hostname || status === 'loading') {
    return null;
  }

  const autoOpen = settings.sidePanel.autoOpen;
  const label = autoOpen ? READY_LABEL : OPEN_LABEL;

  if (!isAllowed) {
    return null;
  }

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-8 right-8 z-2147483647 flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
      aria-label={`${OPEN_ARIA_LABEL} (${hostname})`}
      data-host={hostname}
      onClick={handleOpenSidePanel}
    >
      <span className="h-2 w-2 rounded-full bg-primary-foreground" />
      <span>{label}</span>
    </motion.button>
  );
}
