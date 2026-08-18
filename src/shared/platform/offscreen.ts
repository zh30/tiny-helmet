/**
 * Chrome MV3 Offscreen Document helper.
 * Provides DOM, Audio, Clipboard, and WebRTC capabilities to the background service worker.
 */

export interface OffscreenDocumentOptions {
  path: string;
  reasons: chrome.offscreen.Reason[];
  justification: string;
}

export async function hasOffscreenDocument(path: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.offscreen) {
    return false;
  }

  if ('hasDocument' in chrome.offscreen && typeof chrome.offscreen.hasDocument === 'function') {
    return await chrome.offscreen.hasDocument();
  }

  // Fallback for environments with clients.matchAll
  const swGlobal = globalThis as unknown as {
    clients?: { matchAll: () => Promise<Array<{ url: string }>> };
  };
  if (swGlobal.clients?.matchAll) {
    const matchedClients = await swGlobal.clients.matchAll();
    return matchedClients.some((client) => client.url.includes(path));
  }

  return false;
}

export async function ensureOffscreenDocument(options: OffscreenDocumentOptions): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.offscreen?.createDocument) {
    console.warn('chrome.offscreen API is not available in this environment');
    return;
  }

  const exists = await hasOffscreenDocument(options.path);
  if (exists) {
    return;
  }

  try {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL(options.path),
      reasons: options.reasons,
      justification: options.justification,
    });
  } catch (error) {
    // Check if error is because document was created concurrently
    if (
      error instanceof Error &&
      error.message.includes('Only a single offscreen document may be created')
    ) {
      return;
    }
    throw error;
  }
}

export async function closeOffscreenDocument(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.offscreen?.closeDocument) {
    return;
  }

  try {
    await chrome.offscreen.closeDocument();
  } catch (error) {
    console.warn('Failed to close offscreen document', error);
  }
}
