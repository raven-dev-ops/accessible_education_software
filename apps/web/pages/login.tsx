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
    if (skipAuth) return;

    // Start Google login; NextAuth will handle the callback and redirect.
    void signIn("google", { callbackUrl: "/dashboard" });
  }, [authEnabled, skipAuth, router, isReady]);

  if (authEnabled && !skipAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-6 text-center border border-slate-200">
          <p>Redirecting to secure login...</p>
        </div>
      </main>
    );
  }

  const showDevLogin = process.env.NODE_ENV !== "production";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-2xl font-semibold">Accessible Education Platform</h1>
        <p className="text-lg font-medium">Login - Coming Soon</p>
        <p className="text-sm text-gray-700">
          The secure login experience for students, teachers, and admins will be
          enabled here once the platform is ready for pilot testing. This
          Netlify front end is currently in active development.
        </p>
        {showDevLogin && (
          <div className="pt-4">
            <p className="text-xs text-gray-500 mb-2">
              Development only: continue to Google login.
            </p>
            <Link
              href="/api/auth/signin"
              className="inline-block px-4 py-2 rounded bg-blue-600 text-white text-sm"
            >
              Developer login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
