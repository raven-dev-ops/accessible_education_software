import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { getRoleFromUser } from "../lib/roleUtils";

const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

export default function DashboardRedirect() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!authEnabled) {
      void router.replace("/student");
      return;
    }

    if (status === "loading") return;

    if (!session || !session.user) {
      void router.replace("/login");
      return;
    }

    const role = getRoleFromUser(session.user);
    const target =
      role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";

    void router.replace(target);
  }, [session, status, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <p>Loading your dashboard…</p>
    </main>
  );
}
