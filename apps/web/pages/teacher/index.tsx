import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Layout } from "../../components/Layout";
import { getRoleFromUser } from "../../lib/roleUtils";

type ModuleSummary = {
  id: string | number;
  title: string;
  course?: string;
};

const sampleModules: ModuleSummary[] = [
  { id: "calc-1", title: "Calculus I – OCR Module", course: "Math 101" },
  { id: "calc-deriv", title: "Derivatives Workshop", course: "Math 101" },
  { id: "limits", title: "Limits & Continuity", course: "Math 101" },
];

const trainingEquations = [
  "f(x) = x^2",
  "f'(x) = 2x",
  "∫ x^2 dx = x^3/3 + C",
  "lim_{h→0} (f(x+h) - f(x))/h",
  "sin^2 x + cos^2 x = 1",
  "d/dx (sin x) = cos x",
  "d/dx (e^x) = e^x",
  "∫ 1/x dx = ln|x| + C",
  "f''(x) < 0 ⇒ concave down",
  "Mean Value Theorem: f'(c) = (f(b)-f(a))/(b-a)",
];

const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

function TeacherPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const preview = router.query.preview === "1";
  const [unauthorized, setUnauthorized] = useState(false);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | number>("calc-1");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketList, setTicketList] = useState<
    { id: string; detail: string; createdAt: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "teacher" | "assistant"; text: string }[]
  >([
    { role: "assistant", text: "Hi! Ask anything about your module or OCR results." },
  ]);

  useEffect(() => {
    if (!authEnabled) return;
    if (status === "loading") return;
    if (!session || !session.user) {
      if (!preview) void router.replace("/login");
      return;
    }

    if (preview) {
      setUnauthorized(false);
      return;
    }

    const role = getRoleFromUser(session.user);
    if (role !== "teacher") {
      setUnauthorized(true);
      void router.replace("/dashboard");
    }
  }, [session, status, router, preview]);

  useEffect(() => {
    let cancelled = false;

    async function loadModules() {
      try {
        const res = await fetch("/api/modules");
        if (!res.ok) {
          setModules(sampleModules);
          setModulesError(null);
          setModulesLoading(false);
          return;
        }
        const data = (await res.json()) as ModuleSummary[];
        if (!cancelled) {
          setModules(data.length ? data : sampleModules);
          setModulesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setModules(sampleModules);
          setModulesError(null);
        }
      } finally {
        if (!cancelled) {
          setModulesLoading(false);
        }
      }
    }

    if (!unauthorized && (!authEnabled || (session && session.user))) {
      void loadModules();
    }

    return () => {
      cancelled = true;
    };
  }, [unauthorized, session]);

  if (unauthorized) {
    return (
      <Layout title="Teacher Dashboard">
        <p role="alert">You do not have access to this page. Redirecting…</p>
      </Layout>
    );
  }

  const handleTicketSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!ticketDescription.trim()) return;
    const now = new Date().toISOString();
    const payload = {
      detail: ticketDescription.trim(),
      score: 75,
      userEmail: session?.user?.email ?? null,
    };
    void fetch("/api/support-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed with status ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const newTicket = {
          id: data.id ?? `ticket-${ticketList.length + 1}`,
          detail: payload.detail,
          createdAt: data.createdAt ?? now,
        };
        setTicketList((prev) => [newTicket, ...prev].slice(0, 5));
        setTicketDescription("");
      })
      .catch(() => {
        const newTicket = {
          id: `ticket-${ticketList.length + 1}`,
          detail: payload.detail,
          createdAt: now,
        };
        setTicketList((prev) => [newTicket, ...prev].slice(0, 5));
        setTicketDescription("");
      });
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { role: "teacher", text: chatInput.trim() }]);
    // Placeholder AI reply
    setChatMessages((prev) => [
      ...prev,
      { role: "teacher", text: chatInput.trim() },
      { role: "assistant", text: "AI response coming soon." },
    ]);
    setChatInput("");
  };

  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? modules[0];

  return (
    <Layout title="Teacher Dashboard">
      <div className="space-y-8">
        <section aria-labelledby="teacher-welcome" className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800">
          <h2 id="teacher-welcome" className="text-2xl font-semibold mb-3">
            Welcome, Teacher
          </h2>
          <p className="text-lg leading-relaxed">
            Manage modules, review student reports, handle support tickets, and train OCR with your handwritten math.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="teacher-modules" className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 id="teacher-modules" className="text-xl font-semibold">Your modules</h2>
            </div>
            {modulesLoading && <p>Loading modules…</p>}
            {modulesError && <p role="alert" className="text-red-700">{modulesError}</p>}
            {!modulesLoading && (
              <ul className="space-y-2 text-sm">
                {modules.map((m) => (
                  <li key={m.id} className="flex items-center justify-between border rounded p-2 bg-slate-50 dark:bg-slate-800">
                    <div>
                      <span className="font-medium">{m.title}</span>
                      {m.course && <span className="ml-1 text-gray-600">({m.course})</span>}
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-blue-600 text-white text-xs"
                      onClick={() => setSelectedModuleId(m.id)}
                    >
                      Select
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="teacher-chat" className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="teacher-chat" className="text-xl font-semibold">AI assistant</h2>
            </div>
            <div className="flex-1 min-h-[180px] max-h-[240px] overflow-auto space-y-2 border rounded p-3 bg-slate-50 dark:bg-slate-800 text-sm">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={m.role === "assistant" ? "text-slate-700 dark:text-slate-200" : "text-slate-900 dark:text-slate-100 font-semibold"}>
                  <span className="uppercase text-xs mr-2">{m.role === "assistant" ? "AI" : "You"}</span>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about OCR results, students, or modules..."
                className="flex-1 border rounded px-3 py-2 text-sm bg-white dark:bg-slate-800"
              />
              <button
                type="button"
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
                onClick={handleSendChat}
              >
                Send
              </button>
            </div>
          </section>
        </div>

        <section aria-labelledby="teacher-upload" className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800">
          <h2 id="teacher-upload" className="text-xl font-semibold mb-3">
            Upload course material
          </h2>
          <p className="text-sm mb-2">Selected module: {selectedModule?.title || "None"}</p>
          <form className="space-y-3">
            <label className="block">
              <span className="block mb-1 text-sm">Choose module</span>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="border rounded px-3 py-2 text-sm bg-white dark:bg-slate-800"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block mb-1 text-sm">Upload course material (PDF/image)</span>
              <input type="file" accept=".pdf,image/*" className="block w-full text-sm" />
            </label>
            <label className="block">
              <span className="block mb-1 text-sm">Optional description (up to ~2000 characters)</span>
              <textarea className="block w-full border rounded p-2 text-sm" rows={4} maxLength={2000} />
            </label>
            <label className="block">
              <span className="block mb-1 text-sm">Planned release date</span>
              <input type="datetime-local" className="block w-full border rounded p-2 text-sm" />
            </label>
            <button type="button" className="px-4 py-2 rounded bg-blue-600 text-white text-sm">
              Save
            </button>
          </form>
        </section>

        <section aria-labelledby="teacher-training" className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800">
          <h2 id="teacher-training" className="text-xl font-semibold mb-3">
            Training: Calculus I – OCR Module
          </h2>
          <p className="text-sm mb-3">
            Handwrite these equations, snap a photo (camera/gallery/file), and upload. The AI will use them to improve OCR on this module. You can add your own use cases below.
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-sm mb-3">
            {trainingEquations.map((eq, idx) => (
              <li key={idx}>{eq}</li>
            ))}
          </ol>
          <div className="space-y-2">
            <label className="block text-sm">
              <span className="block mb-1">Upload handwritten set (PDF/image)</span>
              <input type="file" accept=".pdf,image/*" className="block w-full text-sm" />
            </label>
            <label className="block text-sm">
              <span className="block mb-1">Add custom equation/use case (optional)</span>
              <textarea className="w-full border rounded p-2 text-sm" rows={3} placeholder="Equation + expected handwritten example" />
            </label>
            <button type="button" className="px-4 py-2 rounded bg-emerald-600 text-white text-sm">
              Submit training sample
            </button>
          </div>
        </section>

        <section aria-labelledby="teacher-support" className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800">
          <h2 id="teacher-support" className="text-xl font-semibold mb-3">
            Support & escalation
          </h2>
          <p className="text-sm mb-3">
            Report issues (e.g., OCR below 80%) with optional attachments. Tickets are available to admins for follow-up.
          </p>
          <form onSubmit={handleTicketSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="block mb-1">Attach screenshot or file (optional)</span>
              <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="block w-full text-base" />
            </label>
            <label className="block text-sm">
              <span className="block mb-1">Describe the issue</span>
              <textarea
                className="w-full border rounded p-3 text-base bg-white dark:bg-slate-800"
                rows={4}
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                placeholder="Example: OCR scored 72% on derivatives notes; missed Greek symbols."
              />
            </label>
            <button
              type="submit"
              className="px-5 py-3 rounded bg-blue-700 text-white text-base disabled:opacity-60"
              disabled={!ticketDescription.trim()}
            >
              Submit ticket
            </button>
          </form>
          {ticketList.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Recent tickets (local preview)</p>
              <ul className="space-y-2 text-sm">
                {ticketList.map((t) => (
                  <li key={t.id} className="p-2 rounded border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                    <div className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</div>
                    <p className="mt-1">{t.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

export default TeacherPage;
