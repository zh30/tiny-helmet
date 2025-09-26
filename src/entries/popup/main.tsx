import '@/styles/tailwind.css';

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { PanelsTopLeft, SunMedium, MoonStar, Laptop } from 'lucide-react';

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

  const statusLabel = React.useMemo(() => {
    if (loading) {
      return getMessage('popup_status_loading', 'Loading preferences…');
    }
    if (ready) {
      return getMessage('popup_status_ready', 'Preferences synced');
    }
    return getMessage('popup_status_idle', 'Not synced yet');
  }, [loading, ready]);

  const currentTheme = settings.theme ?? 'system';
  const nextTheme = React.useMemo(() => {
    const index = THEME_CYCLE.indexOf(currentTheme);
    const nextIndex = (index + 1) % THEME_CYCLE.length;
    return THEME_CYCLE[nextIndex];
  }, [currentTheme]);

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
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
    } catch (error) {
      console.error('Failed to open side panel', error);
    }
  }, []);

  return (
    <div className="min-w-[22rem] max-w-sm space-y-3 p-4 text-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
          <h1 className="text-base font-semibold">{extensionName}</h1>
          <p className="text-xs text-muted-foreground">{tagline}</p>
        </div>
        <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          v{extensionVersion}
        </span>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{getMessage('popup_preferences_title', 'Preferences')}</CardTitle>
          <CardDescription>
            {getMessage('popup_preferences_description', 'Theme and automation for the side panel.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium leading-none">
                {getMessage('popup_theme_label', 'Theme')}
              </p>
              <p className="text-xs text-muted-foreground">
                {getMessage(
                  'popup_theme_current',
                  `Currently ${formatTheme(currentTheme)}`,
                  formatTheme(currentTheme),
                )}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setTheme(nextTheme)}>
              {themeIcon[nextTheme]}
              <span className="text-xs">
                {getMessage(
                  'popup_theme_next',
                  `Switch to ${formatTheme(nextTheme)}`,
                  formatTheme(nextTheme),
                )}
              </span>
            </Button>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium leading-none">
                {getMessage('popup_auto_open_label', 'Auto-open panel')}
              </p>
              <p className="text-xs text-muted-foreground">
                {getMessage('popup_auto_open_hint', 'Launch side panel on allowed hosts.')}
              </p>
            </div>
            <Button
              variant={settings.sidePanel.autoOpen ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSidePanelAutoOpen(!settings.sidePanel.autoOpen)}
            >
              {settings.sidePanel.autoOpen
                ? getMessage('popup_toggle_on', 'Enabled')
                : getMessage('popup_toggle_off', 'Disabled')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{getMessage('popup_host_title', 'Host allowlist')}</CardTitle>
          <CardDescription>
            {getMessage('popup_host_description', 'Syncs via chrome.storage across browsers.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={handleAddHost} className="flex gap-2">
            <Input
              placeholder={getMessage('popup_host_placeholder', 'example.com')}
              autoComplete="off"
              value={hostDraft}
              onChange={(event) => setHostDraft(event.target.value)}
            />
            <Button type="submit" size="sm" disabled={!hostDraft.trim()}>
              {getMessage('popup_host_add', 'Add')}
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {[...extensionConfig.sidePanel.allowedHosts, ...settings.pinnedHosts]
              .filter((host, index, array) => array.indexOf(host) === index)
              .map((host) => {
                const active = settings.pinnedHosts.includes(host);
                return (
                  <button
                    key={host}
                    type="button"
                    onClick={() => togglePinnedHost(host)}
                    className="group inline-flex items-center gap-1 rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground transition hover:bg-accent/80"
                    aria-pressed={active}
                  >
                    <span>{host}</span>
                    <span className="text-muted-foreground transition group-hover:text-destructive">
                      {active ? '×' : '+'}
                    </span>
                  </button>
                );
              })}
            {settings.pinnedHosts.length === 0 && (
              <span className="text-xs text-muted-foreground">
                {getMessage('popup_host_empty', 'Click a host to pin it for auto side panel.')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleOpenSidePanel}
        disabled={!isSidePanelSupported()}
      >
        <PanelsTopLeft className="h-4 w-4" aria-hidden />
        <span>{getMessage('popup_open_side_panel', 'Open side panel')}</span>
      </Button>
    </div>
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
