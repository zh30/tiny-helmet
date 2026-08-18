import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../../../scripts/lib/cli.mjs';

async function createFixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'crxkit-cli-'));
  await mkdir(path.join(cwd, '_locales/en'), { recursive: true });
  await mkdir(path.join(cwd, '_locales/zh_CN'), { recursive: true });
  await mkdir(path.join(cwd, 'src/entries/popup'), { recursive: true });
  await mkdir(path.join(cwd, 'public'), { recursive: true });

  const config = {
    namespace: 'crxkit',
    minimumChromeVersion: '114',
    defaultLocale: 'en',
    manifest: {
      nameMessage: 'extension_name',
      descriptionMessage: 'extension_description',
      version: '0.1.2',
      icons: { 16: 'public/icon16.png' },
    },
    permissions: ['storage'],
    hostPermissions: ['<all_urls>'],
    webAccessibleResources: [],
    sidePanel: { autoOpenDefault: true, allowedHosts: ['localhost'] },
    settings: { theme: 'system', pinnedHosts: [], sidePanel: { autoOpen: true } },
    entries: {
      popup: {
        kind: 'popup',
        input: 'src/entries/popup/main.tsx',
        html: 'src/entries/popup/index.html',
        output: 'popup.html',
      },
    },
  };

  await writeFile(path.join(cwd, 'extension.config.json'), `${JSON.stringify(config, null, 2)}\n`);
  await writeFile(path.join(cwd, 'package.json'), '{"name":"fixture","version":"0.1.2"}\n');
  await writeFile(path.join(cwd, 'src/entries/popup/main.tsx'), 'export {};\n');
  await writeFile(path.join(cwd, 'src/entries/popup/index.html'), '<div id="root"></div>\n');
  await writeFile(path.join(cwd, 'public/icon16.png'), 'fake-png-content');
  await writeFile(
    path.join(cwd, '_locales/en/messages.json'),
    '{"extension_name":{"message":"Fixture"},"extension_description":{"message":"Fixture"}}\n'
  );
  await writeFile(
    path.join(cwd, '_locales/zh_CN/messages.json'),
    '{"extension_name":{"message":"Fixture"},"extension_description":{"message":"Fixture"}}\n'
  );

  return cwd;
}

describe('runCli', () => {
  it('validates a fixture extension config', async () => {
    const cwd = await createFixture();
    const lines: string[] = [];

    const code = await runCli(['validate'], {
      cwd,
      stdout: (line) => lines.push(line),
      stderr: (line) => lines.push(line),
    });

    expect(code).toBe(0);
    expect(lines).toContain('Extension config is valid.');
  });

  it('runs doctor command and outputs diagnostic report', async () => {
    const cwd = await createFixture();
    const lines: string[] = [];

    const code = await runCli(['doctor'], {
      cwd,
      stdout: (line) => lines.push(line),
      stderr: (line) => lines.push(line),
    });

    expect(code).toBe(0);
    expect(lines.some((l) => l.includes('Diagnostic Report'))).toBe(true);
  });

  it('adds a page entry and updates extension config', async () => {
    const cwd = await createFixture();

    const code = await runCli(['entry', 'add', 'demo', '--kind', 'page'], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
    });

    const config = JSON.parse(await readFile(path.join(cwd, 'extension.config.json'), 'utf8'));

    expect(code).toBe(0);
    expect(config.entries.demo).toEqual({
      kind: 'page',
      input: 'src/entries/demo/main.tsx',
      html: 'src/entries/demo/index.html',
      output: 'demo.html',
    });
    await expect(readFile(path.join(cwd, 'src/entries/demo/main.tsx'), 'utf8')).resolves.toContain(
      'DemoApp'
    );
  });

  it('adds devtools and offscreen entries correctly', async () => {
    const cwd = await createFixture();

    const devtoolsCode = await runCli(['entry', 'add', 'inspector', '--kind', 'devtools'], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
    });
    expect(devtoolsCode).toBe(0);

    const offscreenCode = await runCli(['entry', 'add', 'audioOffscreen', '--kind', 'offscreen'], {
      cwd,
      stdout: () => undefined,
      stderr: () => undefined,
    });
    expect(offscreenCode).toBe(0);

    const config = JSON.parse(await readFile(path.join(cwd, 'extension.config.json'), 'utf8'));
    expect(config.entries.inspector.kind).toBe('devtools');
    expect(config.entries.audioOffscreen.kind).toBe('offscreen');
  });
});
