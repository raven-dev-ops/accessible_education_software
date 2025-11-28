import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Layout } from "../../components/Layout";
import { getRoleFromUser } from "../../lib/roleUtils";
import { textToBraille } from "../../lib/braille";
import { isTtsSupported, speakText, stopSpeaking } from "../../lib/tts";

type ReleasedNote = {
  id: string | number;
  title: string;
  course?: string;
  module?: string;
  createdAt?: string;
  excerpt: string;
};

const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

function StudentPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [unauthorized, setUnauthorized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [notes, setNotes] = useState<ReleasedNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [braillePreview, setBraillePreview] = useState<string>("");
  const [brailleEngine, setBrailleEngine] = useState<"liblouis" | "fallback">(
    "fallback"
  );
  const [braillePreferredEngine, setBraillePreferredEngine] = useState<
    "liblouis" | "fallback"
  >("liblouis");
  const [brailleTable, setBrailleTable] = useState<string>("nemeth");
  const [brailleSourceVersion, setBrailleSourceVersion] = useState(0);
  const brailleTables = ["nemeth", "en-us-g1", "en-us-g2"] as const;
  const [brailleStatus, setBrailleStatus] = useState<string | null>(null);
  const [brailleError, setBrailleError] = useState<string | null>(null);
  const [brailleLoading, setBrailleLoading] = useState(false);

  useEffect(() => {
    if (!authEnabled) return;
    if (status === "loading") return;
    if (!session || !session.user) {
      void router.replace("/login");
      return;
    }

    const role = getRoleFromUser(session.user);

    if (role !== "student") {
      setUnauthorized(true);
      void router.replace("/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => {
    setTtsSupported(isTtsSupported());
  }, []);

  const sampleText =
    "This is a sample Calculus I note. It describes a function f of x equals x squared, and explains how to find the derivative using the limit definition.";

  const runSpeech = (text: string, label: string, speechId: string) => {
    if (!ttsSupported) {
      setSpeechError("Text-to-speech is not available in this browser.");
      return;
    }

    setSpeechError(null);
    const utterance = speakText(text, {
      onStart: () => {
        setIsSpeaking(true);
        setActiveSpeechId(speechId);
        setSpeechStatus(`Reading ${label}...`);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setActiveSpeechId(null);
        setSpeechStatus(`Finished reading ${label}.`);
      },
      onError: () => {
        setIsSpeaking(false);
        setActiveSpeechId(null);
        setSpeechStatus(null);
        setSpeechError(`Text-to-speech could not play ${label}.`);
      },
    });

    if (!utterance) {
      setSpeechError("Text-to-speech is not available in this browser.");
    }
  };

  const handlePlaySample = () => {
    runSpeech(sampleText, "a sample Calculus note", "sample-note");
  };

  const handleSpeakNote = (note: ReleasedNote) => {
    const text = `${note.title}. ${note.excerpt}`;
    runSpeech(text, `"${note.title}"`, String(note.id));
  };

  const handleStop = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setActiveSpeechId(null);
    setSpeechStatus("Playback stopped.");
  };

  const brailleSourceText =
    notes.length > 0
      ? `${notes[0].title}. ${notes[0].excerpt}`
      : sampleText;

  const handleDownloadBraille = () => {
    if (typeof window === "undefined") return;
    const content = braillePreview.replace(/\n/g, "\r\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_note.brf";
    link.click();
    window.URL.revokeObjectURL(url);
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

  useEffect(() => {
    let cancelled = false;

    async function loadBraille() {
      setBrailleLoading(true);
      setBrailleError(null);
      setBrailleStatus("Generating Braille preview...");

      try {
        const response = await fetch("/api/braille", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: brailleSourceText,
            table: braillePreferredEngine === "liblouis" ? brailleTable : undefined,
            engine: braillePreferredEngine,
          }),
        });

        if (!response.ok) {
          throw new Error(`Braille API failed with status ${response.status}`);
        }

        const data = (await response.json()) as {
          ok: boolean;
          braille?: string;
          source?: "liblouis" | "fallback";
          message?: string;
        };

        if (!data.ok || !data.braille) {
          throw new Error(data.message || "Braille API returned no data");
        }

        if (!cancelled) {
          setBraillePreview(data.braille);
          setBrailleEngine(data.source ?? "fallback");
          setBrailleStatus(
            data.message ||
              (data.source === "liblouis"
                ? "Using liblouis (Nemeth) output."
                : "Using fallback Grade 1 Braille.")
          );
        }
      } catch (error) {
        if (!cancelled) {
          setBraillePreview(textToBraille(brailleSourceText));
          setBrailleEngine("fallback");
          setBrailleStatus("Using fallback Grade 1 Braille.");
          setBrailleError(
            "Advanced Braille service is unavailable; falling back."
          );
        }
      } finally {
        if (!cancelled) {
          setBrailleLoading(false);
        }
      }
    }

    void loadBraille();

    return () => {
      cancelled = true;
    };
  }, [brailleSourceText, braillePreferredEngine, brailleTable, brailleSourceVersion]);

  if (unauthorized) {
    return (
      <Layout title="Student Dashboard">
        <p role="alert">You do not have access to this page. Redirecting...</p>
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
                className="px-4 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-60"
                aria-pressed={activeSpeechId === "sample-note"}
                disabled={isSpeaking && activeSpeechId === "sample-note"}
              >
                {activeSpeechId === "sample-note"
                  ? "Playing sample..."
                  : "Play sample"}
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="px-4 py-2 rounded border text-sm disabled:opacity-60"
                disabled={!isSpeaking}
              >
                Stop
              </button>
            </div>
            <div className="mt-2 text-sm" aria-live="polite" role="status">
              {speechStatus && (
                <p className="text-green-700">{speechStatus}</p>
              )}
              {speechError && (
                <p className="text-red-700" role="alert">
                  {speechError}
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="student-braille" className="mt-8">
        <h2 id="student-braille" className="text-lg font-semibold mb-2">
          Braille preview (prototype)
        </h2>
        <p className="text-sm">
          Early Braille rendering of the most recent note to exercise the Braille
          path. When the liblouis/Nemeth pipeline is available server-side, this
          preview will use it automatically; otherwise it falls back to Grade 1.
        </p>
        <p className="text-xs text-gray-600 mb-2">
          Preview source:{" "}
          {notes.length > 0 ? "Latest released note" : "Sample note"}
        </p>
        <div className="flex flex-wrap gap-3 items-end mb-2">
          <label className="text-sm">
            <span className="block text-xs text-gray-700">Engine</span>
            <select
              value={braillePreferredEngine}
              onChange={(e) =>
                setBraillePreferredEngine(
                  e.target.value as "liblouis" | "fallback"
                )
              }
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="liblouis">liblouis (Nemeth)</option>
                <option value="fallback">Grade 1 fallback</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-xs text-gray-700">
              liblouis table
              </span>
              <select
                value={brailleTable}
                onChange={(e) => setBrailleTable(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              aria-disabled={braillePreferredEngine !== "liblouis"}
              disabled={braillePreferredEngine !== "liblouis"}
            >
              {brailleTables.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setBrailleSourceVersion((v) => v + 1)}
            className="px-3 py-1 rounded bg-blue-600 text-white text-xs"
          >
            Refresh Braille
          </button>
        </div>
        <p className="text-xs text-gray-600 mb-2">
          Available tables: nemeth, en-us-g1, en-us-g2. Switch to Grade 1 fallback
          if liblouis is not installed on the server.
        </p>
        <div className="text-xs text-gray-700 mb-2" aria-live="polite">
          <p>
            Engine:{" "}
            {brailleEngine === "liblouis"
              ? `liblouis (${brailleTable || "nemeth"})`
              : "Grade 1 fallback"}
          </p>
          {brailleLoading && <p>Generating Braille...</p>}
          {brailleStatus && <p>{brailleStatus}</p>}
          {brailleError && (
            <p className="text-red-700" role="alert">
              {brailleError}
            </p>
          )}
          {brailleEngine === "fallback" &&
            braillePreferredEngine === "liblouis" &&
            !brailleLoading && (
              <p className="text-yellow-700">
                liblouis not available; showing fallback Grade 1 output.
              </p>
            )}
        </div>
        <div
          className="mt-2 border rounded p-3 bg-gray-50 font-mono text-sm whitespace-pre-wrap"
          aria-live="polite"
        >
          {braillePreview || "Generating preview..."}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadBraille}
            className="px-3 py-1 rounded bg-gray-800 text-white text-xs"
          >
            Download .brf preview
          </button>
          <span className="text-xs text-gray-600">
            Load this into a Braille display simulator to validate spacing and
            line breaks.
          </span>
        </div>
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
                {ttsSupported && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => handleSpeakNote(note)}
                      className="px-3 py-1 rounded bg-indigo-700 text-white text-xs disabled:opacity-60"
                      aria-pressed={activeSpeechId === String(note.id)}
                      disabled={
                        isSpeaking && activeSpeechId !== String(note.id)
                      }
                    >
                      {activeSpeechId === String(note.id)
                        ? "Playing excerpt..."
                        : "Listen to excerpt"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  );
}

export default StudentPage;
