import Link from "next/link";
import { ReactNode } from "react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";

type LayoutProps = {
  title: string;
  children: ReactNode;
  secondaryNav?: ReactNode;
};

const showStagingBanner =
  process.env.NEXT_PUBLIC_SHOW_STAGING_BANNER === "true" ||
  process.env.NEXT_PUBLIC_SHOW_STAGING_BANNER === "1";
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0";
const appStage = process.env.NEXT_PUBLIC_APP_STAGE || "Alpha";

export function Layout({ title, children, secondaryNav }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 transition-colors">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-blue-600 focus:text-white shadow"
      >
        Skip to main content
      </a>
      <header
        className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm dark:bg-slate-900/80 dark:border-slate-800"
        role="banner"
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </Link>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
              {appVersion} · {appStage}
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm" aria-label="Primary">
            <ThemeToggle />
            {secondaryNav && <div className="flex items-center gap-2">{secondaryNav}</div>}
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                void signOut({
                  redirect: true,
                  callbackUrl: "/",
                });
              }}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Logout
            </Link>
          </nav>
        </div>
      </header>
      {showStagingBanner && (
        <div
          className="bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-sm text-center px-4 py-2 dark:bg-yellow-200 dark:border-yellow-300 dark:text-yellow-950"
          role="status"
          aria-label="Staging environment notice"
        >
          Staging environment — for testing only. Do not use with real student data.
        </div>
      )}
      <main id="main-content" className="flex-1 p-6" role="main">
        <div className="max-w-6xl mx-auto w-full">{children}</div>
      </main>
      <footer
        className="bg-white/90 border-t border-slate-200 dark:bg-slate-900/80 dark:border-slate-800"
        role="contentinfo"
      >
        <div className="max-w-6xl mx-auto px-6 py-4 text-sm text-slate-600 dark:text-slate-300 flex flex-wrap gap-4 items-center justify-between">
          <span>Accessible Education Platform</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-slate-100">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-slate-100">Privacy Policy</Link>
            <span>All rights reserved · Releases: {appVersion} ({appStage})</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
