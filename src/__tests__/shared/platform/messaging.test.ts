import { describe, expect, it, vi } from 'vitest';
import {
  addMessageListener,
  broadcastToTabs,
  sendMessage,
  sendMessageToTab,
} from '@/shared/platform/messaging';

describe('messaging platform helpers', () => {
  it('sends typed message via chrome.runtime.sendMessage and receives response', async () => {
    const mockResponse = { ok: true };
    const runtimeSendSpy = vi
      .spyOn(chrome.runtime, 'sendMessage')
      .mockImplementation((_envelope: any, optionsOrCallback?: any, callback?: any) => {
        const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        cb?.(mockResponse);
        return Promise.resolve(mockResponse) as any;
      });

    const response = await sendMessage('crxkit:open-side-panel', undefined);
    expect(response).toEqual(mockResponse);
    expect(runtimeSendSpy).toHaveBeenCalled();
  });

  it('sends typed message to a specific tab via chrome.tabs.sendMessage', async () => {
    const mockResponse = { pong: true, timestamp: 12345 };
    const tabSendSpy = vi
      .spyOn(chrome.tabs, 'sendMessage')
      .mockImplementation((_tabId: number, _envelope: any, _options: any, callback: any) => {
        callback(mockResponse);
        return Promise.resolve(mockResponse) as any;
      });

    const response = await sendMessageToTab(42, 'crxkit:ping', { timestamp: 12345 });
    expect(response).toEqual(mockResponse);
    expect(tabSendSpy).toHaveBeenCalled();
  });

  it('broadcasts message to all tabs', async () => {
    vi.spyOn(chrome.tabs, 'query').mockImplementation((_queryInfo: any, callback?: any) => {
      const tabs = [
        { id: 10, url: 'https://site1.com' } as chrome.tabs.Tab,
        { id: 20, url: 'https://site2.com' } as chrome.tabs.Tab,
      ];
      if (typeof callback === 'function') {
        callback(tabs);
        return undefined as any;
      }
      return Promise.resolve(tabs) as any;
    });

    const results = await broadcastToTabs('crxkit:ping', { timestamp: 100 });
    expect(results).toHaveLength(2);
    expect(results[0].tabId).toBe(10);
    expect(results[1].tabId).toBe(20);
  });

  it('registers typed message listener and unregisters cleanly', () => {
    const handler = vi.fn().mockReturnValue({ pong: true, timestamp: 999 });
    const unsubscribe = addMessageListener('crxkit:ping', handler);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});
