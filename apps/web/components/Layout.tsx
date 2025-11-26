import Link from "next/link";
import { ReactNode } from "react";
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
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark transition-colors">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold">{title}</h1>
        <nav className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/dashboard" className="underline">
            Dashboard
          </Link>
          <Link
            href="/api/auth/logout"
            className="px-3 py-1 rounded bg-gray-800 text-white text-sm"
          >
            Logout
          </Link>
        </nav>
      </header>
      {showStagingBanner && (
        <div
          className="bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-sm text-center px-4 py-2"
          role="status"
          aria-label="Staging environment notice"
        >
          Staging environment – for testing only. Do not use with real student
          data.
        </div>
      )}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
