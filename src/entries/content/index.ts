import React from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/tailwind.css';

import { ContentApp } from './ContentApp';

const HOST_ID = 'tiny-helmet-content-host';
const MOUNT_ID = 'tiny-helmet-content-mount';

function createMountTree() {
  const existingHost = document.getElementById(HOST_ID);

  if (existingHost?.isConnected) {
    return { host: existingHost, mount: existingHost.shadowRoot?.getElementById(MOUNT_ID) };
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.inset = '0 auto auto 0';
  host.style.pointerEvents = 'none';

  const shadow = host.attachShadow({ mode: 'open' });

  const mount = document.createElement('div');
  mount.id = MOUNT_ID;
  mount.style.pointerEvents = 'auto';

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = chrome.runtime?.getURL('contentScript.css') ?? 'contentScript.css';

  shadow.append(stylesheet, mount);
  document.documentElement.appendChild(host);

  return { host, mount };
}

const { host, mount } = createMountTree();

if (!mount) {
  throw new Error('Unable to mount Tiny Helmet content UI');
}

const root = createRoot(mount);
root.render(
  React.createElement(React.StrictMode, null, React.createElement(ContentApp, { themeTarget: mount })),
);

const cleanup = () => {
  root.unmount();
  if (host.isConnected) {
    host.remove();
  }
};

window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);
