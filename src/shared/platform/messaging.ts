/**
 * Type-safe RPC message passing system for Chrome Extensions.
 * Supports strongly typed request/response contracts, timeout protection,
 * error propagation, and tab broadcast.
 */

export interface MessageMap {
  'crxkit:open-side-panel': {
    payload?: undefined;
    response: { ok: boolean; error?: string };
  };
  'crxkit:get-tab-info': {
    payload?: undefined;
    response: { url?: string; id?: number };
  };
  'crxkit:ping': {
    payload?: { timestamp: number };
    response: { pong: boolean; timestamp: number };
  };
}

export type MessageType = keyof MessageMap;

export interface MessageEnvelope<T = unknown> {
  type: string;
  payload?: T;
  id?: string;
  timestamp?: number;
}

export interface SendMessageOptions {
  timeoutMs?: number;
}

export interface SendTabMessageOptions extends SendMessageOptions {
  frameId?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;

function createTimeoutPromise<T>(ms: number, messageType: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Message timeout after ${ms}ms for "${messageType}"`));
    }, ms);
  });
}

function getLastError(): { message?: string } | undefined {
  return (chrome.runtime as unknown as { lastError?: { message?: string } })?.lastError;
}

/**
 * Sends a type-safe message to the extension background service worker or open views.
 */
export async function sendMessage<T extends MessageType>(
  type: T,
  payload?: MessageMap[T]['payload'],
  options: SendMessageOptions = {}
): Promise<MessageMap[T]['response']> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw new Error('Chrome runtime messaging API is unavailable');
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const envelope: MessageEnvelope = {
    type: String(type),
    payload,
    timestamp: Date.now(),
  };

  const sendPromise = new Promise<MessageMap[T]['response']>((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(envelope, undefined, (response: unknown) => {
        const lastError = getLastError();
        if (lastError) {
          reject(new Error(lastError.message || `Failed to send message: ${String(type)}`));
          return;
        }
        resolve(response as MessageMap[T]['response']);
      });
    } catch (error) {
      reject(error);
    }
  });

  return Promise.race([
    sendPromise,
    createTimeoutPromise<MessageMap[T]['response']>(timeoutMs, String(type)),
  ]);
}

/**
 * Sends a type-safe message to a specific tab / content script.
 */
export async function sendMessageToTab<T extends MessageType>(
  tabId: number,
  type: T,
  payload?: MessageMap[T]['payload'],
  options: SendTabMessageOptions = {}
): Promise<MessageMap[T]['response']> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) {
    throw new Error('Chrome tabs messaging API is unavailable');
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const envelope: MessageEnvelope = {
    type: String(type),
    payload,
    timestamp: Date.now(),
  };

  const sendOptions: { frameId?: number } = {};
  if (typeof options.frameId === 'number') {
    sendOptions.frameId = options.frameId;
  }

  const sendPromise = new Promise<MessageMap[T]['response']>((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, envelope, sendOptions, (response: unknown) => {
        const lastError = getLastError();
        if (lastError) {
          reject(
            new Error(
              lastError.message || `Failed to send message to tab ${tabId}: ${String(type)}`
            )
          );
          return;
        }
        resolve(response as MessageMap[T]['response']);
      });
    } catch (error) {
      reject(error);
    }
  });

  return Promise.race([
    sendPromise,
    createTimeoutPromise<MessageMap[T]['response']>(timeoutMs, String(type)),
  ]);
}

/**
 * Broadcasts a message to all active tabs that have content scripts loaded.
 */
export async function broadcastToTabs<T extends MessageType>(
  type: T,
  payload?: MessageMap[T]['payload']
): Promise<Array<{ tabId: number; result?: MessageMap[T]['response']; error?: string }>> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return [];
  }

  try {
    const tabs = await chrome.tabs.query({});
    const tasks = tabs
      .filter((tab) => typeof tab.id === 'number')
      .map(async (tab) => {
        try {
          const result = await sendMessageToTab(tab.id as number, type, payload, {
            timeoutMs: 3000,
          });
          return { tabId: tab.id as number, result };
        } catch (error) {
          return {
            tabId: tab.id as number,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

    return await Promise.all(tasks);
  } catch (error) {
    console.warn('Failed to broadcast message to tabs', error);
    return [];
  }
}

/**
 * Listener utility for strictly typed messages with automatic async channel management
 * and error capture.
 */
export function addMessageListener<T extends MessageType>(
  type: T,
  handler: (
    payload: MessageMap[T]['payload'],
    sender: chrome.runtime.MessageSender
  ) => Promise<MessageMap[T]['response']> | MessageMap[T]['response']
): () => void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) {
    return () => undefined;
  }

  const listener = (
    message: MessageEnvelope,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message?.type !== type) {
      return undefined;
    }

    try {
      const result = handler(message.payload as MessageMap[T]['payload'], sender);
      if (result instanceof Promise) {
        result
          .then((resolved) => {
            sendResponse(resolved);
          })
          .catch((error) => {
            console.error(`Error in message handler for "${String(type)}"`, error);
            sendResponse({
              error: error instanceof Error ? error.message : String(error),
            });
          });
        return true; // Keep message channel open for async response
      }

      sendResponse(result);
      return undefined;
    } catch (error) {
      console.error(`Synchronous error in message handler for "${String(type)}"`, error);
      sendResponse({
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}
