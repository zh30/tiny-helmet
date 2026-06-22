import { expect, test } from './fixtures';

test('loads core extension pages and injects the content script', async ({
  context,
  extensionId,
}) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.getByRole('button', { name: /open side panel/i })).toBeVisible();

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(options.getByRole('heading', { name: /crxkit/i })).toBeVisible();

  const sidePanel = await context.newPage();
  await sidePanel.goto(`chrome-extension://${extensionId}/sidePanel.html`);
  await expect(sidePanel.getByText(/current session/i)).toBeVisible();

  const contentPage = await context.newPage();
  await contentPage.route('https://localhost/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><main>Local fixture</main></body></html>',
    })
  );
  await contentPage.goto('https://localhost/');
  await expect(contentPage.locator('#crxkit-content-host')).toBeAttached();
  await expect(contentPage.getByRole('button', { name: /open crxkit side panel/i })).toBeVisible();
});
