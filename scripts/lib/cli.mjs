import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateManifest, validateExtensionConfig } from './manifest.mjs';

const CONFIG_FILE = 'extension.config.json';
const PAGE_KINDS = new Set([
  'page',
  'popup',
  'side-panel',
  'options',
  'new-tab',
  'devtools',
  'offscreen',
]);
const ENTRY_KINDS = new Set([
  'page',
  'content',
  'background',
  'popup',
  'side-panel',
  'options',
  'new-tab',
  'devtools',
  'offscreen',
  'injected',
]);

function parseFlags(args) {
  const flags = {};
  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { flags, positional };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(rootDir, dir = '.') {
  const absoluteDir = path.join(rootDir, dir);
  if (!(await pathExists(absoluteDir))) {
    return [];
  }

  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(rootDir, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath.replaceAll(path.sep, '/'));
    }
  }

  return files;
}

async function loadLocaleMessages(cwd) {
  const localesDir = path.join(cwd, '_locales');
  if (!(await pathExists(localesDir))) {
    return {};
  }

  const localeDirs = await readdir(localesDir, { withFileTypes: true });
  const messages = {};

  for (const locale of localeDirs) {
    if (!locale.isDirectory()) {
      continue;
    }

    const messagesPath = path.join(localesDir, locale.name, 'messages.json');
    if (!(await pathExists(messagesPath))) {
      messages[locale.name] = new Set();
      continue;
    }

    messages[locale.name] = new Set(Object.keys(await readJson(messagesPath)));
  }

  return messages;
}

async function loadProject(cwd) {
  const config = await readJson(path.join(cwd, CONFIG_FILE));
  const packageJson = await readJson(path.join(cwd, 'package.json'));
  return { config, packageJson };
}

async function validateProject(cwd) {
  const { config } = await loadProject(cwd);
  const existingPaths = new Set([
    ...(await collectFiles(cwd, 'src')),
    ...(await collectFiles(cwd, 'public')),
  ]);
  const localeMessages = await loadLocaleMessages(cwd);

  return validateExtensionConfig(config, {
    existingPaths,
    localeMessages,
  });
}

function pageMainTemplate(componentName) {
  return `import '@/styles/tailwind.css';

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/shared/providers/AppProviders';

function ${componentName}() {
  return (
    <main className="min-h-screen bg-background p-6 font-sans text-foreground">
      <h1 className="text-xl font-semibold">${componentName.replace(/App$/, '')}</h1>
    </main>
  );
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('${componentName} root element missing');
}

createRoot(container).render(
  <React.StrictMode>
    <AppProviders>
      <${componentName} />
    </AppProviders>
  </React.StrictMode>
);
`;
}

function devtoolsMainTemplate() {
  return `chrome.devtools.panels.create(
  'CRXKit',
  'public/icon32.png',
  'sidePanel.html',
  (panel) => {
    console.info('CRXKit devtools panel initialized', panel);
  }
);
`;
}

function offscreenMainTemplate() {
  return `console.info('CRXKit offscreen document loaded');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'offscreen:ping') {
    sendResponse({ ok: true, timestamp: Date.now() });
    return true;
  }
  return undefined;
});
`;
}

function htmlTemplate(title) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
}

function contentTemplate(name) {
  return `console.info('${name} content script loaded');
`;
}

function backgroundTemplate(name) {
  return `chrome.runtime.onInstalled.addListener(() => {
  console.info('${name} background worker installed');
});
`;
}

function pascalCase(value) {
  return value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
}

