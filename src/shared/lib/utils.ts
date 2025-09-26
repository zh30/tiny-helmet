import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isChromeRuntimeAvailable(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
}

export function isSidePanelSupported(): boolean {
  return Boolean(isChromeRuntimeAvailable() && chrome.sidePanel);
}

export function parseUrl(href?: string | null): URL | null {
  if (!href) {
    return null;
  }

  try {
    return new URL(href);
  } catch (error) {
    console.warn('Unable to parse URL', href, error);
    return null;
  }
}
