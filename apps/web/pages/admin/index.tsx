import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser, withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import { Layout } from "../../components/Layout";
import { getRoleFromUser } from "../../lib/roleUtils";

type Student = {
  id: number;
  name: string;
  email: string;
  course: string;
};

function AdminPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [unauthorized, setUnauthorized] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;

    const role = getRoleFromUser(user);

    if (role !== "admin") {
      setUnauthorized(true);
      void router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
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

    return () => {
      cancelled = true;
    };
  }, [unauthorized]);

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
    setUploadStatus("Uploading and processing…");
    setUploadError(null);

    const formElement = event.currentTarget;
    const fileInput = formElement.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setUploadStatus(null);
      setUploadError("Please choose a file to upload.");
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
      };

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
    }
  };

  if (unauthorized) {
    return (
      <Layout title="Admin Dashboard">
        <p role="alert">You do not have access to this page. Redirecting…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Dashboard">
      <section aria-labelledby="admin-students">
        <h2 id="admin-students" className="text-lg font-semibold mb-4">
          Students
        </h2>
        {studentsLoading && <p>Loading students…</p>}
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
          Upload PDF for OCR (placeholder)
        </h2>
        <p className="mb-2">
          This form is a Day 2 scaffold. Submitting will not yet trigger OCR.
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
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Upload
          </button>
        </form>

        <div className="mt-3" aria-live="polite">
          {uploadStatus && (
            <p className="text-sm text-green-700">{uploadStatus}</p>
          )}
          {uploadError && (
            <p className="text-sm text-red-700" role="alert">
              {uploadError}
            </p>
          )}
        </div>

        {ocrMessage && (
          <section className="mt-4" aria-labelledby="admin-ocr-preview">
            <h3 id="admin-ocr-preview" className="font-semibold mb-1">
              OCR text preview
            </h3>
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
            {ocrLoading ? "Running OCR test…" : "Run sample OCR test"}
          </button>
        </div>
      </section>
    </Layout>
  );
}

export default AdminPage;
