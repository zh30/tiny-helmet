import '@/styles/tailwind.css';

import { clsx } from 'clsx';
import { Laptop, MoonStar, Settings, SunMedium } from 'lucide-react';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { useExtensionHydration } from '@/shared/hooks/useExtensionHydration';
import { useThemeSync } from '@/shared/hooks/useThemeSync';
import { getExtensionName, getMessage } from '@/shared/platform/i18n';
import { AppProviders } from '@/shared/providers/AppProviders';
import { useExtensionStore } from '@/shared/state/useExtensionStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

const THEMES = [
  { value: 'system', label: 'System', icon: Laptop },
  { value: 'light', label: 'Light', icon: SunMedium },
  { value: 'dark', label: 'Dark', icon: MoonStar },
] as const;

function OptionsApp() {
  const { loading } = useExtensionHydration();
  const { settings, setTheme, setSidePanelAutoOpen } = useExtensionStore();
  const currentTheme = settings.theme ?? 'system';
  const extensionName = getExtensionName();

  useThemeSync(currentTheme);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">
          {getMessage('popup_status_loading', 'Loading preferences...')}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 font-sans text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <div className="rounded-md border bg-card p-2">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{extensionName}</h1>
            <p className="text-sm text-muted-foreground">
              {getMessage('popup_preferences_description', 'Theme and side panel preferences.')}
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{getMessage('popup_preferences_title', 'Preferences')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-medium">{getMessage('popup_theme_label', 'Theme')}</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {THEMES.map((theme) => {
                  const Icon = theme.icon;
                  return (
                    <button
                      type="button"
                      key={theme.value}
                      onClick={() => setTheme(theme.value)}
                      className={clsx(
                        'flex items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors',
                        currentTheme === theme.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'bg-card hover:bg-accent'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex items-center justify-between gap-4 rounded-md border bg-card px-4 py-3">
              <div>
                <h2 className="text-sm font-medium">
                  {getMessage('popup_auto_open_label', 'Auto-open panel')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {getMessage('popup_auto_open_hint', 'Launch side panel on allowed hosts.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSidePanelAutoOpen(!settings.sidePanel.autoOpen)}
                className={clsx(
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                  settings.sidePanel.autoOpen ? 'bg-primary' : 'bg-muted'
                )}
                aria-pressed={settings.sidePanel.autoOpen}
              >
                <span
                  className={clsx(
                    'block h-5 w-5 rounded-full bg-background shadow transition-transform',
                    settings.sidePanel.autoOpen ? 'translate-x-5' : 'translate-x-1'
                  )}
                />
              </button>
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Options root element missing');
}

createRoot(container).render(
  <React.StrictMode>
    <AppProviders>
      <OptionsApp />
    </AppProviders>
  </React.StrictMode>
);
