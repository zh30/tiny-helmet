import { useQuery } from '@tanstack/react-query';

interface ManifestInfo {
  name: string;
  version: string;
  description: string;
}

function readManifest(): ManifestInfo {
  if (typeof chrome === 'undefined' || !chrome.runtime?.getManifest) {
    return {
      name: 'Tiny Helmet',
      version: '0.0.0',
      description: 'Local development build',
    };
  }

  const manifest = chrome.runtime.getManifest();
  return {
    name: manifest.name ?? 'Tiny Helmet',
    version: manifest.version ?? '0.0.0',
    description: manifest.description ?? 'Chrome extension scaffold',
  };
}

export function useChromeManifest() {
  return useQuery({
    queryKey: ['chrome-manifest'],
    queryFn: async () => readManifest(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