async function addEntry(cwd, args, io) {
  const name = args[0];
  const { flags } = parseFlags(args.slice(1));
  const kind = flags.kind;

  if (!name || !/^[a-z][a-zA-Z0-9-]*$/.test(name)) {
    io.stderr(
      'Entry name must start with a lowercase letter and contain letters, numbers, or hyphens.'
    );
    return 1;
  }

  if (!ENTRY_KINDS.has(kind)) {
    io.stderr(`Entry kind must be one of: ${Array.from(ENTRY_KINDS).join(', ')}.`);
    return 1;
  }

  const configPath = path.join(cwd, CONFIG_FILE);
  const config = await readJson(configPath);

  if (config.entries[name]) {
    io.stderr(`Entry "${name}" already exists.`);
    return 1;
  }

  const entryDir = path.join('src/entries', name);
  const isPageKind = PAGE_KINDS.has(kind);
  const isTsx = isPageKind && kind !== 'devtools' && kind !== 'offscreen';
  const input = `${entryDir}/main.${isTsx ? 'tsx' : 'ts'}`;
  const output = isPageKind ? `${name}.html` : `${name}.js`;
  const entry = {
    kind,
    input,
    output,
  };

  if (isPageKind) {
    entry.html = `${entryDir}/index.html`;
  }

  if (kind === 'content') {
    entry.matches = ['<all_urls>'];
    entry.runAt = 'document_idle';
  } else if (kind === 'injected') {
    entry.matches = ['<all_urls>'];
    entry.world = 'MAIN';
    entry.runAt = 'document_idle';
  }

  await mkdir(path.join(cwd, entryDir), { recursive: true });

  if (kind === 'devtools') {
    await writeFile(path.join(cwd, entry.input), devtoolsMainTemplate());
    await writeFile(path.join(cwd, entry.html), htmlTemplate('DevTools'));
  } else if (kind === 'offscreen') {
    await writeFile(path.join(cwd, entry.input), offscreenMainTemplate());
    await writeFile(path.join(cwd, entry.html), htmlTemplate('Offscreen Document'));
  } else if (isPageKind) {
    const componentName = `${pascalCase(name)}App`;
    await writeFile(path.join(cwd, entry.input), pageMainTemplate(componentName));
    await writeFile(path.join(cwd, entry.html), htmlTemplate(name));
  } else if (kind === 'content' || kind === 'injected') {
    await writeFile(path.join(cwd, entry.input), contentTemplate(name));
  } else {
    await writeFile(path.join(cwd, entry.input), backgroundTemplate(name));
  }

  config.entries[name] = entry;
  await writeJson(configPath, config);
  io.stdout(`Added ${kind} entry "${name}".`);
  return 0;
}

async function zipDirectory(sourceDir, outputFile) {
  const { ZipFile } = await import('yazl');
  const zipFile = new ZipFile();
  const output = createWriteStream(outputFile);

  const addDir = async (dir, prefix = '') => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      const zipPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await addDir(absolutePath, zipPath);
      } else if (entry.isFile()) {
        zipFile.addReadStream(createReadStream(absolutePath), zipPath);
      }
    }
  };

  await addDir(sourceDir);

  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    zipFile.outputStream.on('error', reject);
    zipFile.outputStream.pipe(output);
    zipFile.end();
  });
}

async function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function packageExtension(cwd, args, io) {
  const { flags } = parseFlags(args);
  const out = flags.out || 'CrxKit.zip';
  const version = flags.version;
  const target = flags.target || 'chrome';
  const env = {
    ...process.env,
    ...(version ? { EXTENSION_VERSION: version } : {}),
    ...(target ? { EXTENSION_TARGET: target } : {}),
  };

  const buildCode = await runCommand('pnpm', ['build'], { cwd, env });
  if (buildCode !== 0) {
    io.stderr(`Build failed with exit code ${buildCode}.`);
    return buildCode;
  }

  await zipDirectory(path.join(cwd, 'dist'), path.resolve(cwd, out));
  io.stdout(`Created ${out} for target "${target}".`);
  return 0;
}

async function createProject(cwd, args, io) {
  const target = args[0];
  const { flags } = parseFlags(args.slice(1));
  if (!target) {
    io.stderr('Missing target directory.');
    return 1;
  }

  const targetDir = path.resolve(cwd, target);
  if (await pathExists(targetDir)) {
    const targetStat = await stat(targetDir);
    if (targetStat.isDirectory()) {
      const existing = await readdir(targetDir);
      if (existing.length > 0) {
        io.stderr(`Target directory "${target}" is not empty.`);
        return 1;
      }
    }
  }

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  await cp(repoRoot, targetDir, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(repoRoot, source);
      return !['.git', 'node_modules', 'dist', 'coverage', '.DS_Store'].some(
        (ignored) => relative === ignored || relative.startsWith(`${ignored}${path.sep}`)
      );
    },
  });

  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJson = await readJson(packageJsonPath);
  packageJson.name = flags.package || packageJson.name;
  await writeJson(packageJsonPath, packageJson);

  if (flags.name) {
    for (const locale of ['en', 'zh_CN']) {
      const messagesPath = path.join(targetDir, '_locales', locale, 'messages.json');
      const messages = await readJson(messagesPath);
      messages.extension_name.message = flags.name;
      await writeJson(messagesPath, messages);
    }
  }

  io.stdout(`Created CRXKit project at ${targetDir}.`);
  return 0;
}

