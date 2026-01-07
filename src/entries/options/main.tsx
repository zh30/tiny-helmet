import '@/styles/tailwind.css';

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Settings, Shield, Layout, Palette, Github, Globe, ExternalLink, MoonStar, Laptop } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppProviders } from '@/shared/providers/AppProviders';
import { useExtensionHydration } from '@/shared/hooks/useExtensionHydration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useExtensionStore } from '@/shared/state/useExtensionStore';
import { useThemeSync } from '@/shared/hooks/useThemeSync';
import { Button } from '@/shared/ui/button';
import { clsx } from 'clsx';

const SECTIONS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Privacy & Hosts', icon: Shield },
  { id: 'advanced', label: 'Advanced', icon: Layout },
] as const;

function OptionsApp() {
  const { loading } = useExtensionHydration();
  const { settings, setTheme, setSidePanelAutoOpen } = useExtensionStore();
  const [activeTab, setActiveTab] = React.useState<typeof SECTIONS[number]['id']>('general');

  const currentTheme = settings.theme ?? 'system';
  useThemeSync(currentTheme);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="container max-w-6xl py-12 px-6 lg:px-8">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider">
              <Settings className="h-3 w-3" />
              <span>Configuration</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight text-gradient">Settings</h1>
            <p className="text-muted-foreground text-lg max-w-md">
              Customize your <span className="font-bold text-foreground">Tiny Helmet</span> experience to perfectly fit your workflow.
            </p>
          </motion.div>

          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl glass border-white/10" asChild>
              <a href="https://github.com/zh30/tiny-helmet" target="_blank" rel="noreferrer">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
            <Button className="rounded-xl shadow-xl shadow-primary/20">
              Save Changes
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12">
          <aside className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200",
                  activeTab === section.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}
          </aside>

          <main>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'general' && (
                <Card className="glass border-none premium-shadow overflow-hidden">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-black tracking-tight">General</CardTitle>
                    <CardDescription className="text-base">Basic behavior and automation settings.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 pt-4 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-accent/20 border border-white/5">
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold tracking-tight">Auto-open Side Panel</h4>
                        <p className="text-sm text-muted-foreground max-w-md">Automatically expand the side panel when you navigate to a host in your allowlist.</p>
                      </div>
                      <button
                        onClick={() => setSidePanelAutoOpen(!settings.sidePanel.autoOpen)}
                        className={clsx(
                          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          settings.sidePanel.autoOpen ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={clsx(
                            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-xl ring-0 transition-transform duration-300",
                            settings.sidePanel.autoOpen ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>

                    <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center">
                      <p className="text-sm text-muted-foreground">More settings coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'appearance' && (
                <Card className="glass border-none premium-shadow">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-2xl font-black tracking-tight text-gradient">Appearance</CardTitle>
                    <CardDescription className="text-base">Personalize how the extension looks.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={clsx(
                            "group relative flex flex-col items-center gap-4 rounded-2xl border-2 p-6 transition-all duration-300",
                            currentTheme === t
                              ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                              : "border-white/5 bg-accent/10 hover:border-white/20 hover:bg-accent/20"
                          )}
                        >
                          <div className={clsx(
                            "rounded-xl p-4 transition-transform group-hover:scale-110",
                            currentTheme === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                          )}>
                            {t === 'light' && <Palette className="h-8 w-8" />}
                            {t === 'dark' && <MoonStar className="h-8 w-8" />}
                            {t === 'system' && <Laptop className="h-8 w-8" />}
                          </div>
                          <span className="font-bold capitalize">{t} Mode</span>
                          {currentTheme === t && (
                            <motion.div
                              layoutId="active-theme"
                              className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fallback for other tabs */}
              {activeTab !== 'general' && activeTab !== 'appearance' && (
                <Card className="glass premium-shadow border-dashed">
                  <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                    <div className="rounded-full bg-accent/30 p-6">
                      <Globe className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-xl font-bold">Planned Feature</h3>
                    <p className="text-muted-foreground max-w-xs">We're working hard to bring you more customization options in the near future.</p>
                  </div>
                </Card>
              )}
            </motion.div>
          </main>
        </div>

        <footer className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-muted-foreground">
          <p>© 2025 Tiny Helmet Scaffold. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="https://github.com/zh30" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
              Built by zh30 <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <AppProviders>
        <OptionsApp />
      </AppProviders>
    </React.StrictMode>
  );
}

