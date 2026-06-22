import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateManifest, validateExtensionConfig } from './manifest.mjs';

const CONFIG_FILE = 'extension.config.json';
const PAGE_KINDS = new Set(['page', 'popup', 'side-panel', 'options', 'new-tab']);
const ENTRY_KINDS = new Set([
  'page',
  'content',
  'background',
  'popup',
  'side-panel',
  'options',
  'new-tab',
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
  const input = `${entryDir}/main.${PAGE_KINDS.has(kind) ? 'tsx' : 'ts'}`;
  const output = kind === 'background' ? `${name}.js` : `${name}.js`;
  const entry = {
    kind,
    input,
    output: PAGE_KINDS.has(kind) ? `${name}.html` : output,
  };

  if (PAGE_KINDS.has(kind)) {
    entry.html = `${entryDir}/index.html`;
  }

  if (kind === 'content') {
    entry.matches = ['<all_urls>'];
    entry.runAt = 'document_idle';
  }

  await mkdir(path.join(cwd, entryDir), { recursive: true });

  if (PAGE_KINDS.has(kind)) {
    const componentName = `${pascalCase(name)}App`;
    await writeFile(path.join(cwd, entry.input), pageMainTemplate(componentName));
    await writeFile(path.join(cwd, entry.html), htmlTemplate(name));
  } else if (kind === 'content') {
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
  const env = {
    ...process.env,
    ...(version ? { EXTENSION_VERSION: version } : {}),
  };

  const buildCode = await runCommand('pnpm', ['build'], { cwd, env });
  if (buildCode !== 0) {
    io.stderr(`Build failed with exit code ${buildCode}.`);
    return buildCode;
  }

  await zipDirectory(path.join(cwd, 'dist'), path.resolve(cwd, out));
  io.stdout(`Created ${out}.`);
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

async function printManifest(cwd, args, io) {
  const { flags } = parseFlags(args);
  const { config, packageJson } = await loadProject(cwd);
  const manifest = generateManifest(config, packageJson);

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
      stdout('Usage: crx <validate|manifest|entry|package|create>');
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
