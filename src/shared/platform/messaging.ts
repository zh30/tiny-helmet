/**
 * Type-safe message passing system for Chrome Extension.
 * Defines all possible messages and their payloads.
 */

export interface MessageMap {
  'tiny-helmet:open-side-panel': {
    payload: void;
    response: { ok: boolean; error?: string };
  };
  'tiny-helmet:get-tab-info': {
    payload: void;
    response: { url?: string; id?: number };
  };
  'tiny-helmet:sync-settings': {
    payload: void;
    response: void;
  };
  'tiny-helmet:show-notification': {
    payload: { title: string; message: string };
    response: void;
  };
}

export type MessageType = keyof MessageMap;

/**
 * Sends a message to the background script.
 */
export async function sendMessage<T extends MessageType>(
  type: T,
  payload: MessageMap[T]['payload']
): Promise<MessageMap[T]['response']> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, undefined, (response) => {
      resolve(response);
    });
  });
}

/**
 * Sends a message to a specific tab.
 */
export async function sendMessageToTab<T extends MessageType>(
  tabId: number,
  type: T,
  payload: MessageMap[T]['payload']
): Promise<MessageMap[T]['response']> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type, payload }, undefined, (response) => {
      resolve(response);
    });
  });
}

/**
 * Listener utility for strictly typed messages.
 */
export function addMessageListener<T extends MessageType>(
  type: T,
  handler: (
    payload: MessageMap[T]['payload'],
    sender: chrome.runtime.MessageSender
  ) => Promise<MessageMap[T]['response']> | MessageMap[T]['response']
) {
  const listener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (message?.type === type) {
      const result = handler(message.payload, sender);
      if (result instanceof Promise) {
        result.then(sendResponse);
        return true; // Keep channel open for async response
      } else {
        sendResponse(result);
      }
    }
    return undefined;
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
