import '@/styles/tailwind.css';

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Sparkles } from 'lucide-react';
import { AppProviders } from '@/shared/providers/AppProviders';
import { motion } from 'framer-motion';

function NewTabApp() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-background to-accent/20 p-4 font-sans antialiased selection:bg-primary/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center"
      >
        <header className="mb-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="mb-6 inline-block rounded-full bg-primary/10 p-4 text-primary shadow-inner"
          >
            <Sparkles className="h-12 w-12" />
          </motion.div>
          <h1 className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-6xl font-black tracking-tighter text-transparent">
            Hello, Explorer.
          </h1>
          <p className="mt-4 text-xl text-muted-foreground/80 font-medium">
            Ready to shape the future of your browser?
          </p>
        </header>

        <div className="flex gap-4">
          <button className="rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:bg-primary/90 active:scale-95">
            Quick Actions
          </button>
          <button className="rounded-full bg-card px-8 py-3 font-semibold text-card-foreground shadow-md ring-1 ring-border transition-all hover:bg-accent/50 active:scale-95">
            Settings
          </button>
        </div>
      </motion.div>

      <footer className="fixed bottom-8 text-sm text-muted-foreground/60">
        <p>© 2026 Tiny Helmet Scaffold • Modern Chrome Extension</p>
      </footer>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <AppProviders>
        <NewTabApp />
      </AppProviders>
    </React.StrictMode>
  );
}
