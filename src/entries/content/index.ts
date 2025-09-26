import {
  extensionConfig,
  type ThemePreference,
  isHostAllowed,
} from '@/shared/config/extension';
import { parseUrl } from '@/shared/lib/utils';
import { getMessage } from '@/shared/platform/i18n';
import { loadSettings, subscribeToSettings } from '@/shared/platform/storage';

const PAGE_FLAG = 'data-tiny-helmet';
let sidePanelButton: HTMLButtonElement | null = null;
let unsubscribeSettings: (() => void) | null = null;

const OPEN_LABEL = getMessage('content_open_side_panel', 'Open side panel');
const READY_LABEL = getMessage('content_side_panel_ready', 'Side panel ready');

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

function updateSidePanelIndicator(hostname: string, autoOpen: boolean) {
  if (!('chrome' in globalThis) || !chrome.runtime?.sendMessage) {
    return;
  }

  const label = autoOpen ? READY_LABEL : OPEN_LABEL;

  if (sidePanelButton) {
    sidePanelButton.dataset.host = hostname;
    sidePanelButton.textContent = label;
    return;
  }

  sidePanelButton = document.createElement('button');
  sidePanelButton.type = 'button';
  sidePanelButton.dataset.host = hostname;
  sidePanelButton.textContent = label;
  sidePanelButton.ariaLabel = getMessage('content_open_side_panel_aria', 'Open Tiny Helmet side panel');

  Object.assign(sidePanelButton.style, {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    zIndex: '2147483647',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '999px',
    border: '1px solid hsl(262 83% 57% / 0.35)',
    background: 'hsl(262 83% 57%)',
    color: '#fff',
    fontSize: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 12px 24px hsl(262 83% 30% / 0.25)',
  });

  sidePanelButton.addEventListener('mouseenter', () => {
    if (sidePanelButton) {
      sidePanelButton.style.background = 'hsl(262 83% 52%)';
    }
  });
  sidePanelButton.addEventListener('mouseleave', () => {
    if (sidePanelButton) {
      sidePanelButton.style.background = 'hsl(262 83% 57%)';
    }
  });

  sidePanelButton.addEventListener('click', () => {
    chrome.runtime
      .sendMessage({ type: 'tiny-helmet:open-side-panel' })
      .catch((error) => {
        console.error('Failed to open side panel from content script', error);
      });
  });

  document.body.appendChild(sidePanelButton);
}

function removeSidePanelIndicator() {
  if (sidePanelButton?.isConnected) {
    sidePanelButton.remove();
  }
  sidePanelButton = null;
}

function syncSidePanelIndicator(hostname: string, autoOpen: boolean, allowed: boolean) {
  if (allowed) {
    updateSidePanelIndicator(hostname, autoOpen);
  } else {
    removeSidePanelIndicator();
  }
}

async function bootstrap() {
  const url = parseUrl(window.location.href);
  if (!url) {
    return;
  }

  const hostname = url.hostname.toLowerCase();
  const settings = await loadSettings();

  applyThemePreference(settings.theme);

  const initialAllowed = isHostAllowed(hostname) || settings.pinnedHosts.includes(hostname);
  syncSidePanelIndicator(hostname, settings.sidePanel.autoOpen, initialAllowed);

  unsubscribeSettings = subscribeToSettings((nextSettings) => {
    applyThemePreference(nextSettings.theme);
    const allowed = isHostAllowed(hostname) || nextSettings.pinnedHosts.includes(hostname);
    syncSidePanelIndicator(hostname, nextSettings.sidePanel.autoOpen, allowed);
  });
}

function cleanup() {
  removeSidePanelIndicator();
  if (unsubscribeSettings) {
    unsubscribeSettings();
    unsubscribeSettings = null;
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrap().catch((error) => console.error('Failed to bootstrap content script', error));
} else {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrap().catch((error) => console.error('Failed to bootstrap content script', error));
  });
}

window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);
