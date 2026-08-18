/**
 * Declarative Context Menus manager for Chrome Extensions.
 */

export interface MenuItemConfig extends chrome.contextMenus.CreateProperties {
  id: string;
  onClick?: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void | Promise<void>;
}

export class ContextMenuManager {
  private handlers = new Map<
    string | number,
    (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void | Promise<void>
  >();
  private initialized = false;

  public register(items: MenuItemConfig[]): void {
    if (typeof chrome === 'undefined' || !chrome.contextMenus) {
      return;
    }

    if (!this.initialized) {
      chrome.contextMenus.onClicked.addListener((info, tab) => {
        const handler = this.handlers.get(info.menuItemId);
        if (handler) {
          handler(info, tab);
        }
      });
      this.initialized = true;
    }

    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.removeAll(() => {
        for (const item of items) {
          const { onClick, ...properties } = item;
          if (onClick) {
            this.handlers.set(item.id, onClick);
          }
          chrome.contextMenus.create(properties);
        }
      });
    });
  }
}

export const contextMenuManager = new ContextMenuManager();
