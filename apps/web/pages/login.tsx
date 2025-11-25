import { useEffect } from "react";

export default function Login() {
  useEffect(() => {
    // Redirect immediately to Auth0's Universal Login.
    window.location.href = "/api/auth/login";
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <p>Redirecting to secure login…</p>
    </main>
  );
}

