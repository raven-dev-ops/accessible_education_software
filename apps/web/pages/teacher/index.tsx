import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Layout } from "../../components/Layout";
import { getRoleFromUser } from "../../lib/roleUtils";

type ModuleSummary = {
  id: string | number;
  title: string;
  course?: string;
};

function TeacherPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [unauthorized, setUnauthorized] = useState(false);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [modulesError, setModulesError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;

    const role = getRoleFromUser(user);

    if (role !== "teacher") {
      setUnauthorized(true);
      void router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadModules() {
      try {
        const res = await fetch("/api/modules");
        if (!res.ok) {
          throw new Error(`Failed with status ${res.status}`);
        }
        const data = (await res.json()) as ModuleSummary[];
        if (!cancelled) {
          setModules(data);
          setModulesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setModulesError("Failed to load modules.");
        }
      } finally {
        if (!cancelled) {
          setModulesLoading(false);
        }
      }
    }

    if (!unauthorized) {
      void loadModules();
    }

    return () => {
      cancelled = true;
    };
  }, [unauthorized]);

  if (unauthorized) {
    return (
      <Layout title="Teacher Dashboard">
        <p role="alert">You do not have access to this page. Redirecting…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Teacher Dashboard">
      <section aria-labelledby="teacher-welcome" className="mb-8">
        <h2 id="teacher-welcome" className="text-lg font-semibold mb-2">
          Welcome, Teacher
        </h2>
        <p>
          This is a Day 2 scaffold for the teacher dashboard. It will list your
          modules and uploads in future iterations.
        </p>
      </section>

      <section aria-labelledby="teacher-modules" className="mb-8">
        <h2 id="teacher-modules" className="text-lg font-semibold mb-2">
          Your modules (sample data)
        </h2>
        {modulesLoading && <p>Loading modules…</p>}
        {modulesError && (
          <p role="alert" className="text-red-700">
            {modulesError}
          </p>
        )}
        {!modulesLoading && !modulesError && (
          <ul className="list-disc pl-5 text-sm">
            {modules.map((m) => (
              <li key={m.id}>
                <span className="font-medium">{m.title}</span>
                {m.course ? (
                  <span className="ml-1 text-gray-600">({m.course})</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="teacher-module">
        <h2 id="teacher-module" className="text-lg font-semibold mb-2">
          Sample Module: Calculus I – OCR Module
        </h2>
        <form>
          <label className="block mb-2">
            <span className="block mb-1">Upload course material (PDF/image)</span>
            <input type="file" accept=".pdf,image/*" className="block w-full" />
          </label>

          <label className="block mb-2">
            <span className="block mb-1">
              Optional description (up to ~2000 characters)
            </span>
            <textarea
              className="block w-full border rounded p-2"
              rows={5}
              maxLength={2000}
            />
          </label>

          <label className="block mb-4">
            <span className="block mb-1">Planned release date (placeholder)</span>
            <input
              type="datetime-local"
              className="block w-full border rounded p-2"
            />
          </label>

          <button
            type="button"
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Save (disabled placeholder)
          </button>
        </form>
      </section>
    </Layout>
  );
}

export default TeacherPage;
