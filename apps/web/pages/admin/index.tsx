import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Layout } from "../../components/Layout";
import { getRoleFromUser } from "../../lib/roleUtils";
import sampleStudents from "../../data/sampleStudents.json";
import sampleUploads from "../../data/sampleUploads.json";
import sampleTickets from "../../data/sampleTickets.json";

type Student = {
  id: number;
  name: string;
  email: string;
  course: string;
};

type UploadSummary = {
  id: string;
  filename?: string | null;
  mimetype?: string | null;
  size?: number | null;
  status: string;
  createdAt?: string | null;
};

type SupportTicket = {
  id: string;
  detail: string;
  createdAt: string;
  score?: number | null;
  userEmail?: string | null;
  attachmentUrl?: string | null;
  scannedText?: string | null;
  correctedText?: string | null;
  fileName?: string | null;
};

const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

const allowSampleEnv =
  process.env.NEXT_PUBLIC_ALLOW_SAMPLE_FALLBACKS === "true" &&
  process.env.NODE_ENV !== "production";

const normalizeTickets = (raw: any[]): SupportTicket[] =>
  (raw || []).map((t: any) => ({
    id: t.id ?? (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Math.random())),
    detail: t.detail ?? t.message ?? "OCR issue reported",
    createdAt: t.createdAt ?? new Date().toISOString(),
    score: t.score ?? t.meta?.score ?? null,
    userEmail: t.userEmail ?? t.studentEmail ?? t.meta?.userEmail ?? null,
    attachmentUrl: t.attachmentUrl ?? t.meta?.attachmentUrl ?? null,
    scannedText: t.scannedText ?? t.meta?.scannedText ?? null,
    correctedText: t.correctedText ?? t.meta?.correctedText ?? null,
    fileName: t.fileName ?? t.meta?.fileName ?? null,
  }));


