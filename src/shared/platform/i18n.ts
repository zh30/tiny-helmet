export function getMessage(key: string, fallback?: string, substitutions?: string | string[]): string {
  if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
    const value = chrome.i18n.getMessage(key, substitutions ?? undefined);
    if (value) {
      return value;
    }
  }

  return fallback ?? key;
}

export function getExtensionName(): string {
  return getMessage('extension_name', 'Tiny Helmet');
}

export function getExtensionDescription(): string {
  return getMessage(
    'extension_description',
    'A modern Chrome extension scaffold for rapid MV3 development.',
  );
}
