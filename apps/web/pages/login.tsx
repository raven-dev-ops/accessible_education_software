import Link from "next/link";

export default function Login() {
  const showDevLogin = process.env.NODE_ENV !== "production";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-2xl font-semibold">
          Accessible Education Platform
        </h1>
        <p className="text-lg font-medium">Login – Coming Soon</p>
        <p className="text-sm text-gray-700">
          The secure login experience for students, teachers, and admins will
          be enabled here once the platform is ready for pilot testing. This
          Netlify front end is currently in active development.
        </p>
        {showDevLogin && (
          <div className="pt-4">
            <p className="text-xs text-gray-500 mb-2">
              Development only: continue to Auth0 login.
            </p>
            <Link
              href="/api/auth/login"
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

