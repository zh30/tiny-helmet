import { QueryClient, type QueryClientConfig, QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';

const defaultQueryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    },
    mutations: {
      retry: 0,
    },
  },
};

const queryClient = new QueryClient(defaultQueryConfig);

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
