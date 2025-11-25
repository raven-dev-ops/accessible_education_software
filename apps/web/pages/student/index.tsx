import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser, withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import { Layout } from "../../components/Layout";
import { getRoleFromUser } from "../../lib/roleUtils";
import { isTtsSupported, speakText, stopSpeaking } from "../../lib/tts";

type ReleasedNote = {
  id: string | number;
  title: string;
  course?: string;
  module?: string;
  createdAt?: string;
  excerpt: string;
};

function StudentPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [unauthorized, setUnauthorized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [notes, setNotes] = useState<ReleasedNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;

    const role = getRoleFromUser(user);

    if (role !== "student") {
      setUnauthorized(true);
      void router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    setTtsSupported(isTtsSupported());
  }, []);

  const sampleText =
    "This is a sample Calculus I note. It describes a function f of x equals x squared, and explains how to find the derivative using the limit definition.";

  const handlePlaySample = () => {
    if (!ttsSupported) return;
    speakText(sampleText);
    setIsSpeaking(true);
  };

  const handleStop = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      try {
        const res = await fetch("/api/notes");
        if (!res.ok) {
          throw new Error(`Failed with status ${res.status}`);
        }
        const data = (await res.json()) as ReleasedNote[];
        if (!cancelled) {
          setNotes(data);
          setNotesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setNotesError("Failed to load released materials.");
        }
      } finally {
        if (!cancelled) {
          setNotesLoading(false);
        }
      }
    }

    if (!unauthorized) {
      void loadNotes();
    }

    return () => {
      cancelled = true;
    };
  }, [unauthorized]);

  if (unauthorized) {
    return (
      <Layout title="Student Dashboard">
        <p role="alert">You do not have access to this page. Redirecting…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Student Dashboard">
      <section aria-labelledby="student-welcome" className="mb-8">
        <h2 id="student-welcome" className="text-lg font-semibold mb-2">
          Welcome, Student
        </h2>
        <p>
          Upload your handwritten calculus notes and, in future iterations, we
          will convert them into accessible, listenable content.
        </p>
      </section>

      <section aria-labelledby="student-upload" className="mb-8">
        <h2 id="student-upload" className="text-lg font-semibold mb-2">
          Upload handwritten notes (placeholder)
        </h2>
        <form>
          <label className="block mb-2">
            <span className="block mb-1">Choose image or PDF</span>
            <input type="file" accept=".pdf,image/*" className="block w-full" />
          </label>

          <label className="block mb-2">
            <span className="block mb-1">
              Optional note (caption, up to 500 characters)
            </span>
            <textarea
              className="block w-full border rounded p-2"
              rows={3}
              maxLength={500}
            />
          </label>

          <button
            type="button"
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Upload (disabled placeholder)
          </button>
        </form>
      </section>

      <section aria-labelledby="student-tts">
        <h2 id="student-tts" className="text-lg font-semibold mb-2">
          Text-to-speech sample
        </h2>
        {!ttsSupported && (
          <p className="text-sm">
            Text-to-speech is not available in this browser. You can still use
            your screen reader to read the notes.
          </p>
        )}
        {ttsSupported && (
          <>
            <p className="text-sm mb-2">
              Use the controls below to hear a sample Calculus I note read out
              loud. This simulates how your own notes will sound once OCR and
              TTS are fully wired.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePlaySample}
                className="px-4 py-2 rounded bg-green-600 text-white text-sm"
                aria-pressed={isSpeaking}
              >
                Play sample
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="px-4 py-2 rounded border text-sm"
              >
                Stop
              </button>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="student-released" className="mt-8">
        <h2 id="student-released" className="text-lg font-semibold mb-2">
          Released materials from your instructors
        </h2>
        {notesLoading && <p>Loading released materials…</p>}
        {notesError && (
          <p role="alert" className="text-red-700 text-sm">
            {notesError}
          </p>
        )}
        {!notesLoading && !notesError && notes.length === 0 && (
          <p>No new notes from your instructors yet.</p>
        )}
        {!notesLoading && !notesError && notes.length > 0 && (
          <ul className="space-y-2 text-sm">
            {notes.map((note) => (
              <li key={note.id} className="border rounded p-3 bg-gray-50">
                <div className="font-medium">
                  {note.title}
                  {note.course && (
                    <span className="ml-1 text-gray-600">
                      ({note.course})
                    </span>
                  )}
                </div>
                {note.module && (
                  <div className="text-xs text-gray-600">
                    Module: {note.module}
                  </div>
                )}
                {note.createdAt && (
                  <div className="text-xs text-gray-500">
                    Released: {new Date(note.createdAt).toLocaleString()}
                  </div>
                )}
                <p className="mt-1">{note.excerpt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  );
}

export default withPageAuthRequired(StudentPage);

