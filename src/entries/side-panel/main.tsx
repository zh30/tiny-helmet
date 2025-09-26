import '@/styles/tailwind.css';

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { LinkIcon, Pin, PinOff } from 'lucide-react';

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

function SidePanelApp() {
  const { ready } = useExtensionHydration();
  const { data: manifest } = useChromeManifest();
  const { settings, togglePinnedHost } = useExtensionStore();
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
    <div className="min-h-screen bg-background text-sm">
      <header className="border-b border-border bg-card/50 p-4">
        <h1 className="text-base font-semibold">{extensionName}</h1>
        <p className="text-xs text-muted-foreground">
          {ready
            ? getMessage('sidepanel_status_ready', 'Synced with chrome.storage')
            : getMessage('sidepanel_status_syncing', 'Syncing preferences…')}
        </p>
      </header>

      <main className="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>{getMessage('sidepanel_current_host_title', 'Current host')}</CardTitle>
            <CardDescription>
              {getMessage('sidepanel_current_host_description', 'Control the automation for this domain.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <LinkIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>{currentHost ?? getMessage('sidepanel_no_tab', 'No active tab detected')}</span>
            </div>

            <div className="text-xs text-muted-foreground">
              {currentHost ? (
                <p>
                  {isDefaultAllowed
                    ? getMessage(
                        'sidepanel_host_bundled',
                        'This host ships with the scaffold and always has the panel available.',
                      )
                    : isPinned
                      ? getMessage(
                          'sidepanel_host_pinned',
                          'Pinned: the side panel opens automatically when you visit this host.',
                        )
                      : getMessage(
                          'sidepanel_host_unpinned',
                          'Not pinned yet. Pin it to auto-open the panel.',
                        )}
                </p>
              ) : (
                <p>{getMessage('sidepanel_switch_tab', 'Switch to a tab to manage its behaviour.')}</p>
              )}
            </div>

            <Button
              variant={isPinned ? 'secondary' : 'outline'}
              size="sm"
              disabled={!canTogglePinned}
              onClick={() => currentHost && togglePinnedHost(currentHost)}
            >
              {isPinned ? <PinOff className="h-4 w-4" aria-hidden /> : <Pin className="h-4 w-4" aria-hidden />}
              <span>
                {isPinned
                  ? getMessage('sidepanel_unpin_host', 'Unpin host')
                  : getMessage('sidepanel_pin_host', 'Pin host')}
              </span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{getMessage('sidepanel_auto_hosts_title', 'Auto-open hosts')}</CardTitle>
            <CardDescription>
              {getMessage('sidepanel_auto_hosts_description', 'Combined defaults and your custom allowlist.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {[...extensionConfig.sidePanel.allowedHosts, ...settings.pinnedHosts]
                .map((host) => host.toLowerCase())
                .filter((host, index, array) => array.indexOf(host) === index)
                .map((host) => (
                  <li
                    key={host}
                    className="flex items-center justify-between rounded-md border border-border bg-card/60 px-3 py-2"
                  >
                    <span className="text-xs font-medium">{host}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {extensionConfig.sidePanel.allowedHosts.includes(host)
                        ? getMessage('sidepanel_host_badge_bundled', 'bundled')
                        : getMessage('sidepanel_host_badge_custom', 'custom')}
                    </span>
                  </li>
                ))}
              {settings.pinnedHosts.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  {getMessage('sidepanel_no_custom_hosts', 'Add hosts from the popup to see them here.')}
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </main>
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
