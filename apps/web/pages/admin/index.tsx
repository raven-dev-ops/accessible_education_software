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
import sampleModules from "../../data/sampleModules.json";

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

type ModuleSummary = {
  id: string | number;
  title: string;
  course?: string;
  teacherProgress?: number;
  studentCompletion?: number;
  submodulesCompleted?: number;
  submodulesTotal?: number;
  ticketsOpen?: number;
  ticketsResolved?: number;
  sampleEquation?: string;
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

type HealthState = "unknown" | "healthy" | "degraded" | "down";

type QaStateStatus = "unknown" | "pass" | "fail";

type QaState = {
  status: QaStateStatus;
  lastRunAt?: string;
  notes?: string;
};

const healthStyles: Record<
  HealthState,
  { bg: string; text: string; dot: string; border: string; label: string }
> = {
  healthy: {
    label: "Healthy",
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-700 dark:text-emerald-100",
    dot: "bg-emerald-500",
    border: "border border-emerald-200 dark:border-emerald-800",
  },
  degraded: {
    label: "Attention",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-100",
    dot: "bg-amber-500",
    border: "border border-amber-200 dark:border-amber-800",
  },
  down: {
    label: "Down",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-100",
    dot: "bg-red-500",
    border: "border border-red-200 dark:border-red-800",
  },
  unknown: {
    label: "Checking",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-200",
    dot: "bg-slate-400",
    border: "border border-slate-200 dark:border-slate-700",
  },
};

const getHealthStyle = (state: HealthState) => healthStyles[state] ?? healthStyles.unknown;

  const healthToValue = (state: HealthState) => {
  switch (state) {
    case "healthy":
      return 5;
    case "degraded":
      return 3;
    case "down":
      return 1;
    default:
      return 2;
  }
};

  const createBarHeights = (values: number[]) => {
  const max = Math.max(...values, 1);
  return values.map((v) => {
    const pct = Math.round((v / max) * 100);
    return Math.min(100, Math.max(16, pct));
  });
};


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
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [useSamples, setUseSamples] = useState(preview || allowSampleEnv);
  const isPreviewOnly = preview && (!session || !session.user);
  const [cloudRunHealth, setCloudRunHealth] = useState<HealthState>("unknown");
  const [cloudSqlHealth, setCloudSqlHealth] = useState<HealthState>("unknown");
  const [ocrHealth, setOcrHealth] = useState<HealthState>("unknown");
  const [now, setNow] = useState(new Date());
  const dbEnabled = Boolean(process.env.NEXT_PUBLIC_DB_ENABLED);
  const [qaStatus, setQaStatus] = useState<QaState>({ status: "unknown" });
  const [storageHealth, setStorageHealth] = useState<HealthState>("unknown");
  const [mathHealth, setMathHealth] = useState<HealthState>("unknown");
  const [overviewOpen, setOverviewOpen] = useState(false);

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

    async function loadModules() {
      if (authEnabled && !isPreviewOnly && (!session || !session.user || unauthorized)) return;
      if (unauthorized) return;
      try {
        const res = await fetch("/api/modules");
        if (!res.ok) {
          if (useSamples) {
            setModules(sampleModules as ModuleSummary[]);
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
          } else if (useSamples) {
            setModules(sampleModules as ModuleSummary[]);
            setModulesError(null);
          } else {
            setModules([]);
            setModulesError("No modules yet (samples disabled).");
          }
        }
      } catch (error) {
        if (!cancelled) {
          if (useSamples) {
            setModules(sampleModules as ModuleSummary[]);
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

    void loadUploads();
    void loadModules();

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

  // Health checks for app, OCR, storage, math inference
  useEffect(() => {
    let cancelled = false;

    async function runHealthChecks() {
      try {
        const res = await fetch("/api/status");
        if (!res.ok) {
          if (!cancelled) {
            setCloudRunHealth("degraded");
            setCloudSqlHealth("degraded");
            setOcrHealth("degraded");
            setStorageHealth("degraded");
          }
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          dbEnabled?: boolean;
          ocr?: "not_configured" | "available" | "unavailable" | "error";
          storage?: "not_configured" | "available" | "error";
          math?: "not_configured" | "available" | "unavailable" | "error";
          qa?: { status?: "unknown" | "pass" | "fail"; lastRunAt?: string | null; notes?: string | null };
        };
        if (!cancelled) {
          const appOk = data.ok !== false;
          setCloudRunHealth(appOk ? "healthy" : "degraded");
          setCloudSqlHealth(data.dbEnabled ? "healthy" : "degraded");

          if (!data.ocr || data.ocr === "not_configured") {
            setOcrHealth("unknown");
          } else if (data.ocr === "available") {
            setOcrHealth("healthy");
          } else if (data.ocr === "unavailable") {
            setOcrHealth("degraded");
          } else {
            setOcrHealth("degraded");
          }

          if (!data.storage || data.storage === "not_configured") {
            setStorageHealth("unknown");
          } else if (data.storage === "available") {
            setStorageHealth("healthy");
          } else {
            setStorageHealth("degraded");
          }

          if (!data.math || data.math === "not_configured") {
            setMathHealth("unknown");
          } else if (data.math === "available") {
            setMathHealth("healthy");
          } else if (data.math === "unavailable") {
            setMathHealth("degraded");
          } else {
            setMathHealth("degraded");
          }

          if (data.qa) {
            setQaStatus({
              status: data.qa.status ?? "unknown",
              lastRunAt: data.qa.lastRunAt ?? undefined,
              notes: data.qa.notes ?? undefined,
            });
          }
        }
      } catch (err) {
        console.error("Health check in admin dashboard failed:", err);
        if (!cancelled) {
          setCloudRunHealth("degraded");
          setCloudSqlHealth("degraded");
          setOcrHealth("degraded");
          setStorageHealth("degraded");
        }
      }
    }

    // Only run when admin APIs have settled to avoid double-load at page mount
    if (!unauthorized && !studentsLoading && !uploadsLoading) {
      void runHealthChecks();
    }

    return () => {
      cancelled = true;
    };
  }, [unauthorized, studentsLoading, uploadsLoading, studentsError, uploadsError]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

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
          const value = e.target.value;
          if (value === "student") {
            void router.push("/student?preview=1&showPreviewNav=1");
          } else if (value === "teacher") {
            void router.push("/teacher?preview=1&showPreviewNav=1");
          } else {
            void router.push("/admin?preview=1&showPreviewNav=1");
          }
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
        className="px-3 py-2 rounded-full border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        Sample data:{" "}
        <span className={useSamples ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold"}>
          {useSamples ? "On" : "Off"}
        </span>
      </button>
    ) : null;

  const secondaryNav = (
    <>
      {previewNav}
      {sampleToggle}
    </>
  );

  const formattedTimestamp = now.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const completedUploads = uploads.filter((u) => (u.status || "").toLowerCase() === "complete").length;
  const processingUploads = uploads.filter((u) => {
    const status = (u.status || "").toLowerCase();
    return status && status !== "complete";
  }).length;
  const pdfUploads = uploads.filter((u) => (u.mimetype || "").includes("pdf")).length;
  const lowScoreTickets = tickets.filter((t) => (t.score ?? 0) < 80).length;
  const scoredTickets = tickets.filter((t) => typeof t.score === "number") as { score: number }[];
  const averageTicketScore = scoredTickets.length
    ? Math.round(scoredTickets.reduce((sum, t) => sum + (t.score ?? 0), 0) / scoredTickets.length)
    : null;

  const databaseBars = createBarHeights([
    Math.max(students.length, 1),
    Math.max(uploads.length, 1),
    Math.max(tickets.length, 1),
    Math.max(lowScoreTickets, 1),
    Math.max(completedUploads, 1),
  ]);

  const buildDurationHistory = [12, 10, 11, 9, 13];
  const buildBars = createBarHeights(buildDurationHistory);
  const buildLatest = buildDurationHistory[buildDurationHistory.length - 1];
  const buildLongest = Math.max(...buildDurationHistory);

  const apiBars = createBarHeights([
    Math.max(uploads.length, 1),
    Math.max(processingUploads, 1),
    Math.max(tickets.length, 1),
    Math.max(completedUploads, 1),
    Math.max(lowScoreTickets, 1),
  ]);

  const testsBars = createBarHeights([
    averageTicketScore ?? 60,
    Math.max(lowScoreTickets, 1),
    Math.max(scoredTickets.length, 1),
    Math.max(healthToValue(ocrHealth) * 10, 5),
    Math.max(tickets.length || 1, 1),
  ]);

  const connectionHealth: HealthState =
    cloudRunHealth === "down" || cloudSqlHealth === "down" || storageHealth === "down" || mathHealth === "down"
      ? "down"
      : cloudRunHealth === "degraded" ||
        cloudSqlHealth === "degraded" ||
        storageHealth === "degraded" ||
        ocrHealth === "degraded" ||
        mathHealth === "degraded"
      ? "degraded"
      : cloudRunHealth === "healthy" &&
        (cloudSqlHealth === "healthy" || cloudSqlHealth === "unknown") &&
        (storageHealth === "healthy" || storageHealth === "unknown") &&
        (ocrHealth === "healthy" || ocrHealth === "unknown") &&
        (mathHealth === "healthy" || mathHealth === "unknown")
      ? "healthy"
      : "unknown";

  const connectionBars = createBarHeights([
    Math.max(healthToValue(cloudRunHealth), 1),
    Math.max(healthToValue(cloudSqlHealth), 1),
    Math.max(healthToValue(ocrHealth), 1),
    Math.max(healthToValue(storageHealth), 1),
    Math.max(healthToValue(mathHealth), 1),
    Math.max(pdfUploads || 1, 1),
  ]);

  const databaseStatus = getHealthStyle(cloudSqlHealth);
  const apiStatus = getHealthStyle(cloudRunHealth);
  const testStatus = getHealthStyle(ocrHealth);
  const buildStatus = getHealthStyle("healthy");
  const connectionStatus = getHealthStyle(connectionHealth);
  const overviewSections = [
    {
      key: "database",
      title: "DATABASE",
      subtitle: "Storage & DB posture",
      status: databaseStatus,
      bars: databaseBars,
      barGradient: "from-blue-200 to-blue-500 dark:from-blue-900/40 dark:to-blue-400",
      sparkline: "from-blue-400 via-blue-500 to-indigo-500",
      stats: [
        { label: "Students", value: students.length },
        { label: "Uploads stored", value: uploads.length },
        { label: "Tickets linked", value: tickets.length },
      ],
    },
    {
      key: "builds",
      title: "BUILDS",
      subtitle: "CI / Cloud Build & deploys",
      status: buildStatus,
      bars: buildBars,
      barGradient: "from-emerald-200 to-emerald-500 dark:from-emerald-900/40 dark:to-emerald-400",
      sparkline: "from-emerald-400 via-green-500 to-teal-500",
      stats: [
        { label: "Branch", value: "main" },
        { label: "Last build", value: `${buildLatest} min` },
        { label: "Longest sample", value: `${buildLongest} min` },
      ],
    },
    {
      key: "api",
      title: "API",
      subtitle: "Web, backend & math services",
      status: apiStatus,
      bars: apiBars,
      barGradient: "from-indigo-200 to-indigo-500 dark:from-indigo-900/40 dark:to-indigo-400",
      sparkline: "from-indigo-400 via-sky-500 to-cyan-500",
      stats: [
        { label: "Uploads routed", value: uploads.length },
        { label: "Processing", value: processingUploads },
        { label: "Ticket webhooks", value: tickets.length },
      ],
    },
    {
      key: "tests",
      title: "TESTS",
      subtitle: "QA & OCR harness",
      status: testStatus,
      bars: testsBars,
      barGradient: "from-amber-200 to-amber-500 dark:from-amber-900/40 dark:to-amber-400",
      sparkline: "from-amber-400 via-orange-500 to-amber-500",
      stats: [
        { label: "Avg OCR score", value: averageTicketScore != null ? `${averageTicketScore}%` : "--" },
        { label: "Flagged < 80%", value: lowScoreTickets },
        { label: "Sample tickets", value: tickets.length },
        {
          label: "QA status",
          value:
            qaStatus.status === "pass"
              ? "Pass"
              : qaStatus.status === "fail"
              ? "Fail"
              : "Unknown",
        },
        {
          label: "Last QA run",
          value: qaStatus.lastRunAt
            ? new Date(qaStatus.lastRunAt).toLocaleString()
            : "Not recorded",
        },
      ],
    },
    {
      key: "connections",
      title: "CONNECTIONS",
      subtitle: "GCP services & data path",
      status: connectionStatus,
      bars: connectionBars,
      barGradient: "from-slate-200 to-slate-500 dark:from-slate-800 dark:to-slate-400",
      sparkline: "from-slate-400 via-slate-500 to-slate-700",
      stats: [
        { label: "Web/API", value: apiStatus.label },
        { label: "DB", value: databaseStatus.label },
        {
          label: "Math service",
          value:
            mathHealth === "healthy"
              ? "Healthy"
              : mathHealth === "degraded"
              ? "Attention"
              : mathHealth === "down"
              ? "Down"
              : "Not configured",
        },
        {
          label: "GCS bucket",
          value:
            storageHealth === "healthy"
              ? "Healthy"
              : storageHealth === "degraded"
              ? "Attention"
              : storageHealth === "down"
              ? "Down"
              : "Not configured",
        },
        { label: "Auth", value: authEnabled ? "Enabled" : "Disabled" },
      ],
    },
  ];

  return (
    <Layout title="Admin Dashboard" secondaryNav={secondaryNav}>
      <main className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6 transition-colors">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-md p-6 border border-slate-100 dark:border-slate-800">
            <div className="grid gap-4 md:grid-cols-2 items-center">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center text-2xl font-bold">
                  {(session?.user?.name || "Sample Admin").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {session?.user?.name || "Sample Admin"}
                  </h1>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {session?.user?.email || "admin@example.com"}
                  </p>
                  <p className="text-base leading-relaxed mt-2 text-slate-800 dark:text-slate-200">
                    Accessible Education Platform. Monitor students, teachers, uploads, OCR quality, and support tickets across the system.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {dbEnabled ? "Production view" : "Admin view"}
                </span>
                {!preview ? (
                  <>
                    <Link
                      href={{
                        pathname: "/student",
                        query: {
                          fromAdmin: "1",
                          samples: useSamples ? "1" : "0",
                        },
                      }}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
                    >
                      View as Student
                    </Link>
                    <Link
                      href={{
                        pathname: "/teacher",
                        query: {
                          fromAdmin: "1",
                          samples: useSamples ? "1" : "0",
                        },
                      }}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
                    >
                      View as Teacher
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Opens the live dashboards without preview flags.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    View-as buttons are disabled in preview mode.
                  </p>
                )}
              </div>
            </div>
          </div>


          {/* System overview - high level UX and infrastructure status */}
          <section
            className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5"
            aria-labelledby="admin-overview"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 mb-2 text-left"
              aria-expanded={overviewOpen}
              aria-controls="admin-overview-panel"
              onClick={() => setOverviewOpen((open) => !open)}
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  System overview
                </p>
                <h2 id="admin-overview" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Experience & infrastructure health
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-slate-500 dark:text-slate-300">
                  {useSamples && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Live preview of sample data
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    {formattedTimestamp}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100 transition-transform ${
                    overviewOpen ? "rotate-90" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▸
                </span>
              </div>
            </button>

            {overviewOpen && (
              <div
                id="admin-overview-panel"
                className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5"
              >
                {overviewSections.map((section) => (
                  <div
                    key={section.key}
                    className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
                          {section.title}
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-200">{section.subtitle}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Updated {formattedTimestamp}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${section.status.bg} ${section.status.text} ${section.status.border}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${section.status.dot}`} />
                        {section.status.label}
                      </span>
                    </div>
                    {section.bars.length > 0 && (
                      <div className="mt-3 space-y-2" aria-hidden="true">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Composite health</span>
                          <span>
                            {Math.round(
                              section.bars.reduce((sum, v) => sum + v, 0) / section.bars.length
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${section.barGradient}`}
                            style={{
                              width: `${Math.round(
                                section.bars.reduce((sum, v) => sum + v, 0) / section.bars.length
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <dl className="space-y-1 text-sm">
                      {section.stats.map((stat) => (
                        <div key={`${section.key}-${stat.label}`} className="flex justify-between">
                          <dt className="text-slate-500 dark:text-slate-300">{stat.label}</dt>
                          <dd className="font-medium text-slate-900 dark:text-slate-100">{stat.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            aria-labelledby="admin-students-uploads"
            className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="admin-students-uploads"
                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
              >
                Students and recent uploads
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 id="admin-students" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Students
                  </h3>
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
                    <table className="w-full text-sm">
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3
                    id="admin-uploads"
                    className="text-base font-semibold text-slate-900 dark:text-slate-100"
                  >
                    Recent uploads (students)
                  </h3>
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
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Filename</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Size</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploads.map((u) => (
                          <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              <span className="block truncate max-w-[10rem]">{u.filename || ""}</span>
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              {u.mimetype?.split("/")[1] || u.mimetype || ""}
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              {typeof u.size === "number" ? `${(u.size / 1024).toFixed(1)} KB` : ""}
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{u.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            aria-labelledby="admin-teachers-uploads"
            className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="admin-teachers-uploads"
                className="text-lg font-semibold text-slate-900 dark:text-slate-100"
              >
                Teachers and curriculum uploads
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Modules (sample)
                  </h3>
                  {modulesLoading && (
                    <span className="text-xs text-slate-500 dark:text-slate-300">Loading...</span>
                  )}
                </div>
                {modulesError && (
                  <p role="alert" className="text-red-500 dark:text-red-300 text-sm">
                    {modulesError}
                  </p>
                )}
                {!modulesLoading && !modulesError && (
                  <div className="overflow-auto rounded-lg border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Module</th>
                          <th className="px-3 py-2 text-left">Course</th>
                          <th className="px-3 py-2 text-left">Teacher progress</th>
                          <th className="px-3 py-2 text-left">Student completion</th>
                          <th className="px-3 py-2 text-left">Submodules</th>
                          <th className="px-3 py-2 text-left">Tickets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((m) => (
                          <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              <span className="block truncate max-w-[12rem]">{m.title}</span>
                              {m.sampleEquation && (
                                <span className="block text-xs text-slate-500 dark:text-slate-400">
                                  {m.sampleEquation}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{m.course ?? "--"}</td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              {typeof m.teacherProgress === "number" ? `${m.teacherProgress}%` : "--"}
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              {typeof m.studentCompletion === "number" ? `${m.studentCompletion}%` : "--"}
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              {m.submodulesCompleted !== undefined && m.submodulesTotal !== undefined
                                ? `${m.submodulesCompleted}/${m.submodulesTotal}`
                                : "--"}
                            </td>
                            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                              {m.ticketsOpen !== undefined || m.ticketsResolved !== undefined
                                ? `${m.ticketsOpen ?? 0} open / ${m.ticketsResolved ?? 0} resolved`
                                : "--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Recent uploads (teachers)
                  </h3>
                  {uploadsLoading && (
                    <span className="text-xs text-slate-500 dark:text-slate-300">Loading...</span>
                  )}
                </div>
                {!uploadsLoading && !uploadsError && (
                  <div className="overflow-auto rounded-lg border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Filename</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Size</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploads
                          .filter((u) => (u.mimetype || "").includes("pdf"))
                          .map((u) => (
                            <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                              <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                                <span className="block truncate max-w-[12rem]">{u.filename || ""}</span>
                              </td>
                              <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                                {u.mimetype?.split("/")[1] || u.mimetype || ""}
                              </td>
                              <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                                {typeof u.size === "number" ? `${(u.size / 1024).toFixed(1)} KB` : ""}
                              </td>
                              <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{u.status}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  OCR analytics & support
                </p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Quality, volume, and issues
                </h2>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3 mb-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xs uppercase text-slate-500 dark:text-slate-300 mb-1">
                  OCR samples (mock)
                </p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">10</p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Initial batch submitted
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xs uppercase text-slate-500 dark:text-slate-300 mb-1">
                  Accuracy (mock)
                </p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {averageTicketScore != null ? `${averageTicketScore}%` : "--"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Based on recent ticket scores
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xs uppercase text-slate-500 dark:text-slate-300 mb-1">
                  Tickets &lt; 80%
                </p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {tickets.filter((t) => (t.score ?? 0) < 80).length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Student-reported OCR issues
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 mb-4">
              Analytics are illustrative until we wire real OCR scoring. Tickets below show concrete examples where OCR scored under 80% or was corrected.
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
                      <th className="px-3 py-2 text-left">Summary</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
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
                          <div className="line-clamp-2">{t.detail}</div>
                          {t.fileName && (
                            <div className="text-xs text-slate-500">File: {t.fileName}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                          <button
                            type="button"
                            className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setActiveTicket(t)}
                          >
                            View ticket
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
      {activeTicket && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-xl w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Ticket details
                </p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  OCR issue for {activeTicket.userEmail ?? "Unknown student"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="text-sm px-3 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-800 dark:text-slate-100">
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Created: {new Date(activeTicket.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold">Score:</span>{" "}
                {activeTicket.score != null ? `${activeTicket.score}%` : "N/A"}
              </p>
              <p>
                <span className="font-semibold">Detail:</span> {activeTicket.detail}
              </p>
              {(activeTicket.scannedText || activeTicket.correctedText) && (
                <div className="space-y-1">
                  {activeTicket.scannedText && (
                    <p>
                      <span className="font-semibold">Scanned:</span> {activeTicket.scannedText}
                    </p>
                  )}
                  {activeTicket.correctedText && (
                    <p>
                      <span className="font-semibold">Correction:</span> {activeTicket.correctedText}
                    </p>
                  )}
                </div>
              )}
              {activeTicket.attachmentUrl && (
                <p className="mt-2">
                  <span className="font-semibold">Attachment:</span>{" "}
                  <a
                    href={activeTicket.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-300 underline"
                  >
                    Open in new tab
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default AdminPage;
