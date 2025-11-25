import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";

export default function Home() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      void router.push("/dashboard");
    }
  }, [user, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4">
        Accessible Education Platform
      </h1>
      <p className="mb-6 max-w-xl text-center">
        AI-assisted accessibility platform that turns handwritten STEM notes into
        readable, listenable content for blind and low-vision students.
      </p>
      <Link
        href="/api/auth/login"
        className="px-4 py-2 rounded bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Log in with Auth0
      </Link>
    </main>
  );
}