function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const preview = router.query.preview === "1";
  const showPreviewNav = router.query.showPreviewNav === "1";
  const role = session?.user ? getRoleFromUser(session.user) : null;
  const [unauthorized, setUnauthorized] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [ocrSource, setOcrSource] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<UploadSummary[]>([]);
  const [uploadsError, setUploadsError] = useState<string | null>(null);
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [useSamples, setUseSamples] = useState(preview || allowSampleEnv);
  const isPreviewOnly = preview && (!session || !session.user);

  useEffect(() => {
    if (!authEnabled) return;
    if (status === "loading") return;
    if (preview) {
      setUnauthorized(false);
      return;
    }
    if (!session || !session.user) {
      void router.replace("/login");
      return;
    }

    const r = getRoleFromUser(session.user);

    if (r !== "admin") {
      setUnauthorized(true);
      void router.replace("/dashboard");
    }
  }, [session, status, router, preview]);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      if (authEnabled && !isPreviewOnly && (!session || !session.user || unauthorized)) return;
      if (unauthorized) return;
      try {
        const res = await fetch("/api/students");
        if (!res.ok) {
          if (useSamples) {
            setStudents(sampleStudents as Student[]);
            setStudentsError(null);
          } else {
            setStudentsError("Students unavailable (samples disabled).");
          }
          setStudentsLoading(false);
          return;
        }
        const data: Student[] = await res.json();
        if (!cancelled) {
          if (data.length) {
            setStudents(data);
            setStudentsError(null);
          } else if (useSamples) {
            setStudents(sampleStudents as Student[]);
            setStudentsError(null);
          } else {
            setStudents([]);
            setStudentsError("No students yet (samples disabled).");
          }
        }
      } catch (error) {
        if (!cancelled) {
          if (useSamples) {
            setStudents(sampleStudents as Student[]);
            setStudentsError(null);
          } else {
            setStudentsError("Failed to load students (samples disabled).");
          }
        }
      } finally {
        if (!cancelled) {
          setStudentsLoading(false);
        }
      }
    }

    void loadStudents();
    async function loadUploads() {
      if (authEnabled && !isPreviewOnly && (!session || !session.user || unauthorized)) return;
      if (unauthorized) return;
      try {
        const res = await fetch("/api/uploads");
        if (!res.ok) {
          if (useSamples) {
            setUploads(sampleUploads as UploadSummary[]);
            setUploadsError(null);
          } else {
            setUploadsError("Uploads unavailable (samples disabled).");
          }
          setUploadsLoading(false);
          return;
        }
        const data = (await res.json()) as UploadSummary[];
        if (!cancelled) {
          if (data.length) {
            setUploads(data);
            setUploadsError(null);
          } else if (useSamples) {
            setUploads(sampleUploads as UploadSummary[]);
            setUploadsError(null);
          } else {
            setUploads([]);
            setUploadsError("No uploads yet (samples disabled).");
          }
        }
      } catch (error) {
        if (!cancelled) {
          if (useSamples) {
            setUploads(sampleUploads as UploadSummary[]);
            setUploadsError(null);
          } else {
            setUploadsError("Failed to load uploads (samples disabled).");
          }
        }
      } finally {
        if (!cancelled) {
          setUploadsLoading(false);
        }
      }
    }

    void loadUploads();
    async function loadTickets() {
      if (authEnabled && !isPreviewOnly && (!session || !session.user || unauthorized)) return;
      if (unauthorized) return;
      try {
        const res = await fetch("/api/support-tickets");
        if (!res.ok) {
          if (useSamples) {
            let merged = normalizeTickets(sampleTickets as any);
            if (typeof window !== "undefined") {
              const raw = window.localStorage.getItem("preview-ticket-student");
              if (raw) {
                try {
                  const parsed = JSON.parse(raw);
                  merged = [parsed, ...merged];
                } catch {
                  // ignore
                }
              }
            }
            setTickets(merged);
            setTicketsError(null);
          } else {
            setTicketsError("Tickets unavailable (samples disabled).");
          }
          setTicketsLoading(false);
          return;
        }
        const data = (await res.json()) as typeof sampleTickets;
        let normalized = normalizeTickets(Array.isArray(data) ? data : []);
        if (useSamples) {
          if (typeof window !== "undefined") {
            const raw = window.localStorage.getItem("preview-ticket-student");
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                normalized = [parsed, ...normalized];
              } catch {
                // ignore
              }
            }
          }
        }
        if (!cancelled) {
          if (normalized.length) {
            setTickets(normalized);
            setTicketsError(null);
          } else if (useSamples) {
            setTickets(normalizeTickets(sampleTickets as any));
            setTicketsError(null);
          } else {
            setTickets([]);
            setTicketsError("No tickets yet (samples disabled).");
          }
        }
      } catch (error) {
        if (!cancelled) {
          if (useSamples) {
            setTickets(normalizeTickets(sampleTickets as any));
            setTicketsError(null);
          } else {
            setTicketsError("Failed to load tickets (samples disabled).");
          }
        }
      } finally {
        if (!cancelled) {
          setTicketsLoading(false);
        }
      }
    }

    void loadTickets();

    return () => {
      cancelled = true;
    };
  }, [unauthorized, session, useSamples, isPreviewOnly]);

  const handleTestOcr = async () => {
    setOcrLoading(true);
    setOcrMessage(null);

    try {
      const res = await fetch("/api/test-ocr", { method: "POST" });
      const data = (await res.json()) as {
        message?: string;
        ocrAvailable?: boolean;
      };
      setOcrMessage(
        data.message ??
          (data.ocrAvailable
            ? "OCR test completed."
            : "OCR service is not available.")
      );
    } catch {
      setOcrMessage("Failed to invoke OCR test endpoint.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleUpload: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setUploadStatus("Uploading and processing...");
    setUploadError(null);
    setOcrSource(null);
    setUploading(true);

    const formElement = event.currentTarget;
    const fileInput = formElement.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setUploadStatus(null);
      setUploadError("Please choose a file to upload.");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        text?: string;
        source?: string;
      };

      setOcrSource(data.source ?? null);

      if (!data.ok) {
        setUploadStatus(null);
        setUploadError(data.message ?? "Upload failed.");
        return;
      }

      setUploadStatus(
        data.text && data.text.trim()
          ? "Upload completed. OCR text preview is shown below."
          : data.message ?? "Upload completed."
      );
      setOcrMessage(data.text ?? null);
    } catch {
      setUploadStatus(null);
      setUploadError("Something went wrong while uploading the file.");
    } finally {
      setUploading(false);
    }
  };

  if (unauthorized) {
    return (
      <Layout title="Admin Dashboard">
        <main className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6 transition-colors">
          <div className="max-w-xl w-full bg-white dark:bg-slate-900/80 shadow-lg rounded-2xl p-6 text-center border border-slate-200 dark:border-slate-800">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Admin dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mb-4" role="alert">
              You do not have access to this page. Redirecting...
            </p>
          </div>
        </main>
      </Layout>
    );
  }

  const previewNav = showPreviewNav ? (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200" htmlFor="preview-nav-admin">
      <span className="sr-only">Preview role</span>
      <select
        id="preview-nav-admin"
        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
        value="admin"
        onChange={(e) => {
          const target = e.target.value;
          void router.push(`/${target}?preview=1&showPreviewNav=1`);
        }}
      >
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </select>
    </label>
  ) : undefined;

  const sampleToggle =
    role === "admin" ? (
      <button
        type="button"
        onClick={() => setUseSamples((v) => !v)}
        className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
      >
        Samples: {useSamples ? "On" : "Off"}
      </button>
    ) : null;

  const secondaryNav = (
    <>
      {previewNav}
      {sampleToggle}
    </>
  );

  return (
    <Layout title="Admin Dashboard" secondaryNav={previewNav}>
      <main className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6 transition-colors">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-md p-6 border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Admin dashboard
                </p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Accessible Education Platform
                </h1>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Signed in as admin
                </span>
              </div>
            </div>
          </div>

          {/* Upload workspace - full width with two panels */}
          <section
            className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5"
            aria-labelledby="admin-upload"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  OCR pipeline
                </p>
                <h2 id="admin-upload" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Upload for OCR
                </h2>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300">
                Recent uploads and live preview
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-4 h-full">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Upload
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                  Tap the + button to pick a PDF/image from camera or gallery and send it to OCR.
                </p>
                <form onSubmit={handleUpload} aria-describedby="admin-upload-help">
                  <label className="flex items-center gap-3 mb-3">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      name="file"
                      className="sr-only"
                      capture="environment"
                    />
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white text-xl font-semibold shadow-sm">
                      +
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                      Select a PDF or image
                    </span>
                  </label>
                  <p id="admin-upload-help" className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    One-click upload; OCR preview will show on the right.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm shadow-sm disabled:opacity-60"
                      disabled={uploading}
                      aria-busy={uploading}
                    >
                      {uploading ? "Uploading..." : "Send"}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestOcr}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm shadow-sm dark:bg-emerald-500 dark:text-slate-900"
                    >
                      {ocrLoading ? "Running sample..." : "Run sample OCR"}
                    </button>
                  </div>
                </form>

                <div className="mt-3" aria-live="polite" role="status">
                  {uploadStatus && (
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">{uploadStatus}</p>
                  )}
                  {uploadError && (
                    <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                      {uploadError}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 h-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    OCR preview
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-300">
                    Latest upload or sample text
                  </span>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 min-h-[160px]">
                  {ocrMessage ? (
                    <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
                      {ocrMessage}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      Upload a file to see OCR text preview, or run the sample OCR test.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Recent uploads
                    </h4>
                    {uploadsLoading && (
                      <span className="text-xs text-slate-500 dark:text-slate-300">Loading...</span>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 max-h-48 overflow-auto">
                    {!uploadsLoading && uploads.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-300">No uploads yet.</p>
                    )}
                    {!uploadsLoading && uploads.length > 0 && (
                      <ul className="space-y-2 text-sm">
                        {uploads.slice(0, 5).map((u) => (
                          <li
                            key={u.id}
                            className="p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70"
                          >
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-300 mb-1">
                              <span>{u.mimetype || "file"}</span>
                              <span>{u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}</span>
                            </div>
                            <p className="text-slate-900 dark:text-slate-100">
                              {u.filename || "Untitled upload"}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-300">
                              {u.status} {typeof u.size === "number" ? `- ${(u.size / 1024).toFixed(1)} KB` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section
              aria-labelledby="admin-students"
              className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 id="admin-students" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Students
                </h2>
                {studentsLoading && (
                  <span className="text-xs text-slate-500 dark:text-slate-300">Loading...</span>
                )}
              </div>
              {studentsError && (
                <p role="alert" className="text-red-500 dark:text-red-300 text-sm">
                  {studentsError}
                </p>
              )}
              {!studentsLoading && !studentsError && (
                <div className="overflow-auto rounded-lg border border-slate-100 dark:border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Course</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{s.name}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{s.email}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{s.course}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section
              className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5"
              aria-labelledby="admin-uploads"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 id="admin-uploads" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Recent uploads
                </h2>
                {uploadsLoading && (
                  <span className="text-xs text-slate-500 dark:text-slate-300">Loading...</span>
                )}
              </div>
              {uploadsError && (
                <p role="alert" className="text-red-600 dark:text-red-300 text-sm">
                  {uploadsError}
                </p>
              )}
              {!uploadsLoading && !uploadsError && uploads.length === 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-300">No uploads yet.</p>
              )}
              {!uploadsLoading && !uploadsError && uploads.length > 0 && (
                <div className="overflow-auto rounded-lg border border-slate-100 dark:border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Filename</th>
                        <th className="px-3 py-2 text-left">MIME type</th>
                        <th className="px-3 py-2 text-left">Size</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploads.map((u) => (
                        <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{u.filename || ""}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{u.mimetype || ""}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                            {typeof u.size === "number" ? `${(u.size / 1024).toFixed(1)} KB` : ""}
                          </td>
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{u.status}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                            {u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    Role views
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Open dashboards
                  </h2>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Open the Student or Teacher dashboard in a new tab while you stay on admin.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/student?preview=1"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm shadow-sm hover:bg-blue-700"
                  target="_blank"
                  rel="noreferrer"
                >
                  Student dashboard
                </a>
                <a
                  href="/teacher?preview=1"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  target="_blank"
                  rel="noreferrer"
                >
                  Teacher dashboard
                </a>
              </div>
            </section>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    Teacher training docs
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Upload curriculum PDFs
                  </h2>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Provide handwritten/printed curriculum samples to improve OCR accuracy for math notes.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm shadow-sm cursor-pointer">
                  <span className="text-xl font-semibold leading-none">+</span>
                  <span>Upload PDF</span>
                  <input type="file" accept=".pdf" className="sr-only" />
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-300">
                  Supports PDF; drag scanned pages or export from LMS.
                </span>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    OCR analytics
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Quality & volume
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
                  <p className="text-xs uppercase text-slate-500 dark:text-slate-300 mb-1">
                    OCR samples
                  </p>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    10
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    Initial batch submitted
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
                  <p className="text-xs uppercase text-slate-500 dark:text-slate-300 mb-1">
                    Accuracy (mock)
                  </p>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    94%
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    Based on recent runs
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-3">
                Analytics are illustrative until we wire real OCR scoring.
              </p>
            </section>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    Support tickets
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    OCR issues (&lt;80%)
                  </h2>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Recent tickets submitted when OCR failed or scored under 80%. Includes the reported detail, score, and any attachment preview.
              </p>
              {ticketsError && (
                <p role="alert" className="text-red-600 dark:text-red-300 text-sm">
                  {ticketsError}
                </p>
              )}
              {ticketsLoading && <p className="text-sm text-slate-500">Loading tickets...</p>}
              {!ticketsLoading && !ticketsError && tickets.length === 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-300">No tickets yet.</p>
              )}
              {!ticketsLoading && !ticketsError && tickets.length > 0 && (
                <div className="overflow-auto rounded-lg border border-slate-100 dark:border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Student</th>
                        <th className="px-3 py-2 text-left">Created</th>
                        <th className="px-3 py-2 text-left">Score</th>
                        <th className="px-3 py-2 text-left">Detail</th>
                        <th className="px-3 py-2 text-left">Attachment</th>
                        <th className="px-3 py-2 text-left">Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => {
                        const isImage =
                          t.attachmentUrl &&
                          /(png|jpe?g|gif|webp|bmp|svg)$/i.test(t.attachmentUrl.split("?")[0]);
                        return (
                          <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800 align-top">
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              {t.userEmail ?? "Unknown"}
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {new Date(t.createdAt).toLocaleString()}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  (t.score ?? 0) < 80
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                                }`}
                              >
                                {t.score != null ? `${t.score}%` : "N/A"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100 max-w-xs">
                              <div className="line-clamp-3">{t.detail}</div>
                              {t.fileName && (
                                <div className="text-xs text-slate-500">File: {t.fileName}</div>
                              )}
                              {(t.scannedText || t.correctedText) && (
                                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                                  {t.scannedText && (
                                    <div>
                                      <span className="font-semibold">Scanned:</span> {t.scannedText}
                                    </div>
                                  )}
                                  {t.correctedText && (
                                    <div>
                                      <span className="font-semibold">Correction:</span> {t.correctedText}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              {t.attachmentUrl ? (
                                <a
                                  href={t.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 dark:text-blue-300 underline"
                                >
                                  View
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              {isImage ? (
                                <Image
                                  src={t.attachmentUrl as string}
                                  alt="Attachment preview"
                                  width={200}
                                  height={200}
                                  className="h-16 w-auto rounded border border-slate-200 dark:border-slate-700 object-contain"
                                />
                              ) : t.attachmentUrl ? (
                                <span className="text-xs text-slate-500 dark:text-slate-300">
                                  Preview unavailable
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default AdminPage;
