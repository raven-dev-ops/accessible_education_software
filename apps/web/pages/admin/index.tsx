import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Layout } from "../../components/Layout";
import { getRoleFromUser } from "../../lib/roleUtils";
import sampleStudents from "../../data/sampleStudents.json";
import sampleUploads from "../../data/sampleUploads.json";

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

const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
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

  useEffect(() => {
    if (!authEnabled) return;
    if (status === "loading") return;
    if (!session || !session.user) {
      void router.replace("/login");
      return;
    }

    const role = getRoleFromUser(session.user);

    if (role !== "admin") {
      setUnauthorized(true);
      void router.replace("/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      if (authEnabled && (!session || !session.user || unauthorized)) return;
      if (unauthorized) return;
      try {
        const res = await fetch("/api/students");
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data: Student[] = await res.json();
        if (!cancelled) {
          setStudents(data.length ? data : (sampleStudents as Student[]));
          setStudentsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setStudentsError("Failed to load students.");
        }
      } finally {
        if (!cancelled) {
          setStudentsLoading(false);
        }
      }
    }

    void loadStudents();
    async function loadUploads() {
      if (authEnabled && (!session || !session.user || unauthorized)) return;
      if (unauthorized) return;
      try {
        const res = await fetch("/api/uploads");
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = (await res.json()) as UploadSummary[];
        if (!cancelled) {
          setUploads(data.length ? data : (sampleUploads as UploadSummary[]));
          setUploadsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setUploadsError("Failed to load uploads.");
        }
      } finally {
        if (!cancelled) {
          setUploadsLoading(false);
        }
      }
    }

    void loadUploads();

    return () => {
      cancelled = true;
    };
  }, [unauthorized, session]);

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
              You do not have access to this page. Redirecting…
            </p>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Dashboard">
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
                  <span className="text-xs text-slate-500 dark:text-slate-300">Loading…</span>
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
              className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 h-full"
              aria-labelledby="admin-upload"
            >
              <h2 id="admin-upload" className="text-lg font-semibold mb-2">
                Upload for OCR
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Upload a PDF or image to send it to the OCR service. A short text
                preview will appear when available.
              </p>
              <form onSubmit={handleUpload} aria-describedby="admin-upload-help">
                <label className="block mb-2">
                  <span className="block mb-1 text-sm text-slate-700 dark:text-slate-200">
                    Choose PDF or image
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    name="file"
                    className="block w-full text-sm text-slate-800 dark:text-slate-100"
                  />
                </label>
                <p id="admin-upload-help" className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Choose a file and select Upload. A short text preview will be
                  shown when available.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm shadow-sm disabled:opacity-60"
                    disabled={uploading}
                    aria-busy={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestOcr}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm shadow-sm dark:bg-emerald-500 dark:text-slate-900"
                  >
                    {ocrLoading ? "Running OCR test..." : "Run sample OCR test"}
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
                <span className="sr-only">
                  {uploadError
                    ? `Upload failed: ${uploadError}`
                    : uploadStatus
                    ? `Upload status: ${uploadStatus}`
                    : ""}
                </span>
              </div>

              {ocrMessage && (
                <section
                  className="mt-4 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800 p-3"
                  aria-labelledby="admin-ocr-preview"
                  aria-live="polite"
                >
                  <h3 id="admin-ocr-preview" className="font-semibold mb-1 text-slate-900 dark:text-slate-100">
                    OCR text preview
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-2">
                    {ocrSource === "ocr_service"
                      ? "This text came from the live OCR service."
                      : "OCR_SERVICE_URL is not configured; this is a stub preview."}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
                    {ocrMessage}
                  </p>
                </section>
              )}
            </section>
          </div>

          <section
            className="bg-white dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5"
            aria-labelledby="admin-uploads"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 id="admin-uploads" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Recent uploads
              </h2>
              {uploadsLoading && (
                <span className="text-xs text-slate-500 dark:text-slate-300">Loading…</span>
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
                          {typeof u.size === "number"
                            ? `${(u.size / 1024).toFixed(1)} KB`
                            : ""}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{u.status}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleString()
                            : ""}
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
    </Layout>
  );
}

export default AdminPage;
