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

const fallbackNotes: ReleasedNote[] = [
  {
    id: "sample-1",
    title: "Limits and derivatives overview",
    course: "Calculus I",
    module: "Limits",
    createdAt: "2025-01-10T10:00:00Z",
    excerpt:
      "A function f of x equals x squared. The derivative is 2x. This note walks through the limit definition and common pitfalls.",
  },
];

function StudentPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const preview = router.query.preview === "1";
  const [unauthorized, setUnauthorized] = useState(false);
  const [fontScale, setFontScale] = useState(1.05);
  const [highContrast, setHighContrast] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
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
      if (!preview) void router.replace("/login");
      return;
    }

    if (preview) {
      setUnauthorized(false);
      return;
    }

    const role = getRoleFromUser(session.user);
    if (role !== "student") {
      setUnauthorized(true);
      void router.replace("/dashboard");
    }
  }, [session, status, router, preview]);

  useEffect(() => {
    const supported = isTtsSupported();
    setTtsSupported(supported);

    if (supported && typeof window !== "undefined") {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices() || [];
        setVoices(v);
        if (!selectedVoiceUri && v.length > 0) {
          const preferred = v.find((voice) =>
            voice.lang?.toLowerCase().startsWith("en")
          );
          setSelectedVoiceUri(preferred?.voiceURI || v[0].voiceURI);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      const raw = window.localStorage.getItem("tts-prefs");
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { volume?: number; voiceURI?: string };
          if (typeof parsed.volume === "number") setVolume(parsed.volume);
          if (parsed.voiceURI) setSelectedVoiceUri(parsed.voiceURI);
        } catch {
          // ignore
        }
      }
    }
  }, [selectedVoiceUri]);

  const sampleText =
    "This is a sample Calculus I note. It describes a function f of x equals x squared, and explains how to find the derivative using the limit definition.";

  const runSpeech = (text: string, label: string, speechId: string) => {
    if (!ttsSupported) {
      setSpeechError("Text-to-speech is not available in this browser.");
      return;
    }

    setSpeechError(null);
    const voice = voices.find((v) => v.voiceURI === selectedVoiceUri);
    const utterance = speakText(text, {
      volume,
      voice,
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
          setNotes(fallbackNotes);
          setNotesError(null);
          return;
        }
        const data = (await res.json()) as ReleasedNote[];
        if (!cancelled) {
          setNotes(data.length ? data : fallbackNotes);
          setNotesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setNotes(fallbackNotes);
          setNotesError(null);
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
      <div
        className={`space-y-8 ${highContrast ? "bg-black text-yellow-100" : ""}`}
        style={{ fontSize: `${fontScale}rem` }}
      >
        <section
          aria-labelledby="student-profile"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800 flex items-center gap-4"
        >
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center text-2xl font-bold">
            {(session?.user?.name || "Sample Student").charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 id="student-profile" className="text-xl font-semibold">
              {session?.user?.name || "Sample Student"}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {session?.user?.email || "sample.student@example.com"}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="student-welcome"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800"
        >
          <h2 id="student-welcome" className="text-2xl font-semibold mb-3">
            Welcome, Student
          </h2>
          <p className="text-lg leading-relaxed">
            Upload your handwritten calculus notes and, in future iterations, we will convert them into accessible,
            listenable content.
          </p>
        </section>

        <section
          aria-labelledby="student-upload"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800"
        >
          <h2 id="student-upload" className="text-xl font-semibold mb-3">
            Upload handwritten notes (placeholder)
          </h2>
          <div className="space-y-3">
            <label className="block text-lg">
              <span className="block mb-1">Choose image or PDF</span>
              <input
                type="file"
                accept=".pdf,image/*"
                className="block w-full text-base border rounded p-2 bg-white dark:bg-slate-800"
              />
            </label>

            <label className="block text-lg">
              <span className="block mb-1">
                Optional note (caption, up to 500 characters)
              </span>
              <textarea
                className="block w-full border rounded p-3 text-base bg-white dark:bg-slate-800"
                rows={4}
                maxLength={500}
              />
            </label>

            <button
              type="button"
              className="px-5 py-3 rounded bg-blue-700 text-white text-base"
            >
              Upload (disabled placeholder)
            </button>
          </div>
        </section>

        <section
          aria-labelledby="student-tts"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800"
        >
          <h2 id="student-tts" className="text-xl font-semibold mb-3">
            Text-to-speech sample
          </h2>
          {!ttsSupported && (
            <p className="text-base">
              Text-to-speech is not available in this browser. You can still use your screen reader to read the notes.
            </p>
          )}
          {ttsSupported && (
            <>
              <p className="text-lg mb-3 leading-relaxed">
                Use the controls below to hear a sample Calculus I note read out loud. This simulates how your own notes
                will sound once OCR and TTS are fully wired.
              </p>
              <div className="flex flex-wrap gap-4 mb-4">
                <label className="text-sm">
                  <span className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Voice</span>
                  <select
                    value={selectedVoiceUri ?? ""}
                    onChange={(e) => {
                      setSelectedVoiceUri(e.target.value);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(
                          "tts-prefs",
                          JSON.stringify({ volume, voiceURI: e.target.value })
                        );
                      }
                    }}
                    className="border rounded px-3 py-2 text-base bg-white dark:bg-slate-800 min-w-[200px]"
                  >
                    {voices.length === 0 && <option value="">Loading voices…</option>}
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                    Volume (starts at 50%)
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      setVolume(vol);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(
                          "tts-prefs",
                          JSON.stringify({ volume: vol, voiceURI: selectedVoiceUri ?? undefined })
                        );
                      }
                    }}
                    className="w-48 accent-blue-600"
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={volume}
                  />
                  <span className="ml-2 text-sm">{Math.round(volume * 100)}%</span>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePlaySample}
                  className="px-5 py-3 rounded bg-green-700 text-white text-base disabled:opacity-60"
                  aria-pressed={activeSpeechId === "sample-note"}
                  disabled={isSpeaking && activeSpeechId === "sample-note"}
                >
                  {activeSpeechId === "sample-note" ? "Playing sample..." : "Play sample"}
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-5 py-3 rounded border text-base disabled:opacity-60"
                  disabled={!isSpeaking}
                >
                  Stop
                </button>
              </div>
              <div className="mt-3 text-base" aria-live="polite" role="status">
                {speechStatus && <p className="text-emerald-700">{speechStatus}</p>}
                {speechError && (
                  <p className="text-red-700" role="alert">
                    {speechError}
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        <section
          aria-labelledby="student-braille"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800"
        >
          <h2 id="student-braille" className="text-xl font-semibold mb-3">
            Braille preview (prototype)
          </h2>
          <p className="text-lg leading-relaxed">
            Early Braille rendering of the most recent note to exercise the Braille path. When the liblouis/Nemeth
            pipeline is available server-side, this preview will use it automatically; otherwise it falls back to Grade 1.
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Preview source: {notes.length > 0 ? "Latest released note" : "Sample note"}
          </p>
          <div className="flex flex-wrap gap-4 items-end mb-3">
            <label className="text-base">
              <span className="block text-sm text-gray-700 dark:text-gray-300">Engine</span>
              <select
                value={braillePreferredEngine}
                onChange={(e) => setBraillePreferredEngine(e.target.value as "liblouis" | "fallback")}
                className="border rounded px-3 py-2 text-base bg-white dark:bg-slate-800"
              >
                <option value="liblouis">liblouis (Nemeth)</option>
                <option value="fallback">Grade 1 fallback</option>
              </select>
            </label>
            <label className="text-base">
              <span className="block text-sm text-gray-700 dark:text-gray-300">liblouis table</span>
              <select
                value={brailleTable}
                onChange={(e) => setBrailleTable(e.target.value)}
                className="border rounded px-3 py-2 text-base bg-white dark:bg-slate-800"
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
              className="px-4 py-2 rounded bg-blue-700 text-white text-sm"
            >
              Refresh Braille
            </button>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Available tables: nemeth, en-us-g1, en-us-g2. Switch to Grade 1 fallback if liblouis is not installed on the
            server.
          </p>
          <div className="text-sm text-gray-800 dark:text-gray-200 mb-2" aria-live="polite">
            <p>
              Engine: {brailleEngine === "liblouis" ? `liblouis (${brailleTable || "nemeth"})` : "Grade 1 fallback"}
            </p>
            {brailleLoading && <p>Generating Braille...</p>}
            {brailleStatus && <p>{brailleStatus}</p>}
            {brailleError && (
              <p className="text-red-700" role="alert">
                {brailleError}
              </p>
            )}
            {brailleEngine === "fallback" && braillePreferredEngine === "liblouis" && !brailleLoading && (
              <p className="text-yellow-700">
                liblouis not available; showing fallback Grade 1 output.
              </p>
            )}
          </div>
          <div className="mt-3 border rounded p-4 bg-gray-50 dark:bg-slate-800 font-mono text-base whitespace-pre-wrap" aria-live="polite">
            {braillePreview || "Generating preview..."}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadBraille}
              className="px-4 py-2 rounded bg-gray-800 text-white text-sm"
            >
              Download .brf preview
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Load this into a Braille display simulator to validate spacing and line breaks.
            </span>
          </div>
        </section>

        <section
          aria-labelledby="student-released"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800"
        >
          <h2 id="student-released" className="text-xl font-semibold mb-3">
            Released materials from your instructors
          </h2>
          {notesLoading && <p className="text-base">Loading released materials…</p>}
          {!notesLoading && notes.length === 0 && (
            <p className="text-base">No new notes from your instructors yet.</p>
          )}
          {!notesLoading && notes.length > 0 && (
            <ul className="space-y-3 text-base">
              {notes.map((note) => (
                <li key={note.id} className="border rounded p-4 bg-gray-50 dark:bg-slate-800">
                  <div className="font-semibold text-lg">
                    {note.title}
                    {note.course && <span className="ml-1 text-gray-600">({note.course})</span>}
                  </div>
                  {note.module && <div className="text-sm text-gray-600">Module: {note.module}</div>}
                  {note.createdAt && (
                    <div className="text-sm text-gray-500">Released: {new Date(note.createdAt).toLocaleString()}</div>
                  )}
                  <p className="mt-2 leading-relaxed">{note.excerpt}</p>
                  {ttsSupported && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleSpeakNote(note)}
                        className="px-4 py-2 rounded bg-indigo-700 text-white text-sm disabled:opacity-60"
                        aria-pressed={activeSpeechId === String(note.id)}
                        disabled={isSpeaking && activeSpeechId !== String(note.id)}
                      >
                        {activeSpeechId === String(note.id) ? "Playing excerpt..." : "Listen to excerpt"}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="fixed right-4 bottom-4 z-40">
        <div className="rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2 w-64">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Vision & Reader</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
              onClick={() => setFontScale((s) => Math.min(s + 0.1, 1.8))}
            >
              A+
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-blue-100 text-slate-800 text-sm"
              onClick={() => setFontScale((s) => Math.max(s - 0.1, 0.9))}
            >
              A-
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded border text-sm"
              onClick={() => setFontScale(1.05)}
            >
              Reset
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-amber-500 text-white text-sm"
              onClick={() => setHighContrast((v) => !v)}
            >
              {highContrast ? "Normal" : "High contrast"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
              onClick={handlePlaySample}
              disabled={isSpeaking && activeSpeechId === "sample-note"}
            >
              Read sample
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded border text-sm disabled:opacity-60"
              onClick={handleStop}
              disabled={!isSpeaking}
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default StudentPage;
