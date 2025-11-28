import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";

const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

export default function Login() {
  const router = useRouter();
  const isReady = router.isReady;
  const skipAuthParam = router.query.skipAuth;
  const skipAuth =
    isReady &&
    ((Array.isArray(skipAuthParam) ? skipAuthParam[0] : skipAuthParam) === "1" ||
      (Array.isArray(skipAuthParam) && skipAuthParam.includes("1")));

  useEffect(() => {
    if (!authEnabled || !isReady) return;

    // Start Google login unless we're in preview/skipAuth mode.
    if (!skipAuth) {
      void signIn("google", { callbackUrl: "/dashboard" });
    }
  }, [skipAuth, router, isReady]);

  if (authEnabled && !skipAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
        <div className="max-w-xl w-full bg-white dark:bg-slate-900/80 rounded-2xl shadow-lg p-6 text-center border border-slate-200 dark:border-slate-800">
          <p className="text-slate-900 dark:text-slate-100">Redirecting to secure login...</p>
        </div>
      </main>
    );
  }

  const showDevLogin = process.env.NODE_ENV !== "production";
  const showPreviews = skipAuth || !authEnabled;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
      <div className="max-w-5xl w-full text-center space-y-6 bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Accessible Education Platform
          </h1>
          <p className="text-lg font-medium text-slate-800 dark:text-slate-100">
            Login - Coming Soon
          </p>
          <p className="text-sm text-gray-700 dark:text-slate-200 max-w-3xl mx-auto">
            The secure login experience for students, teachers, and admins will be enabled here once the platform is ready for pilot testing.
            Until then, use the previews below to explore the sample student, teacher, and admin dashboards with demo data.
          </p>
          <div className="text-xs text-left bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-3 max-w-3xl mx-auto space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Design and branding disclaimer</p>
            <p className="text-slate-700 dark:text-slate-200">
              The UI is intentionally simple and sanitized so the feature mechanics remain the focus. Full branding, theming, and marketing polish will follow after MVP funding and research.
            </p>
            <p className="text-slate-700 dark:text-slate-200">
              Current steps: focus group testing with real end users (admin, faculty, students) in STEM classrooms. If you want to help, sign up for free or email <a className="text-blue-700 dark:text-blue-300" href="mailto:support@ravdevops.com">support@ravdevops.com</a> with your interest.
            </p>
          </div>
        </div>

        {showPreviews && (
          <div className="grid gap-4 md:grid-cols-3 text-left">
            {[
              {
                role: "Student dashboard (preview)",
                description: "See the accessible student experience with sample Braille, TTS, and released materials.",
                href: "/student?preview=1",
                accent: "from-blue-500 to-indigo-600",
              },
              {
                role: "Teacher dashboard (preview)",
                description: "Review sample modules, training items, and student tickets with demo data.",
                href: "/teacher?preview=1",
                accent: "from-emerald-500 to-teal-600",
              },
              {
                role: "Admin dashboard (preview)",
                description: "Explore system health, uploads, and support tickets populated with mock records.",
                href: "/admin?preview=1",
                accent: "from-amber-500 to-orange-600",
              },
            ].map((card) => (
              <Link
                key={card.role}
                href={card.href}
                className={`block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 shadow hover:shadow-lg transition-shadow p-5`}
              >
                <div className={`h-2 w-16 rounded-full bg-gradient-to-r ${card.accent} mb-3`} />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{card.role}</h2>
                <p className="text-sm text-slate-700 dark:text-slate-200 mb-3">{card.description}</p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  Open preview
                  <span aria-hidden="true">-&gt;</span>
                </span>
              </Link>
            ))}
          </div>
        )}

        {showDevLogin && (
          <div className="pt-2">
            <p className="text-xs text-gray-500 dark:text-slate-300 mb-2">
              Development only: continue to Google login.
            </p>
            <Link
              href="/api/auth/signin"
              className="inline-block px-4 py-2 rounded bg-blue-600 text-white text-sm dark:bg-blue-500"
            >
              Developer login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
