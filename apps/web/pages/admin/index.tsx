import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Layout } from "../../components/Layout";
import { getRoleFromUser } from "../../lib/roleUtils";

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
          setStudents(data);
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
          setUploads(data);
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
  }, [unauthorized, authEnabled, session]);


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
        <p role="alert">You do not have access to this page. Redirecting...</p>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Dashboard">
      <section aria-labelledby="admin-students">
        <h2 id="admin-students" className="text-lg font-semibold mb-4">
          Students
        </h2>
        {studentsLoading && <p>Loading students...</p>}
        {studentsError && (
          <p role="alert" className="text-red-700">
            {studentsError}
          </p>
        )}
        {!studentsLoading && !studentsError && (
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Email</th>
                <th className="border px-2 py-1 text-left">Course</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="border px-2 py-1">{s.name}</td>
                  <td className="border px-2 py-1">{s.email}</td>
                  <td className="border px-2 py-1">{s.course}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>


      <section className="mt-8" aria-labelledby="admin-upload">
        <h2 id="admin-upload" className="text-lg font-semibold mb-2">
          Upload PDF or image for OCR
        </h2>
        <p className="mb-2 text-sm text-gray-700">
          Upload a PDF or image to send it to the OCR service. A short text preview
          will appear inline when available.
        </p>
        <form onSubmit={handleUpload} aria-describedby="admin-upload-help">
          <label className="block mb-2">
            <span className="block mb-1">Choose PDF or image</span>
            <input
              type="file"
              accept=".pdf,image/*"
              name="file"
              className="block w-full"
            />
          </label>
          <p id="admin-upload-help" className="text-xs text-gray-600 mb-2">
            Choose a file and select Upload to send it to the OCR API. A short
            text preview will be shown when available.
          </p>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
            disabled={uploading}
            aria-busy={uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>

        <div className="mt-3" aria-live="polite" role="status">
          {uploadStatus && (
            <p className="text-sm text-green-700">{uploadStatus}</p>
          )}
          {uploadError && (
            <p className="text-sm text-red-700" role="alert">
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
            className="mt-4"
            aria-labelledby="admin-ocr-preview"
            aria-live="polite"
          >
            <h3 id="admin-ocr-preview" className="font-semibold mb-1">
              OCR text preview
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              {ocrSource === "ocr_service"
                ? "This text came from the live OCR service."
                : "OCR_SERVICE_URL is not configured; this is a stub preview."}
            </p>
            <p className="whitespace-pre-wrap text-sm border rounded p-2 bg-gray-50">
              {ocrMessage}
            </p>
          </section>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={handleTestOcr}
            className="px-4 py-2 rounded bg-green-700 text-white mr-2"
          >
            {ocrLoading ? "Running OCR test..." : "Run sample OCR test"}
          </button>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="admin-uploads">
        <h2 id="admin-uploads" className="text-lg font-semibold mb-3">
          Recent uploads
        </h2>
        {uploadsLoading && <p>Loading uploads...</p>}
        {uploadsError && (
          <p role="alert" className="text-red-700">
            {uploadsError}
          </p>
        )}
        {!uploadsLoading && !uploadsError && uploads.length === 0 && (
          <p>No uploads yet.</p>
        )}
        {!uploadsLoading && !uploadsError && uploads.length > 0 && (
          <div className="overflow-auto">
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Filename</th>
                  <th className="border px-2 py-1 text-left">MIME type</th>
                  <th className="border px-2 py-1 text-left">Size</th>
                  <th className="border px-2 py-1 text-left">Status</th>
                  <th className="border px-2 py-1 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id}>
                    <td className="border px-2 py-1">
                      {u.filename || "—"}
                    </td>
                    <td className="border px-2 py-1">
                      {u.mimetype || "—"}
                    </td>
                    <td className="border px-2 py-1">
                      {typeof u.size === "number"
                        ? `${(u.size / 1024).toFixed(1)} KB`
                        : "—"}
                    </td>
                    <td className="border px-2 py-1">{u.status}</td>
                    <td className="border px-2 py-1">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Layout>
  );
}

export default AdminPage;
