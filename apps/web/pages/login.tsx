import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";

const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

export default function Login() {
  const router = useRouter();
  const skipAuth = router.query.skipAuth === "1";
  const hasAuthParams = Boolean(router.query.code || router.query.state || router.query.error);

  useEffect(() => {
    if (!authEnabled) return;

    // If Google returned with code/state, forward to NextAuth callback to finish login.
    if (hasAuthParams) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      void router.replace(`/api/auth/callback/google${search}`);
      return;
    }

    // Otherwise, initiate sign-in unless explicitly skipping auth.
    if (!skipAuth) {
      void signIn("google");
    }
  }, [hasAuthParams, skipAuth, router]);

  if (authEnabled) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-6 text-center border border-slate-200">
          {skipAuth ? (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 mb-3">
                Sign back in
              </h1>
              <p className="text-slate-600 mb-4">
                You have been signed out. Continue to sign in with Google.
              </p>
              <button
                onClick={() => signIn("google")}
                className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm shadow-sm hover:bg-blue-700 transition"
              >
                Continue with Google
              </button>
            </>
          ) : hasAuthParams ? (
            <p>Finishing login</p>
          ) : (
            <p>Redirecting to secure login</p>
          )}
        </div>
      </main>
    );
  }

  const showDevLogin = process.env.NODE_ENV !== "production";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-2xl font-semibold">
          Accessible Education Platform
        </h1>
        <p className="text-lg font-medium">Login  Coming Soon</p>
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
