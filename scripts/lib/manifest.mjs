const LOCALE_FIELDS = ['nameMessage', 'descriptionMessage'];

function messageRef(key) {
  return `__MSG_${key}__`;
}

function getEntriesByKind(config, kind) {
  return Object.values(config.entries ?? {}).filter((entry) => entry.kind === kind);
}

function getFirstEntryByKind(config, kind) {
  return getEntriesByKind(config, kind)[0];
}

function unique(values) {
  return Array.from(new Set(values));
}

export function generateManifest(config, packageMeta = {}) {
  const popup = getFirstEntryByKind(config, 'popup');
  const sidePanel = getFirstEntryByKind(config, 'side-panel');
  const options = getFirstEntryByKind(config, 'options');
  const newTab = getFirstEntryByKind(config, 'new-tab');
  const background = getFirstEntryByKind(config, 'background');
  const contentScripts = getEntriesByKind(config, 'content');
  const webAccessibleResources = unique(config.webAccessibleResources ?? []);

  const manifest = {
    manifest_version: 3,
    name: messageRef(config.manifest.nameMessage),
    version: packageMeta.version ?? config.manifest.version,
    description: messageRef(config.manifest.descriptionMessage),
    minimum_chrome_version: config.minimumChromeVersion,
    default_locale: config.defaultLocale,
    icons: config.manifest.icons,
    permissions: unique(config.permissions ?? []),
    host_permissions: unique(config.hostPermissions ?? []),
  };

  if (popup) {
    manifest.action = {
      default_title: messageRef(config.manifest.nameMessage),
      default_popup: popup.output,
    };
  }

  if (sidePanel) {
    manifest.side_panel = {
      default_path: sidePanel.output,
    };
  }

  if (options) {
    manifest.options_ui = {
      page: options.output,
      open_in_tab: options.openInTab ?? true,
    };
  }

  if (newTab) {
    manifest.chrome_url_overrides = {
      newtab: newTab.output,
    };
  }

  if (background) {
    manifest.background = {
      service_worker: background.output,
    };
  }

  if (contentScripts.length > 0) {
    manifest.content_scripts = contentScripts.map((entry) => ({
      matches: entry.matches ?? ['<all_urls>'],
      js: [entry.output],
      run_at: entry.runAt ?? 'document_idle',
    }));
  }

  if (webAccessibleResources.length > 0) {
    const matches = unique(contentScripts.flatMap((entry) => entry.matches ?? ['<all_urls>']));
    manifest.web_accessible_resources = [
      {
        resources: webAccessibleResources,
        matches: matches.length > 0 ? matches : ['<all_urls>'],
      },
    ];
  }

  return manifest;
}

export function validateExtensionConfig(config, context = {}) {
  const issues = [];
  const entries = Object.values(config.entries ?? {});
  const outputs = new Map();
  const existingPaths = context.existingPaths;
  const localeMessages = context.localeMessages ?? {};

  if (!config.namespace) {
    issues.push('Missing required "namespace".');
  }

  if (!config.manifest?.nameMessage) {
    issues.push('Missing required "manifest.nameMessage".');
  }

  if (!config.manifest?.descriptionMessage) {
    issues.push('Missing required "manifest.descriptionMessage".');
  }

  for (const entry of entries) {
    if (!entry.input) {
      issues.push(`Entry "${entry.kind ?? 'unknown'}" is missing an input.`);
    } else if (existingPaths && !existingPaths.has(entry.input)) {
      issues.push(`Missing entry input "${entry.input}".`);
    }

    if (entry.html && existingPaths && !existingPaths.has(entry.html)) {
      issues.push(`Missing entry html "${entry.html}".`);
    }

    if (!entry.output) {
      issues.push(`Entry "${entry.input ?? entry.kind ?? 'unknown'}" is missing an output.`);
      continue;
    }

    const count = outputs.get(entry.output) ?? 0;
    outputs.set(entry.output, count + 1);
  }

  for (const [output, count] of outputs) {
    if (count > 1) {
      issues.push(`Entry output "${output}" is used more than once.`);
    }
  }

  for (const field of LOCALE_FIELDS) {
    const key = config.manifest?.[field];
    if (!key) {
      continue;
    }

    for (const [locale, keys] of Object.entries(localeMessages)) {
      if (!keys.has(key)) {
        issues.push(`Missing locale key "${key}" in ${locale}.`);
      }
    }
  }

  return issues;
}

export function assertValidExtensionConfig(config, context = {}) {
  const issues = validateExtensionConfig(config, context);
  if (issues.length > 0) {
    throw new Error(`Invalid extension config:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
  }
}
