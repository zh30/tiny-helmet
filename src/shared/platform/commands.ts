/**
 * Keyboard Shortcuts (commands) manager for Chrome Extensions.
 */

export type CommandHandler = (command: string, tab?: chrome.tabs.Tab) => void | Promise<void>;

export function registerCommandListener(
  handlers: Record<string, CommandHandler> | CommandHandler
): () => void {
  if (typeof chrome === 'undefined' || !chrome.commands?.onCommand) {
    return () => undefined;
  }

  const listener = async (command: string, tab?: chrome.tabs.Tab) => {
    if (typeof handlers === 'function') {
      await handlers(command, tab);
      return;
    }

    const handler = handlers[command];
    if (handler) {
      await handler(command, tab);
    }
  };

  chrome.commands.onCommand.addListener(listener);
  return () => {
    chrome.commands.onCommand.removeListener(listener);
  };
}
