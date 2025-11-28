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
  { id: "calc-1", title: "Calculus I  OCR Module", course: "Math 101" },
  { id: "calc-deriv", title: "Derivatives Workshop", course: "Math 101" },
  { id: "limits", title: "Limits & Continuity", course: "Math 101" },
];

const trainingSets: Record<
  string,
  { title: string; equations: string[] }
> = {
  "calc-1": {
    title: "Calculus I  OCR Module",
    equations: [
      "f(x) = x^2",
      "f'(x) = 2x",
      " x^2 dx = x^3/3 + C",
      "lim_{h0} (f(x+h) - f(x))/h",
      "sin^2 x + cos^2 x = 1",
      "d/dx (sin x) = cos x",
      "d/dx (e^x) = e^x",
      " 1/x dx = ln|x| + C",
      "f''(x) < 0  concave down",
      "Mean Value Theorem: f'(c) = (f(b)-f(a))/(b-a)",
    ],
  },
  "calc-deriv": {
    title: "Derivatives Workshop",
    equations: [
      "f(x) = 3x^3 - 5x + 2",
      "f'(x) = 9x^2 - 5",
      "Product rule: (fg)' = f'g + fg'",
      "Quotient rule: (f/g)' = (f'g - fg')/g^2",
      "Chain rule: d/dx f(g(x)) = f'(g(x)) g'(x)",
      "d/dx (ln x) = 1/x",
      "d/dx (a^x) = a^x ln a",
      "f''(x) sign  concavity",
      "Critical points: f'(x)=0 or undefined",
      "d/dx (tan x) = sec^2 x",
    ],
  },
  limits: {
    title: "Limits & Continuity",
    equations: [
      "lim_{x0} sin x / x = 1",
      "lim_{x} (1 + 1/x)^x = e",
      "lim_{xa} f(x) exists  left=right",
      "Continuity: lim_{xa} f(x) = f(a)",
      "lim_{x0} (1 - cos x)/x^2 = 1/2",
      "Squeeze theorem example: x^2 sin(1/x)  0",
      "Removable discontinuity: hole at x=a",
      "Infinite limit: vertical asymptote at x=a",
      "lim_{x} (ax^n + )/(bx^m + )",
      "lim_{x0} (e^x - 1)/x = 1",
    ],
  },
};

const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";
const allowSampleEnv =
  process.env.NEXT_PUBLIC_ALLOW_SAMPLE_FALLBACKS === "true" &&
  process.env.NODE_ENV !== "production";

function TeacherPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const preview = router.query.preview === "1";
  const allowSamples = preview || allowSampleEnv;
  const [unauthorized, setUnauthorized] = useState(false);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | number>("calc-1");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketList, setTicketList] = useState<
    {
      id: string;
      detail: string;
      createdAt: string;
      studentEmail?: string | null;
      status?: string;
      score?: number | null;
      attachmentUrl?: string | null;
    }[]
  >([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const sampleTickets = [
    {
      id: "ticket-1",
      detail: "OCR scored 72% on derivatives; Greek symbols missing.",
      createdAt: "2025-11-28T10:00:00Z",
      studentEmail: "student1@example.com",
      status: "pending review",
      score: 72,
      attachmentUrl: null,
    },
    {
      id: "ticket-2",
      detail: "Handwriting not recognized on chain rule PDF.",
      createdAt: "2025-11-27T18:30:00Z",
      studentEmail: "student2@example.com",
      status: "pending review",
      score: 68,
      attachmentUrl: null,
    },
  ];
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "teacher" | "assistant"; text: string }[]
  >([
    { role: "assistant", text: "Hi! Ask anything about your module or OCR results." },
  ]);
  const [equationProgress, setEquationProgress] = useState<
    Record<
      string,
      { fileName?: string; score?: number | null; status: "pending" | "pass" | "fail"; editableText?: string }
    >
  >({});
  const [eqCollapsed, setEqCollapsed] = useState<Record<string, boolean>>(() => {
    // default collapsed
    const init: Record<string, boolean> = {};
    Object.keys(trainingSets).forEach((mid) => {
      trainingSets[mid].equations.forEach((_, idx) => {
        init[`${mid}-${idx}`] = true;
      });
    });
    return init;
  });

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
          if (allowSamples) {
            setModules(sampleModules);
            setModulesError(null);
          } else {
            setModulesError("Modules unavailable (samples disabled).");
          }
          setModulesLoading(false);
          return;
        }
        const data = (await res.json()) as ModuleSummary[];
        if (!cancelled) {
          if (data.length) {
            setModules(data);
            setModulesError(null);
          } else if (allowSamples) {
            setModules(sampleModules);
            setModulesError(null);
          } else {
            setModules([]);
            setModulesError("No modules yet (samples disabled).");
          }
        }
      } catch (error) {
        if (!cancelled) {
          if (allowSamples) {
            setModules(sampleModules);
            setModulesError(null);
          } else {
            setModulesError("Failed to load modules (samples disabled).");
          }
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
  }, [unauthorized, session, allowSamples]);

  useEffect(() => {
    let cancelled = false;
    async function loadTickets() {
      try {
        const res = await fetch("/api/support-tickets");
        if (!res.ok) {
          if (allowSamples) {
            setTicketList(sampleTickets);
            setTicketsError(null);
          } else {
            setTicketsError("Tickets unavailable (samples disabled).");
          }
          setTicketsLoading(false);
          return;
        }
        const data = (await res.json()) as {
          id: string;
          detail: string;
          createdAt: string;
          score?: number | null;
          userEmail?: string | null;
          attachmentUrl?: string | null;
        }[];
        if (!cancelled) {
          setTicketList(
            data.map((t) => ({
              id: t.id,
              detail: t.detail,
              createdAt: t.createdAt,
              studentEmail: t.userEmail ?? null,
              status: (t.score ?? 0) >= 80 ? "pass" : "pending review",
              score: t.score ?? null,
              attachmentUrl: t.attachmentUrl ?? null,
            }))
          );
          setTicketsError(null);
        }
      } catch (err) {
        if (!cancelled) {
          if (allowSamples) {
            setTicketList(sampleTickets);
            setTicketsError(null);
          } else {
            setTicketsError("Failed to load tickets (samples disabled).");
          }
        }
      } finally {
        if (!cancelled) setTicketsLoading(false);
      }
    }
    if (!unauthorized) void loadTickets();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unauthorized, allowSamples]);

  if (unauthorized) {
    return (
      <Layout title="Teacher Dashboard">
        <p role="alert">You do not have access to this page. Redirecting</p>
      </Layout>
    );
  }

  const handleTicketSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    // For now, this form is for teacher notes on an existing ticket selection; placeholder no-op.
    setTicketDescription("");
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
  const training = trainingSets[selectedModule?.id as string] ?? Object.values(trainingSets)[0];

  return (
    <Layout title="Teacher Dashboard">
      <div className="space-y-8">
        <section
          aria-labelledby="teacher-profile"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800 flex items-center gap-4"
        >
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center text-2xl font-bold">
            {(session?.user?.name || "Sample Teacher").charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 id="teacher-profile" className="text-xl font-semibold">
              {session?.user?.name || "Sample Teacher"}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {session?.user?.email || "teacher@example.com"}
            </p>
          </div>
        </section>

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
            {modulesLoading && <p>Loading modules</p>}
            {modulesError && <p role="alert" className="text-red-700">{modulesError}</p>}
            {!modulesLoading && (
              <ul className="space-y-2 text-sm">
                {modules.map((m) => {
                  const eqs = trainingSets[m.id as string]?.equations?.length || 0;
                  const passed = Object.entries(equationProgress).filter(
                    ([key, val]) => key.startsWith(`${m.id}-`) && val.status === "pass"
                  ).length;
                  const pct = eqs ? Math.round((passed / eqs) * 100) : 0;
                  return (
                    <li key={m.id} className="flex flex-col gap-2 border rounded p-3 bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-center justify-between">
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
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Training progress: {passed}/{eqs || 10} ({pct}%)
                      </div>
                      <div className="w-full h-2 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                          aria-label={`Training progress ${pct}%`}
                        />
                      </div>
                    </li>
                  );
                })}
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
            Training: {training.title}
          </h2>
          <p className="text-sm mb-3">
            Complete all 10 equations. Upload one handwritten image per equation. OCR scores above 80% are marked passing; you can edit the recognized text before saving.
          </p>
          <div className="space-y-3">
            {training.equations.map((eq, idx) => {
              const key = `${selectedModuleId}-${idx}`;
              const progress = equationProgress[key] || {
                status: "pending" as const,
                score: null,
                editableText: "",
              };
              const collapsed = eqCollapsed[key] ?? false;
              return (
                <div
                  key={idx}
                  className="border rounded p-3 bg-slate-50 dark:bg-slate-800 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="font-semibold text-sm text-left flex-1"
                      onClick={() =>
                        setEqCollapsed((prev) => ({
                          ...prev,
                          [key]: !collapsed,
                        }))
                      }
                    >
                      {collapsed ? "" : ""} {idx + 1}. {eq}
                    </button>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        progress.status === "pass"
                          ? "bg-emerald-100 text-emerald-700"
                          : progress.status === "fail"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {progress.status === "pass"
                        ? `Pass (${progress.score ?? ""}%)`
                        : progress.status === "fail"
                        ? `Below 80% (${progress.score ?? ""}%)`
                        : "Pending"}
                    </span>
                  </div>
                  {!collapsed && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <input type="file" accept=".pdf,image/*" className="text-sm" />
                        <button
                          type="button"
                          className="px-3 py-2 rounded bg-blue-600 text-white text-xs"
                          onClick={() => {
                            const mockScore = 82;
                            const mockText = `OCR result for ${eq}`;
                            setEquationProgress((prev) => ({
                              ...prev,
                              [key]: {
                                status: mockScore >= 80 ? "pass" : "fail",
                                score: mockScore,
                                editableText: mockText,
                              },
                            }));
                          }}
                        >
                          Upload & OCR
                        </button>
                      </div>
                      {progress.editableText !== undefined && (
                        <label className="text-xs">
                          <span className="block mb-1">Recognized text (edit before saving)</span>
                          <textarea
                            className="w-full border rounded p-2 text-sm"
                            rows={3}
                            value={progress.editableText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEquationProgress((prev) => ({
                                ...prev,
                                [key]: {
                                  ...progress,
                                  editableText: val,
                                },
                              }));
                            }}
                          />
                        </label>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Checklist: {Object.values(equationProgress).filter((p) => p.status === "pass").length} / {training.equations.length} passed.
              </p>
              <button type="button" className="px-4 py-2 rounded bg-emerald-600 text-white text-sm">
                Save training to profile
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="teacher-support" className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800">
          <h2 id="teacher-support" className="text-xl font-semibold mb-3">
            Student Tickets
          </h2>
          <p className="text-sm mb-3">
            Review or escalate student-submitted tickets (e.g., OCR below 80%). Add context and pass to software support as needed.
          </p>
          <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left">Student</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left">Score</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ticketList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-slate-500">
                      No pending tickets.
                    </td>
                  </tr>
                )}
                {ticketList.map((t) => (
                  <tr key={t.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {t.studentEmail || "Student"}
                      </div>
                      <div className="text-xs text-slate-500">{t.detail}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {t.score != null ? `${t.score}%` : ""}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {t.status || "pending review"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2 flex-wrap">
                        {t.attachmentUrl && (
                          <a
                            href={t.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-xs"
                          >
                            View attachment
                          </a>
                        )}
                        <button
                          type="button"
                          className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
                          onClick={() => {
                            const note = prompt("Add a teacher comment before closing:");
                            const updated = ticketList.map((item) =>
                              item.id === t.id ? { ...item, status: note ? `closed - ${note}` : "closed" } : item
                            );
                            setTicketList(updated);
                          }}
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 rounded bg-amber-500 text-white text-xs"
                          onClick={() => {
                            const note = prompt("Add escalation note:");
                            const updated = ticketList.map((item) =>
                              item.id === t.id
                                ? { ...item, status: note ? `escalated - ${note}` : "escalated" }
                                : item
                            );
                            setTicketList(updated);
                          }}
                        >
                          Escalate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>
                {ticketsLoading
                  ? "Loading tickets"
                  : ticketsError
                  ? "Using sample tickets (failed to load live data)."
                  : "Loaded tickets from /api/support-tickets."}
              </span>
              <button
                type="button"
                className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-xs"
                onClick={() => {
                  const id = `demo-${Date.now()}`;
                  const demo = {
                    id,
                    detail: "Demo ticket: OCR 70% on integrals; please review.",
                    createdAt: new Date().toISOString(),
                    studentEmail: "demo.student@example.com",
                    status: "pending review",
                    score: 70,
                    attachmentUrl: null,
                  };
                  setTicketList((prev) => [demo, ...prev]);
                }}
              >
                Add demo ticket
              </button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export default TeacherPage;