async function runDoctor(cwd, io) {
  io.stdout('🩺 Running CRXKit Health & Compliance Doctor...\n');
  const issues = await validateProject(cwd);
  const { config, packageJson } = await loadProject(cwd);

  const passed = [];
  const warnings = [];

  // Check 1: Manifest config validation
  if (issues.length === 0) {
    passed.push('Extension config is structurally valid.');
  } else {
    issues.forEach((issue) => warnings.push(`[Config Issue] ${issue}`));
  }

  // Check 2: Icons
  const icons = config.manifest?.icons ?? {};
  for (const [size, iconPath] of Object.entries(icons)) {
    if (await pathExists(path.join(cwd, iconPath))) {
      passed.push(`Icon ${size}px found at ${iconPath}.`);
    } else {
      warnings.push(`Missing icon ${size}px at ${iconPath}.`);
    }
  }

  // Check 3: Permissions audit
  const highRiskPerms = ['<all_urls>', 'webRequestBlocking', 'debugger', 'management'];
  const requestedHighRisk = (config.hostPermissions ?? [])
    .concat(config.permissions ?? [])
    .filter((p) => highRiskPerms.includes(p));

  if (requestedHighRisk.length > 0) {
    warnings.push(
      `[Permission Notice] Broad permissions detected: ${requestedHighRisk.join(', ')}. Prepare justifications for Chrome Web Store review.`
    );
  } else {
    passed.push('Permissions follow least-privilege guidelines.');
  }

  // Check 4: Locales check
  const localeMessages = await loadLocaleMessages(cwd);
  const localeCount = Object.keys(localeMessages).length;
  if (localeCount > 0) {
    passed.push(
      `Found ${localeCount} locale definition(s): ${Object.keys(localeMessages).join(', ')}.`
    );
  } else {
    warnings.push(
      'No _locales directory found. Consider adding i18n support for store publication.'
    );
  }

  io.stdout('📋 Diagnostic Report:');
  passed.forEach((p) => io.stdout(`  ✓ ${p}`));
  warnings.forEach((w) => io.stdout(`  ⚠ ${w}`));

  io.stdout(
    `\nExtension: ${packageJson.name} v${packageJson.version} (Namespace: ${config.namespace})`
  );

  if (warnings.length > 0) {
    io.stdout(`\nDoctor finished with ${warnings.length} warning(s).`);
    return 0;
  }

  io.stdout('\n🎉 All health checks passed perfectly!');
  return 0;
}

async function printManifest(cwd, args, io) {
  const { flags } = parseFlags(args);
  const { config, packageJson } = await loadProject(cwd);
  const target = flags.target || 'chrome';
  const manifest = generateManifest(config, {
    version: packageJson.version,
    target,
  });

  if (flags.print) {
    io.stdout(JSON.stringify(manifest, null, 2));
  }

  if (flags.check) {
    const issues = await validateProject(cwd);
    if (issues.length > 0) {
      issues.forEach((issue) => io.stderr(issue));
      return 1;
    }
    io.stdout('Manifest is valid.');
  }

  if (!flags.print && !flags.check) {
    io.stdout(JSON.stringify(manifest, null, 2));
  }

  return 0;
}

export async function runCli(argv, io = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? (() => undefined);
  const stderr = io.stderr ?? (() => undefined);
  const command = argv[0];
  const args = argv.slice(1);
  const resolvedIo = { stdout, stderr };

  try {
    if (!command || command === 'help' || command === '--help') {
      stdout('Usage: crx <validate|manifest|entry|package|doctor|create>');
      return 0;
    }

    if (command === 'validate') {
      const issues = await validateProject(cwd);
      if (issues.length > 0) {
        issues.forEach((issue) => stderr(issue));
        return 1;
      }
      stdout('Extension config is valid.');
      return 0;
    }

    if (command === 'doctor') {
      return await runDoctor(cwd, resolvedIo);
    }

    if (command === 'manifest') {
      return await printManifest(cwd, args, resolvedIo);
    }

    if (command === 'entry' && args[0] === 'add') {
      return await addEntry(cwd, args.slice(1), resolvedIo);
    }

    if (command === 'package') {
      return await packageExtension(cwd, args, resolvedIo);
    }

    if (command === 'create') {
      return await createProject(cwd, args, resolvedIo);
    }

    stderr(`Unknown command "${command}".`);
    return 1;
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
