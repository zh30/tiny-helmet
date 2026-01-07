import '@/styles/tailwind.css';

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { PanelsTopLeft, SunMedium, MoonStar, Laptop, Plus, X, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

import { extensionConfig, type ThemePreference } from '@/shared/config/extension';
import { useExtensionHydration } from '@/shared/hooks/useExtensionHydration';
import { useChromeManifest } from '@/shared/hooks/useChromeManifest';
import { isSidePanelSupported } from '@/shared/lib/utils';
import { getExtensionDescription, getExtensionName, getMessage } from '@/shared/platform/i18n';
import { useExtensionStore } from '@/shared/state/useExtensionStore';
import { AppProviders } from '@/shared/providers/AppProviders';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { useThemeSync } from '@/shared/hooks/useThemeSync';
import { sendMessage } from '@/shared/platform/messaging';

const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

const themeIcon: Record<ThemePreference, React.ReactNode> = {
  system: <Laptop className="h-4 w-4" aria-hidden />,
  light: <SunMedium className="h-4 w-4" aria-hidden />,
  dark: <MoonStar className="h-4 w-4" aria-hidden />,
};

function formatTheme(theme: ThemePreference) {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

function normalizeHost(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    return url.hostname.toLowerCase();
  } catch (error) {
    console.warn('Invalid host input', input, error);
    return null;
  }
}

function PopupApp() {
  const { ready, loading } = useExtensionHydration();
  const { data: manifest } = useChromeManifest();
  const { settings, setTheme, togglePinnedHost, setSidePanelAutoOpen } = useExtensionStore();
  const [hostDraft, setHostDraft] = React.useState('');

  const extensionName = manifest?.name ?? getExtensionName();
  const extensionVersion = manifest?.version ?? '0.0.0';
  const tagline = getMessage('popup_tagline', getExtensionDescription());

  const currentTheme = settings.theme ?? 'system';
  useThemeSync(currentTheme);

  const handleAddHost = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const normalized = normalizeHost(hostDraft);

      if (!normalized) {
        return;
      }

      if (settings.pinnedHosts.includes(normalized)) {
        setHostDraft('');
        return;
      }

      await togglePinnedHost(normalized);
      setHostDraft('');
    },
    [hostDraft, settings.pinnedHosts, togglePinnedHost],
  );

  const handleOpenSidePanel = React.useCallback(async () => {
    if (!isSidePanelSupported()) {
      return;
    }

    try {
      await sendMessage('tiny-helmet:open-side-panel', undefined);
    } catch (error) {
      console.error('Failed to open side panel', error);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-w-88 max-w-sm overflow-hidden bg-background font-sans antialiased"
    >
      <header className="relative space-y-4 px-6 pt-8 pb-6">
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/20 via-primary/5 to-transparent" />
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ x: -10 }}
            animate={{ x: 0 }}
            className="flex flex-col"
          >
            <h1 className="text-2xl font-black tracking-tighter text-gradient">{extensionName}</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              v{extensionVersion} • {ready ? 'Synced' : 'Connecting'}
            </p>
          </motion.div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-background/50 hover:bg-background transition-colors"
            onClick={() => chrome.runtime.openOptionsPage()}
            aria-label="Open settings"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs font-medium leading-relaxed text-muted-foreground/80">{tagline}</p>
      </header>

      <div className="space-y-4 px-6 pb-8 text-sm">
        <Card className="glass premium-shadow border-none overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pb-5 px-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Theme</span>
              <div className="flex gap-1 rounded-full bg-accent/30 p-1">
                {THEME_CYCLE.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    title={formatTheme(t)}
                    className={clsx(
                      "rounded-full p-2 transition-all duration-200",
                      currentTheme === t
                        ? "bg-background text-primary shadow-sm scale-110"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                    )}
                  >
                    {themeIcon[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold">Auto-open Panel</span>
                <p className="text-[10px] text-muted-foreground leading-tight">Launch panel on allowed hosts</p>
              </div>
              <button
                onClick={() => setSidePanelAutoOpen(!settings.sidePanel.autoOpen)}
                className={clsx(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  settings.sidePanel.autoOpen ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={clsx(
                    "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                    settings.sidePanel.autoOpen ? "translate-x-4" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass premium-shadow border-none overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
              Host Allowlist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-5 px-5">
            <form onSubmit={handleAddHost} className="relative flex items-center">
              <Input
                placeholder="Add host (e.g. google.com)"
                className="pr-10 bg-background/50 border-white/10"
                autoComplete="off"
                value={hostDraft}
                onChange={(event) => setHostDraft(event.target.value)}
              />
              <button
                type="submit"
                disabled={!hostDraft.trim()}
                className="absolute right-3 text-primary disabled:text-muted-foreground/40 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            <div className="flex flex-wrap gap-2 min-h-6">
              <AnimatePresence mode="popLayout">
                {[...extensionConfig.sidePanel.allowedHosts, ...settings.pinnedHosts]
                  .filter((host, index, array) => array.indexOf(host) === index)
                  .map((host) => {
                    const pinned = settings.pinnedHosts.includes(host);
                    const isDefault = extensionConfig.sidePanel.allowedHosts.includes(host);
                    return (
                      <motion.div
                        key={host}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={clsx(
                          "group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all",
                          isDefault
                            ? "bg-primary/5 border-primary/20 text-primary"
                            : "bg-accent/40 border-white/5 text-foreground/80 hover:bg-accent/60"
                        )}
                      >
                        <span>{host}</span>
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => togglePinnedHost(host)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        {isDefault && <div className="h-1 w-1 rounded-full bg-primary/40" />}
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
              {settings.pinnedHosts.length === 0 && (
                <p className="text-[10px] italic text-muted-foreground/60 w-full text-center py-2">
                  No custom hosts added yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          variant="default"
          className="w-full h-11 rounded-xl glass premium-shadow bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={handleOpenSidePanel}
          disabled={!isSidePanelSupported()}
        >
          <PanelsTopLeft className="mr-2 h-4 w-4" />
          <span>Open Side Panel</span>
        </Button>
      </div>
    </motion.div>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Popup root element missing');
}

createRoot(container).render(
  <React.StrictMode>
    <AppProviders>
      <PopupApp />
    </AppProviders>
  </React.StrictMode>,
);
