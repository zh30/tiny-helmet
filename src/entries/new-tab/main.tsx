import '@/styles/tailwind.css';

import { Settings } from 'lucide-react';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { useChromeManifest } from '@/shared/hooks/useChromeManifest';
import { getExtensionName } from '@/shared/platform/i18n';
import { AppProviders } from '@/shared/providers/AppProviders';
import { Button } from '@/shared/ui/button';

function NewTabApp() {
  const { data: manifest } = useChromeManifest();
  const extensionName = manifest?.name ?? getExtensionName();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background p-6 font-sans text-foreground">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{extensionName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Chrome extension framework starter</p>
      </div>
      <Button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
        <Settings className="mr-2 h-4 w-4" />
        Open settings
      </Button>
    </main>
  );
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('New tab root element missing');
}

createRoot(container).render(
  <React.StrictMode>
    <AppProviders>
      <NewTabApp />
    </AppProviders>
  </React.StrictMode>
);
