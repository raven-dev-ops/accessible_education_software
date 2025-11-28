import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      void router.push("/dashboard");
    }
  }, [session, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-3xl w-full text-center space-y-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow">
        <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Accessible Education Platform
        </p>
        <h1 className="text-4xl font-bold">
          AI-powered, accessible STEM notes for blind and low-vision students
        </h1>
        <p className="text-lg text-slate-700 dark:text-slate-200">
          Convert handwritten calculus notes into readable, listenable content with role-based dashboards for students, teachers, and admins.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/login"
            className="px-5 py-3 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to login
          </Link>
          <Link
            href="/student?preview=1"
            className="px-5 py-3 rounded-lg bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
          >
            Preview student dashboard
          </Link>
          <Link
            href="/student?preview=1&showPreviewNav=1"
            className="px-5 py-3 rounded-lg bg-emerald-600 text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Preview all dashboards
          </Link>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          The preview nav lets you switch Student, Teacher, and Admin demos and return to login without authenticating.
        </p>
      </div>
    </main>
  );
}
