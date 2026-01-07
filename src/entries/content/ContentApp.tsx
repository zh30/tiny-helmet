import * as React from 'react';
import {
  extensionConfig,
  isHostAllowed,
  type ExtensionSettings,
} from '@/shared/config/extension';
import { parseUrl } from '@/shared/lib/utils';
import { getMessage } from '@/shared/platform/i18n';
import { loadSettings, subscribeToSettings } from '@/shared/platform/storage';
import { useThemeSync } from '@/shared/hooks/useThemeSync';
import { motion, AnimatePresence } from 'framer-motion';
import { sendMessage } from '@/shared/platform/messaging';
import { Zap } from 'lucide-react';

const PAGE_FLAG = 'data-tiny-helmet';

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

export function ContentApp({ themeTarget }: { themeTarget: HTMLElement }) {
  const url = React.useMemo(() => parseUrl(window.location.href), []);
  const hostname = url?.hostname.toLowerCase() ?? null;
  const [{ status, settings, isAllowed }, setState] = React.useState<ContentState>(
    () => ({
      status: 'loading',
      settings: extensionConfig.defaultSettings,
      isAllowed: false,
    }),
  );

  const [selection, setSelection] = React.useState<{
    text: string;
    x: number;
    y: number;
    visible: boolean;
  }>({ text: '', x: 0, y: 0, visible: false });

  React.useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Small delay to ensure selection is processed by browser
      setTimeout(() => {
        const sel = window.getSelection();
        const selectedText = sel?.toString().trim();

        if (selectedText && selectedText.length > 0 && sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const rects = range.getClientRects();

          if (rects.length === 0) return;

          // Use the last rect to position at the end of the selection
          const lastRect = rects[rects.length - 1];

          const isInsideApp = e.composedPath().some(el => el === themeTarget);
          if (isInsideApp) return;

          setSelection({
            text: selectedText,
            x: lastRect.right + 2,
            y: lastRect.bottom + 2,
            visible: true,
          });
        } else {
          // If no text is selected, check if we clicked outside our app to hide
          const isInsideApp = e.composedPath().some(el => el === themeTarget);
          if (!isInsideApp) {
            setSelection((prev) => (prev.visible ? { ...prev, visible: false } : prev));
          }
        }
      }, 150);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // If clicking outside our mount point (Shadow DOM), hide the popover
      const isInsideApp = e.composedPath().some((el) => el === themeTarget);
      if (!isInsideApp) {
        setSelection((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [themeTarget]);

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

      const allowed =
        isHostAllowed(hostname) || nextSettings.pinnedHosts.includes(hostname);

      setState({ status: 'ready', settings: nextSettings, isAllowed: allowed });

      unsub = subscribeToSettings((incoming) => {
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
    const root = document.documentElement;
    root.setAttribute(PAGE_FLAG, 'ready');
    return () => {
      root.removeAttribute(PAGE_FLAG);
    };
  }, []);

  useThemeSync(settings.theme ?? 'system', themeTarget);

  const handleOpenSidePanel = React.useCallback(async () => {
    try {
      await sendMessage('tiny-helmet:open-side-panel', undefined);
    } catch (error) {
      console.error('Failed to open side panel from content script', error);
    }
  }, []);

  const handleSelectionClick = React.useCallback(async () => {
    try {
      await sendMessage('tiny-helmet:show-notification', {
        title: 'Text Action',
        message: `You selected: "${selection.text.substring(0, 30)}${selection.text.length > 30 ? '...' : ''}"`,
      });
      setSelection(s => ({ ...s, visible: false }));
    } catch (error) {
      console.error('Failed to show notification', error);
    }
  }, [selection.text]);

  if (!hostname || status === 'loading') {
    return null;
  }

  const autoOpen = settings.sidePanel.autoOpen;
  const label = autoOpen ? READY_LABEL : OPEN_LABEL;

  return (
    <>
      <AnimatePresence>
        {selection.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              position: 'fixed',
              left: selection.x,
              top: selection.y,
              zIndex: 2147483647,
              cursor: 'pointer'
            }}
          >
            <button
              onClick={handleSelectionClick}
              className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white shadow-xl hover:scale-110 active:scale-90 transition-transform premium-shadow border border-white/20 glass cursor-pointer"
              title="Click to process selection"
            >
              <Zap className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isAllowed && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-8 right-8 z-2147483647 flex items-center gap-3 rounded-2xl border border-white/20 bg-primary/90 px-5 py-3 text-sm font-bold text-primary-foreground shadow-2xl backdrop-blur-xl transition-all duration-300 premium-shadow hover:bg-primary cursor-pointer"
          aria-label={`${OPEN_ARIA_LABEL} (${hostname})`}
          data-host={hostname}
          onClick={handleOpenSidePanel}
        >
          <div className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary-foreground" />
          </div>
          <span className="tracking-tight">{label}</span>
        </motion.button>
      )}
    </>
  );
}
