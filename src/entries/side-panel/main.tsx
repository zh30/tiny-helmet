import '@/styles/tailwind.css';

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { LinkIcon, Pin, PinOff, Info, LayoutTemplate, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

import { extensionConfig, isHostAllowed } from '@/shared/config/extension';
import { useExtensionHydration } from '@/shared/hooks/useExtensionHydration';
import { useChromeManifest } from '@/shared/hooks/useChromeManifest';
import { parseUrl } from '@/shared/lib/utils';
import { getExtensionName, getMessage } from '@/shared/platform/i18n';
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
import { useThemeSync } from '@/shared/hooks/useThemeSync';

function SidePanelApp() {
  const { ready } = useExtensionHydration();
  const { data: manifest } = useChromeManifest();
  const { settings, togglePinnedHost } = useExtensionStore();
  useThemeSync(settings.theme ?? 'system');
  const [currentHost, setCurrentHost] = React.useState<string | null>(null);

  const extensionName = manifest?.name ?? getExtensionName();

  React.useEffect(() => {
    let active = true;

    async function resolveActiveHost() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const url = parseUrl(tab?.url ?? undefined);
        if (active) {
          setCurrentHost(url?.hostname?.toLowerCase() ?? null);
        }
      } catch (error) {
        console.error('Failed to resolve active tab host', error);
        if (active) {
          setCurrentHost(null);
        }
      }
    }

    resolveActiveHost().catch((error) => console.error('Failed to resolve active tab host', error));

    const handleActivated: Parameters<typeof chrome.tabs.onActivated.addListener>[0] = () => {
      resolveActiveHost().catch((error) => console.error(error));
    };

    const handleUpdated: Parameters<typeof chrome.tabs.onUpdated.addListener>[0] = (
      _tabId,
      changeInfo,
      tab,
    ) => {
      if (tab.active && changeInfo.status === 'complete') {
        resolveActiveHost().catch((error) => console.error(error));
      }
    };

    chrome.tabs.onActivated.addListener(handleActivated);
    chrome.tabs.onUpdated.addListener(handleUpdated);

    return () => {
      active = false;
      chrome.tabs.onActivated.removeListener(handleActivated);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
    };
  }, []);

  const isPinned = currentHost ? settings.pinnedHosts.includes(currentHost) : false;
  const isDefaultAllowed = currentHost ? isHostAllowed(currentHost) : false;
  const canTogglePinned = Boolean(currentHost && !isDefaultAllowed);

  return (
    <div className="flex h-screen flex-col bg-background font-sans antialiased text-foreground">
      <header className="relative px-6 py-5 shrink-0 overflow-hidden border-b border-white/5 bg-card/40 backdrop-blur-md">
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-primary/5 to-transparent" />
        <h1 className="text-xl font-black tracking-tighter text-gradient">{extensionName}</h1>
        <div className="flex items-center gap-2 mt-1">
          <div className={clsx(
            "h-1.5 w-1.5 rounded-full transition-colors",
            ready ? "bg-primary animate-pulse" : "bg-muted"
          )} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {ready ? 'Active' : 'Syncing'}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto space-y-6 p-6 scrollbar-none">
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight">Current Session</h2>
          </div>

          <Card className="glass border-none premium-shadow overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-4 p-3 rounded-xl bg-accent/20 border border-white/5">
                <div className="rounded-lg bg-background p-2 group-hover:scale-110 transition-transform shadow-sm">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground/50 tracking-widest leading-none mb-1">Hostname</p>
                  <p className="text-sm font-bold truncate tracking-tight">{currentHost ?? 'Browser Interface'}</p>
                </div>
              </div>

              <div className="p-1">
                {currentHost ? (
                  <div className="flex items-start gap-3">
                    <Info className="h-3.5 w-3.5 mt-0.5 text-primary/60 shrink-0" />
                    <p className="text-xs font-medium leading-relaxed text-muted-foreground/70">
                      {isDefaultAllowed
                        ? "Special-case host with built-in support. Automation is always enabled."
                        : isPinned
                          ? "This host is pinned. The Side Panel will launch automatically when you visit."
                          : "Not pinned yet. Use the action button below to enable automation for this host."}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-muted-foreground/60">Detecting the active tab... Navigate to a webpage to unlock more features.</p>
                )}
              </div>

              <Button
                variant={isPinned ? 'secondary' : 'default'}
                className={clsx(
                  "w-full h-10 rounded-xl font-bold transition-all active:scale-[0.98]",
                  isPinned ? "bg-accent/40" : "bg-primary hover:bg-primary/90"
                )}
                disabled={!canTogglePinned}
                onClick={() => currentHost && togglePinnedHost(currentHost)}
              >
                {isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                {isPinned ? 'Unpin this host' : 'Pin this host'}
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight">Allowlist</h2>
            </div>
            <span className="text-[10px] font-bold bg-accent/30 text-muted-foreground px-2 py-0.5 rounded-full">
              {[...extensionConfig.sidePanel.allowedHosts, ...settings.pinnedHosts].length}
            </span>
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {[...extensionConfig.sidePanel.allowedHosts, ...settings.pinnedHosts]
                .map((host) => host.toLowerCase())
                .filter((host, index, array) => array.indexOf(host) === index)
                .map((host) => {
                  const isDefault = extensionConfig.sidePanel.allowedHosts.includes(host);
                  return (
                    <motion.div
                      key={host}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group flex items-center justify-between rounded-xl border border-white/5 bg-accent/10 px-4 py-3 hover:bg-accent/20 transition-all"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold tracking-tight">{host}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                          {isDefault ? 'Bundled' : 'Personal'}
                        </span>
                      </div>
                      {!isDefault && (
                        <button
                          onClick={() => togglePinnedHost(host)}
                          className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <PinOff className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
            </AnimatePresence>

            {settings.pinnedHosts.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-[11px] font-medium text-muted-foreground/50">Your custom allowlist is empty. Add sites from the popup or this panel.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="p-6 shrink-0 border-t border-white/5 bg-background/50">
        <p className="text-[10px] font-bold text-center text-muted-foreground/30 uppercase tracking-[0.2em]">
          Tiny Helmet Scaffold v{manifest?.version ?? '0.1.0'}
        </p>
      </footer>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Side panel root element missing');
}

createRoot(container).render(
  <React.StrictMode>
    <AppProviders>
      <SidePanelApp />
    </AppProviders>
  </React.StrictMode>,
);

// Minimal Shield import for the icon used in list header
const Shield = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);
