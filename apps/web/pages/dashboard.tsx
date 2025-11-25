import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@auth0/nextjs-auth0/client";
import { getRoleFromUser } from "../lib/roleUtils";

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;

    const role = getRoleFromUser(user);
    const target =
      role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";

    void router.replace(target);
  }, [user, isLoading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <p>Loading your dashboard…</p>
    </main>
  );
}

