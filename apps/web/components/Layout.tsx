import Link from "next/link";
import { ReactNode } from "react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";

type LayoutProps = {
  title: string;
  children: ReactNode;
};

const showStagingBanner =
  process.env.NEXT_PUBLIC_SHOW_STAGING_BANNER === "true" ||
  process.env.NEXT_PUBLIC_SHOW_STAGING_BANNER === "1";

export function Layout({ title, children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-xl font-semibold text-slate-900">
            {title}
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
            >
              Dashboard
            </Link>
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                void signOut({
                  redirect: true,
                  callbackUrl: "/login?skipAuth=1",
                });
              }}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
            >
              Logout
            </Link>
          </nav>
        </div>
      </header>
      {showStagingBanner && (
        <div
          className="bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-sm text-center px-4 py-2"
          role="status"
          aria-label="Staging environment notice"
        >
          Staging environment — for testing only. Do not use with real student data.
        </div>
      )}
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto w-full">{children}</div>
      </main>
      <footer className="bg-white/90 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 text-sm text-slate-600">
          Accessible Education Platform
        </div>
      </footer>
    </div>
  );
}
