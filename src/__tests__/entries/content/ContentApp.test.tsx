import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { ContentApp } from '@/entries/content/ContentApp';
import { extensionConfig } from '@/shared/config/extension';
import * as storage from '@/shared/platform/storage';
import * as utils from '@/shared/lib/utils';

vi.mock('@/shared/platform/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof storage>();

  return {
    ...actual,
    loadSettings: vi.fn(async () => extensionConfig.defaultSettings),
    subscribeToSettings: vi.fn(() => vi.fn()),
  } satisfies typeof storage;
});

vi.mock('@/shared/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof utils>();

  return {
    ...actual,
    parseUrl: vi.fn(() => new URL('https://localhost/')),
  } satisfies typeof utils;
});

const mockedStorage = storage as unknown as {
  loadSettings: ReturnType<typeof vi.fn>;
  subscribeToSettings: ReturnType<typeof vi.fn>;
};

const mockedParseUrl = utils.parseUrl as MockedFunction<typeof utils.parseUrl>;

describe('ContentApp', () => {
  let themeTarget: HTMLDivElement;

  beforeEach(() => {
    mockedStorage.loadSettings.mockResolvedValue(extensionConfig.defaultSettings);
    mockedParseUrl.mockReturnValue(new URL('https://localhost/'));
    themeTarget = document.createElement('div');
    document.body.appendChild(themeTarget);
  });

  afterEach(() => {
    mockedStorage.loadSettings.mockClear();
    mockedStorage.subscribeToSettings.mockClear();
    mockedParseUrl.mockReset();
    document.getElementById('tiny-helmet-content-host')?.remove();
    themeTarget.remove();
  });

  it('renders the side panel trigger for allowed hosts', async () => {
    render(<ContentApp themeTarget={themeTarget} />);

    const button = await waitFor(() =>
      screen.getByRole('button', { name: /content_open_side_panel_aria/i }),
    );

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-host', 'localhost');
    expect(button).toHaveTextContent('content_side_panel_ready');
    expect(themeTarget.dataset.themePreference).toBe(extensionConfig.defaultSettings.theme);
  });

  it('does not render trigger for disallowed hosts', async () => {
    mockedParseUrl.mockReturnValueOnce(new URL('https://example.com/'));

    render(<ContentApp themeTarget={themeTarget} />);

    await waitFor(() => expect(mockedStorage.loadSettings).toHaveBeenCalled());
    expect(screen.queryByRole('button')).toBeNull();
  });
});
