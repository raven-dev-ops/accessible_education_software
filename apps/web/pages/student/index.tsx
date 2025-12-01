import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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

type UploadHistoryEntry = {
  score: number;
  createdAt: string;
};

type PreviousUpload = {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
  history?: UploadHistoryEntry[];
};

type ModuleSummary = {
  id: string | number;
  title: string;
  course?: string;
};

const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";
const allowSampleEnv =
  process.env.NEXT_PUBLIC_ALLOW_SAMPLE_FALLBACKS === "true" &&
  process.env.NODE_ENV !== "production";

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

const moduleSamples: Record<
  string,
  { paragraphs: string[]; tldr: string }
> = {
  "Calculus I": {
    paragraphs: [
      "This is a sample Calculus I note. It describes a function f of x equals x squared, and explains how to find the derivative using the limit definition.",
      "To compute the derivative, we consider the limit as h approaches zero of the difference quotient f of x plus h minus f of x over h. For x squared, this simplifies to two x when h goes to zero.",
      "In practice, derivatives let us measure instantaneous rates of change. They are foundational for optimization problems, motion analysis, and curve sketching. This course will build intuition through examples and exercises.",
    ],
    tldr:
      "Summary: For f(x)=x^2, the derivative is 2x via the limit definition. Derivatives measure instantaneous change and power many applications.",
  },
  "Calculus II": {
    paragraphs: [
      "This Calculus II sample focuses on integrals and series. We revisit power rules and introduce integration by parts for functions like x e^x.",
      "A classic example is the integral of x squared, which evaluates to x cubed over three plus C. Series convergence tests, like the ratio test, help decide if infinite sums converge.",
      "We also touch on Taylor series, representing functions like e to the x as an infinite sum, which is useful for approximations and analysis.",
    ],
    tldr:
      "Summary: Integrals accumulate area; series convergence and Taylor expansions extend Calculus II into infinite processes and approximations.",
  },
  "Linear Algebra": {
    paragraphs: [
      "This Linear Algebra sample covers vectors and matrices. Solving Ax equals b involves row reduction and understanding rank.",
      "Eigenvalues come from the determinant of A minus lambda times I equals zero, and eigenvectors satisfy the associated homogeneous system.",
      "Dot products, cross products, and orthonormal bases enable geometric interpretations and decompositions of vectors in space.",
    ],
    tldr:
      "Summary: Linear Algebra studies vector spaces, solving systems, eigenvalues, and geometric operations like projections and orthonormal bases.",
  },
  Physics: {
    paragraphs: [
      "This Physics sample covers kinematics. Position s equals initial velocity times time plus one half a t squared under constant acceleration.",
      "Forces follow F equals m a. Momentum p equals m v, and work equals force dot displacement.",
      "Energy methods track kinetic and potential energy to solve motion and force problems efficiently.",
    ],
    tldr:
      "Summary: Kinematics and dynamics use F=ma, energy, and momentum to describe motion; equations of motion give position and velocity over time.",
  },
  Statistics: {
    paragraphs: [
      "This Statistics sample covers probability basics. Conditional probability uses P of A given B equals P of A and B over P of B.",
      "Distributions like Normal and Binomial describe outcomes; mean mu and variance sigma squared summarize them.",
      "The Central Limit Theorem says sample means approach Normal as sample size grows, enabling confidence intervals and hypothesis tests.",
    ],
    tldr:
      "Summary: Probability rules, distributions, and the CLT underpin inference, confidence intervals, and tests in Statistics.",
  },
};

function StudentPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const preview = router.query.preview === "1";
  const showPreviewNav = router.query.showPreviewNav === "1";
  const samplesParam = router.query.samples;
  const samplesFromAdminOff = samplesParam === "0";
  const allowSamples = samplesFromAdminOff ? false : preview || allowSampleEnv;
  const [unauthorized, setUnauthorized] = useState(false);
  const [fontScale, setFontScale] = useState(1.05);
  const [highContrast, setHighContrast] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [rate, setRate] = useState(1);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
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
  const [widgetOpen, setWidgetOpen] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("Calculus I");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketList, setTicketList] = useState<
    { id: string; title: string; detail: string; createdAt: string }[]
  >([]);
  const [liveAlert, setLiveAlert] = useState<
    { message: string; tone: "info" | "success" | "error" } | null
  >(null);
  const defaultRootFontSize = useRef<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadScore, setUploadScore] = useState<number | null>(null);
  const [correctionText, setCorrectionText] = useState<string>("");
  const [uploadImageUrl, setUploadImageUrl] = useState<string | null>(null);
  const [previousUploads, setPreviousUploads] = useState<PreviousUpload[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [isCorrectionEditing, setIsCorrectionEditing] = useState(false);
  const [correctionSaving, setCorrectionSaving] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [showOcrSection, setShowOcrSection] = useState(false);
  const [scoreLogOpen, setScoreLogOpen] = useState(false);
  const [brailleOpen, setBrailleOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [ttsOpen, setTtsOpen] = useState(false);
  const [aiTtsOpen, setAiTtsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [modulesError, setModulesError] = useState<string | null>(null);

  const announce = (message: string, tone: "info" | "success" | "error" = "info") =>
    setLiveAlert({ message, tone });

  useEffect(() => {
    if (!authEnabled) return;
    if (status === "loading") return;
    if (!session || !session.user) {
      if (!preview) void router.replace("/login");
      return;
    }

    const fromAdmin = router.query.fromAdmin === "1";
    if (preview || fromAdmin) {
      setUnauthorized(false);
      return;
    }

    const role = getRoleFromUser(session.user);
    if (role !== "student") {
      setUnauthorized(true);
      void router.replace("/dashboard");
    }
  }, [session, status, router, preview, allowSamples]);

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
          const parsed = JSON.parse(raw) as { volume?: number; voiceURI?: string; rate?: number };
          if (typeof parsed.volume === "number") setVolume(parsed.volume);
          if (parsed.voiceURI) setSelectedVoiceUri(parsed.voiceURI);
          if (typeof parsed.rate === "number") setRate(parsed.rate);
        } catch {
          // ignore
        }
      }
    }
  }, [selectedVoiceUri, preview, session]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const prefsKey =
        preview || !session?.user?.email ? "vision-prefs-sample" : `vision-prefs-${session.user.email}`;
      const raw = window.localStorage.getItem(prefsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          fontScale?: number;
          highContrast?: boolean;
          widgetOpen?: boolean;
        };
        if (typeof parsed.fontScale === "number") setFontScale(parsed.fontScale);
        if (typeof parsed.highContrast === "boolean") setHighContrast(parsed.highContrast);
        if (typeof parsed.widgetOpen === "boolean") setWidgetOpen(parsed.widgetOpen);
      }
    } catch {
      // ignore
    }
  }, [preview, session?.user?.email]);

  useEffect(() => {
    let cancelled = false;

    async function loadModules() {
      // Student view should use the same modules list as teacher/admin when available,
      // with a fallback to sample modules when samples are allowed.
      try {
        const res = await fetch("/api/modules");
        if (!res.ok) {
          if (allowSamples) {
            const sampleKeys = Object.keys(moduleSamples);
            setModules(
              sampleKeys.map((key) => ({
                id: key,
                title: key,
              }))
            );
            setModulesError(null);
          } else {
            setModules([]);
            setModulesError("Modules unavailable.");
          }
          setModulesLoading(false);
          return;
        }
        const data = (await res.json()) as ModuleSummary[];
        if (!cancelled) {
          if (Array.isArray(data) && data.length) {
            setModules(data);
            setModulesError(null);
          } else if (allowSamples) {
            const sampleKeys = Object.keys(moduleSamples);
            setModules(
              sampleKeys.map((key) => ({
                id: key,
                title: key,
              }))
            );
            setModulesError(null);
          } else {
            setModules([]);
            setModulesError("No modules yet.");
          }
        }
      } catch {
        if (!cancelled) {
          if (allowSamples) {
            const sampleKeys = Object.keys(moduleSamples);
            setModules(
              sampleKeys.map((key) => ({
                id: key,
                title: key,
              }))
            );
            setModulesError(null);
          } else {
            setModulesError("Failed to load modules.");
          }
        }
      } finally {
        if (!cancelled) {
          setModulesLoading(false);
        }
      }
    }

    void loadModules();

    return () => {
      cancelled = true;
    };
  }, [allowSamples]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key =
        preview || !session?.user?.email ? "student-uploads-sample" : `student-uploads-${session.user.email}`;
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as PreviousUpload[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalised = parsed.map((u) => ({
            ...u,
            history: Array.isArray(u.history) ? u.history : [],
          }));
          setPreviousUploads(normalised);
          return;
        }
      }

      if (preview) {
        const now = new Date().toISOString();
        const sampleUploads: PreviousUpload[] = [
          {
            id: "sample-calculus-1",
            name: "calculus_1.jpg",
            dataUrl: "/calculus_1.jpg",
            createdAt: now,
            history: [{ score: 88, createdAt: now }],
          },
          {
            id: "sample-calculus-2",
            name: "calculus_2.png",
            dataUrl: "/calculus_2.png",
            createdAt: now,
            history: [{ score: 72, createdAt: now }],
          },
          {
            id: "sample-linear-algebra",
            name: "linear_algebra.png",
            dataUrl: "/linear_algebra.png",
            createdAt: now,
            history: [{ score: 91, createdAt: now }],
          },
          {
            id: "sample-physics",
            name: "physics.png",
            dataUrl: "/physics.png",
            createdAt: now,
            history: [{ score: 84, createdAt: now }],
          },
          {
            id: "sample-statistics",
            name: "statistics.png",
            dataUrl: "/statistics.png",
            createdAt: now,
            history: [{ score: 89, createdAt: now }],
          },
        ];
        setPreviousUploads(sampleUploads);
        window.localStorage.setItem(key, JSON.stringify(sampleUploads));

        const first = sampleUploads[0];
        setActiveUploadId(first.id);
        setUploadImageUrl(first.dataUrl);
        setUploadFileName(first.name);
      }
    } catch {
      // ignore
    }
  }, [preview, session?.user?.email]);

  const activeModuleSample =
    moduleSamples[selectedModuleId] ?? moduleSamples["Calculus I"];
  const sampleParagraphs = activeModuleSample.paragraphs;
  const sampleTLDR = activeModuleSample.tldr;
  const [sampleParagraphIndex, setSampleParagraphIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const runSpeech = (text: string, label: string, speechId: string) => {
    if (!ttsSupported) {
      setSpeechError("Text-to-speech is not available in this browser.");
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSpeechError("Text-to-speech is not available in this environment.");
      return;
    }

    setSpeechError(null);
    const words = text.split(" ");

    const options: {
      rate: number;
      volume: number;
      voice?: SpeechSynthesisVoice;
      onStart: () => void;
      onEnd: () => void;
      onError: () => void;
    } = {
      rate,
      volume,
      onStart: () => {
        setIsSpeaking(true);
        setActiveSpeechId(speechId);
        setSpeechStatus(`Reading ${label}...`);
        setCountdown(Math.max(3, Math.ceil(text.length / 15)));
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev === null) return null;
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        // crude word-level highlight cadence
        let i = 0;
        const wordTimer = setInterval(() => {
          if (!isSpeaking || i >= words.length) {
            clearInterval(wordTimer);
            setHighlightIndex(null);
            return;
          }
          setHighlightIndex(i);
          i += 1;
        }, 400);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setActiveSpeechId(null);
        setSpeechStatus(`Finished reading ${label}.`);
        setCountdown(null);
        setHighlightIndex(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setActiveSpeechId(null);
        setSpeechStatus(null);
        setSpeechError(`Text-to-speech could not play ${label}.`);
        setCountdown(null);
        setHighlightIndex(null);
      },
    };

    // In non-preview mode, respect the selected voice; in preview mode,
    // let the browser choose the default voice to reduce engine errors.
    if (!preview) {
      const voice = voices.find((v) => v.voiceURI === selectedVoiceUri);
      if (voice) {
        options.voice = voice;
      }
    }

    const utterance = speakText(text, options);

    if (!utterance) {
      setSpeechError("Text-to-speech is not available in this browser.");
    }
  };

  const handlePlaySample = () => {
    const text = sampleParagraphs[sampleParagraphIndex] ?? sampleParagraphs[0];
    const labelModule = selectedModuleId || "sample";
    runSpeech(text, `a sample ${labelModule} note`, "sample-note");
  };

  const handleSpeakNote = (note: ReleasedNote) => {
    const text = `${note.title}. ${note.excerpt}`;
    runSpeech(text, `"${note.title}"`, String(note.id));
  };

  useEffect(() => {
    setSampleParagraphIndex(0);
    setHighlightIndex(null);
    if (activeSpeechId === "sample-note") {
      stopSpeaking();
      setIsSpeaking(false);
      setActiveSpeechId(null);
      setSpeechStatus(null);
      setCountdown(null);
    }
  }, [selectedModuleId, activeSpeechId]);

  const handleStop = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setActiveSpeechId(null);
    setSpeechStatus("Playback stopped.");
    setCountdown(null);
  };

  const persistUploads = (next: PreviousUpload[]) => {
    if (typeof window === "undefined") return;
    try {
      const key =
        preview || !session?.user?.email ? "student-uploads-sample" : `student-uploads-${session.user.email}`;
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleSelectPreviousUpload = (upload: PreviousUpload) => {
    setActiveUploadId(upload.id);
    setUploadImageUrl(upload.dataUrl);
    setUploadFileName(upload.name);
    setUploadStatus(null);
    setUploadError(null);
    setUploadPreview(null);
    setUploadScore(null);
    setCorrectionText("");
    setIsCorrectionEditing(false);
    setCorrectionSaving(false);
    setCorrectionError(null);
    setShowOcrSection(false);
  };

  const handleDeletePreviousUpload = (id: string) => {
    setPreviousUploads((prev) => {
      const next = prev.filter((u) => u.id !== id);
      persistUploads(next);
      return next;
    });
    if (activeUploadId === id) {
      setActiveUploadId(null);
      setUploadImageUrl(null);
      setUploadFileName(null);
      setUploadPreview(null);
      setUploadScore(null);
      setCorrectionText("");
      setUploadStatus(null);
      setUploadError(null);
    }
  };

  const handleRunOcr = () => {
    if (!uploadFileName && !uploadImageUrl && !activeUploadId) {
      const message = "Please choose an image or select a previous upload first.";
      setUploadError(message);
      setUploadStatus(null);
      announce(message, "error");
      return;
    }
    setUploadStatus("Processing handwritten note...");
    setUploadError(null);
    setUploadPreview(null);
    setUploadScore(null);
    setCorrectionText("");
    setIsCorrectionEditing(false);
    setCorrectionSaving(false);
    setCorrectionError(null);

    setTimeout(() => {
      const previewText =
        "f(x) = x^2 + 3x - 5\n\nDerivative: f(x) = 2x + 3\nIntegral: ∫ f(x) dx = x^3/3 + (3/2)x^2 - 5x + C";
      const score = 72;
      setUploadPreview(previewText);
      setUploadScore(score);
      setCorrectionText(previewText);
      setUploadStatus("OCR complete. Review the text and accuracy below.");
      setShowOcrSection(true);
      announce("Uploaded note processed. Accuracy grade available.", score < 80 ? "info" : "success");

      if (activeUploadId) {
        const now = new Date().toISOString();
        setPreviousUploads((prev) => {
          const next = prev.map((u) => {
            if (u.id !== activeUploadId) return u;
            const history = Array.isArray(u.history) ? u.history : [];
            const entry: UploadHistoryEntry = { score, createdAt: now };
            return { ...u, history: [entry, ...history].slice(0, 10) };
          });
          persistUploads(next);
          return next;
        });
      }
    }, 800);
  };

  const handleFormatForTts = () => {
    if (!uploadPreview) {
      const message = "Run OCR first to generate text to Format TTS.";
      setUploadError(message);
      announce(message, "error");
      return;
    }
    setUploadStatus(
      "Note formatted for TTS. Use the Nav reader controls in the Text-to-speech sample to listen to similar content."
    );
    setUploadError(null);
    announce("Note formatted for text-to-speech preview.", "success");
  };

  // Reference handleRunOcr so that linting does not treat it as unused while this preview is evolving.
  void handleRunOcr;

  const handleToggleCorrectionEdit = async () => {
    if (!uploadPreview) return;

    if (!isCorrectionEditing) {
      setIsCorrectionEditing(true);
      setCorrectionError(null);
      setShowOcrSection(true);
      return;
    }

    setCorrectionSaving(true);
    setCorrectionError(null);
    try {
      const now = new Date().toISOString();
      const formData = new FormData();
      formData.append(
        "detail",
        `OCR correction saved at ${now}.\n\nCorrected text:\n${correctionText}`
      );
      if (typeof uploadScore === "number") {
        formData.append("score", String(uploadScore));
      }
      if (session?.user?.email) {
        formData.append("userEmail", session.user.email);
      }
      if (uploadPreview) {
        formData.append("scannedText", uploadPreview);
      }
      formData.append("correctedText", correctionText);
      if (uploadFileName) {
        formData.append("fileName", uploadFileName);
      }
      if (selectedModuleId) {
        formData.append("module", selectedModuleId);
      }

      await fetch("/api/support-tickets", {
        method: "POST",
        body: formData,
      });

      announce("OCR correction saved for review.", "success");
      setIsCorrectionEditing(false);
      setShowOcrSection(false);
    } catch {
      setCorrectionError("Could not save OCR correction right now. Please try again later.");
      announce("Could not save OCR correction.", "error");
    } finally {
      setCorrectionSaving(false);
    }
  };

  const filteredNotes =
    selectedModuleId && notes.length > 0
      ? notes.filter(
          (n) =>
            n.module === selectedModuleId ||
            n.course === selectedModuleId ||
            n.id === selectedModuleId
        )
      : notes;

  const brailleSourceText =
    filteredNotes.length > 0
      ? `${filteredNotes[0].title}. ${filteredNotes[0].excerpt}`
      : sampleParagraphs[0];

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

  const handleSubmitTicket: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!ticketDescription.trim()) return;
    const now = new Date().toISOString();
    const payload = {
      detail: ticketDescription.trim(),
      score: 75, // placeholder score; real value would come from OCR result
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
          title: "OCR quality issue (<80%)",
          detail: payload.detail,
          createdAt: data.createdAt ?? now,
        };
        setTicketList((prev) => [newTicket, ...prev].slice(0, 5));
        setTicketDescription("");
        announce("Support ticket submitted. We will review the OCR issue.", "success");
      })
      .catch(() => {
        // Fallback local insert on failure
        const newTicket = {
          id: `ticket-${ticketList.length + 1}`,
          title: "OCR quality issue (<80%)",
          detail: payload.detail,
          createdAt: now,
        };
        setTicketList((prev) => [newTicket, ...prev].slice(0, 5));
        setTicketDescription("");
        announce("Could not submit the ticket online; saved locally.", "error");
      });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      try {
        const res = await fetch("/api/notes");
        if (!res.ok) {
          if (allowSamples) {
            setNotes(fallbackNotes);
            setNotesError("Showing sample notes; database unavailable.");
            announce("Showing sample notes because the database could not be reached.", "info");
          } else {
            setNotes([]);
            setNotesError("Notes unavailable (samples disabled).");
            announce("Notes unavailable; samples disabled.", "error");
          }
          return;
        }
        const data = (await res.json()) as ReleasedNote[];
        if (!cancelled) {
          const usedFallback = data.length === 0;
          if (usedFallback && !allowSamples) {
            setNotes([]);
            setNotesError("No notes yet (samples disabled).");
            announce("No notes yet; samples disabled.", "info");
          } else {
            setNotes(usedFallback ? fallbackNotes : data);
            setNotesError(null);
            announce(
              usedFallback
                ? "No database notes yet; showing sample notes."
                : "Loaded notes from the database.",
              "info"
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          if (allowSamples) {
            setNotes(fallbackNotes);
            setNotesError("Could not load notes; showing sample notes.");
            announce("Could not load notes; showing sample notes instead.", "error");
          } else {
            setNotes([]);
            setNotesError("Could not load notes (samples disabled).");
            announce("Could not load notes; samples disabled.", "error");
          }
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
  }, [unauthorized, allowSamples]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const docEl = document.documentElement;
    if (!defaultRootFontSize.current) {
      defaultRootFontSize.current = docEl.style.fontSize || getComputedStyle(docEl).fontSize;
    }
    docEl.style.fontSize = `${fontScale * 100}%`;
    return () => {
      if (defaultRootFontSize.current) {
        docEl.style.fontSize = defaultRootFontSize.current;
      }
    };
  }, [fontScale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = preview || !session?.user?.email ? "vision-prefs-sample" : `vision-prefs-${session.user.email}`;
      window.localStorage.setItem(key, JSON.stringify({ fontScale, highContrast, widgetOpen }));
    } catch {
      // ignore
    }
  }, [fontScale, highContrast, widgetOpen, preview, session?.user?.email]);

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
          announce(
            data.source === "liblouis"
              ? "Braille generated with liblouis."
              : "Braille generated with fallback Grade 1.",
            "info"
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

  const previewNav = showPreviewNav ? (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200" htmlFor="preview-nav-student">
      <span className="sr-only">Preview role</span>
      <select
        id="preview-nav-student"
        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
        value="student"
        onChange={(e) => {
          const value = e.target.value;
          if (value === "teacher") {
            void router.push("/teacher?preview=1&showPreviewNav=1");
          } else if (value === "admin") {
            void router.push("/admin?preview=1&showPreviewNav=1");
          } else {
            void router.push("/student?preview=1&showPreviewNav=1");
          }
        }}
      >
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </select>
    </label>
  ) : undefined;

  const fromAdmin = router.query.fromAdmin === "1";

  const secondaryNav = (
    <>
      {previewNav}
      {fromAdmin && (
        <Link
          href="/admin"
          className="px-3 py-2 rounded-lg bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Close view (back to Admin)
        </Link>
      )}
    </>
  );

  const displayName = session?.user?.name?.trim() || "Sample Student";
  const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : "S";

  if (unauthorized) {
    return (
      <Layout title="Student Dashboard" secondaryNav={secondaryNav}>
        <p role="alert">You do not have access to this page. Redirecting...</p>
      </Layout>
    );
  }

  return (
    <Layout title="Student Dashboard" secondaryNav={secondaryNav}>
      <div
        className={`space-y-8 ${highContrast ? "bg-black text-yellow-100" : ""}`}
        style={{ fontSize: `${fontScale}rem`, lineHeight: 1.6 }}
      >
        <section
          aria-labelledby="student-hero"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800"
        >
          <div className="grid gap-4 md:grid-cols-3 items-center">
            <div className="flex items-center gap-4 md:col-span-2">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center text-2xl font-bold">
                {displayInitial}
              </div>
              <div>
                <h2 id="student-hero" className="text-2xl font-semibold">
                  {displayName}
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {session?.user?.email || "sample.student@example.com"}
                </p>
                <p className="text-lg leading-relaxed mt-2">
                  Welcome, Student. Upload your handwritten calculus notes and, in future iterations, we will convert them into accessible, listenable content.
                </p>
              </div>
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-800 dark:text-slate-100 mb-1">
                Select module
              </label>
              {modulesError && (
                <p className="text-xs text-red-600 dark:text-red-300 mb-1" role="alert">
                  {modulesError}
                </p>
              )}
              <select
                className="w-full border rounded px-3 py-2 text-lg bg-white dark:bg-slate-800"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                disabled={modulesLoading || (!modules.length && !allowSamples)}
              >
                {modules.length > 0 ? (
                  modules.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.title}
                    </option>
                  ))
                ) : (
                  <option value="Calculus I">Calculus I</option>
                )}
              </select>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="student-upload"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800"
        >
          <div className="space-y-4" id="student-upload-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Math-To-Text Demo</h2>
              <button
                type="button"
                onClick={() => setUploadOpen((open) => !open)}
                className="text-sm px-3 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                aria-expanded={uploadOpen}
                aria-controls="student-upload-panel"
              >
                {uploadOpen ? "▼" : "▲"}
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-200">
              Upload a handwritten note to see OCR accuracy, history, and formatting preview before TTS.
            </p>
            {uploadOpen && (
              <>
                <div className="">
                  <label className="sr-only">
                    Choose image or PDF
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      ref={fileInputRef}
                      className="mt-2 block w-full text-sm border rounded p-3 bg-white dark:bg-slate-800"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setUploadFileName(file ? file.name : null);
                        setUploadStatus(null);
                        setUploadError(null);
                        setUploadPreview(null);
                        setUploadScore(null);
                        setCorrectionText('');
                        setIsCorrectionEditing(false);
                        setCorrectionSaving(false);
                        setCorrectionError(null);
                        setShowOcrSection(false);
                        setUploadImageUrl(null);
                        if (file && file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            const dataUrl = reader.result as string;
                            const entry: PreviousUpload = {
                              id: `upload-${Date.now()}`,
                              name: file.name,
                              dataUrl,
                              createdAt: new Date().toISOString(),
                              history: [],
                            };
                            setUploadImageUrl(dataUrl);
                            setActiveUploadId(entry.id);
                            setPreviousUploads((prev) => {
                              const next = [entry, ...prev].slice(0, 6);
                              persistUploads(next);
                              return next;
                            });

                            setUploadStatus('Processing handwritten note...');
                            setUploadError(null);
                            setUploadPreview(null);
                            setUploadScore(null);
                            setCorrectionText('');
                            setIsCorrectionEditing(false);
                            setCorrectionSaving(false);
                            setCorrectionError(null);
                            setTimeout(() => {
                              const previewText =
                                "f(x) = x^2 + 3x - 5\n\nDerivative: f(x) = 2x + 3\nIntegral: ∫ f(x) dx = x^3/3 + (3/2)x^2 - 5x + C";
                              const score = 72;
                              setUploadPreview(previewText);
                              setUploadScore(score);
                              setCorrectionText(previewText);
                              setUploadStatus('Formatted for TTS. You can listen to the preview below.');
                              setShowOcrSection(true);
                              announce('Uploaded sample note processed. Ready to play.', 'success');
                              const now = new Date().toISOString();
                              setPreviousUploads((prev) => {
                                const next = prev.map((u) => {
                                  if (u.id !== entry.id) return u;
                                  const history = Array.isArray(u.history) ? u.history : [];
                                  const historyEntry: UploadHistoryEntry = { score, createdAt: now };
                                  return { ...u, history: [historyEntry, ...history].slice(0, 10) };
                                });
                                persistUploads(next);
                                return next;
                              });
                            }, 800);
                          };
                          reader.readAsDataURL(file);
                        } else {
                          setActiveUploadId(null);
                        }
                      }}
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 ">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Selected image</p>
                        {uploadFileName && (
                          <span className="text-xs text-slate-600 dark:text-slate-200">{uploadFileName}</span>
                        )}
                      </div>
                      {uploadImageUrl ? (
                        <div className="relative w-full h-48 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded">
                          <Image src={uploadImageUrl} alt="Uploaded preview" fill className="object-contain rounded" />
                        </div>
                      ) : (
                        <div className="h-48 flex items-center justify-center text-xs text-slate-500 dark:text-slate-200 rounded border border-dashed border-slate-300 dark:border-slate-700">
                          No image selected
                        </div>
                      )}
                  </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 ">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Previous uploads
                      </p>
                      {previousUploads.length === 0 ? (
                        <div className="h-36 flex items-center justify-center text-xs text-slate-500 dark:text-slate-200 border border-dashed border-slate-300 dark:border-slate-700 rounded">
                          No previous uploads yet
                        </div>
                      ) : (
                        <ul className="space-y-2 max-h-40 overflow-auto text-xs text-slate-700 dark:text-slate-200">
                          {previousUploads.map((u) => {
                            const isActive = u.id === activeUploadId;
                            return (
                              <li
                                key={u.id}
                                className={`flex items-center gap-2 rounded px-2 py-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                  isActive
                                    ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-900'
                                    : ''
                                }`}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleSelectPreviousUpload(u)}
                                onKeyDown={(evt) => {
                                  if (evt.key === 'Enter' || evt.key === ' ') {
                                    evt.preventDefault();
                                    handleSelectPreviousUpload(u);
                                  }
                                }}
                              >
                                <div className="relative h-10 w-10 flex-shrink-0 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                                  <Image src={u.dataUrl} alt={u.name} fill className="object-cover" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">{u.name}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {new Date(u.createdAt).toLocaleDateString()}
                                  </div>
                                  {u.history && u.history.length > 0 && (
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                      Last score: {u.history[0].score}% on{' '}
                                      {new Date(u.history[0].createdAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="ml-1 text-[11px] px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 disabled:opacity-60"
                                  onClick={(evt) => {
                                    evt.stopPropagation();
                                    if (preview) {
                                      announce("Demo only: deletions are disabled in preview.", "info");
                                      return;
                                    }
                                    handleDeletePreviousUpload(u.id);
                                  }}
                                  aria-label={`Delete upload ${u.name}`}
                                  disabled={preview}
                                >
                                  {preview ? "Delete (demo)" : "Delete"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 mt-3">
                    <button
                      type="button"
                      className="w-full px-5 py-3 rounded bg-blue-700 text-white text-lg disabled:opacity-60 hover:bg-blue-600 dark:hover:bg-blue-500"
                      onClick={() => {
                        if (preview) {
                          announce("Demo only: file uploads are disabled in preview.", "info");
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      disabled={preview}
                    >
                      {preview ? "Upload image (demo)" : "Upload image"}
                    </button>
                    <button
                      type="button"
                      className="w-full px-5 py-3 rounded bg-emerald-600 text-white text-lg disabled:opacity-60 hover:bg-emerald-500 dark:hover:bg-emerald-500"
                      onClick={handleRunOcr}
                      disabled={!uploadImageUrl && !activeUploadId}
                    >
                      Format TTS
                    </button>
                  </div>

                  {(uploadStatus || uploadError) && (
                    <div
                      className={`text-sm rounded border px-3 py-2 ${
                        uploadError
                          ? 'text-red-800 bg-red-50 border-red-200 dark:bg-red-900/40 dark:text-red-100 dark:border-red-800'
                          : 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-100 dark:border-emerald-800'
                      }`}
                    >
                      {uploadError || uploadStatus}
                    </div>
                  )}
                </div>

                {showOcrSection && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        OCR Text &amp; Results
                      </h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        {uploadImageUrl ? (
                          <div className="relative h-48 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center">
                            <div className="relative h-full w-full">
                              <Image src={uploadImageUrl} alt="Scanned region" fill className="object-contain rounded" />
                              <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded">
                                Scanned region
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-200">
                            Upload an image to view the scanned region.
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {uploadPreview ? (
                          <div className="space-y-3">
                            {isCorrectionEditing ? (
                              <textarea
                                className="w-full border rounded p-2 text-sm bg-white dark:bg-slate-900"
                                rows={4}
                                value={correctionText}
                                onChange={(e) => setCorrectionText(e.target.value)}
                              />
                            ) : (
                              <pre className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100 border rounded p-2 bg-slate-50 dark:bg-slate-800">
                                {correctionText || uploadPreview}
                              </pre>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                OCR text
                              </span>
                              <button
                                type="button"
                                onClick={handleToggleCorrectionEdit}
                                disabled={correctionSaving}
                                className="text-xs font-semibold px-3 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-800 dark:text-slate-100"
                              >
                                {isCorrectionEditing
                                  ? correctionSaving
                                    ? "Saving..."
                                    : "Save"
                                  : "Edit"}
                              </button>
                            </div>
                            {correctionError && (
                              <p className="text-xs text-red-600 dark:text-red-400">{correctionError}</p>
                            )}
                            {uploadScore != null && (
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    Accuracy grade
                                  </span>
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                      uploadScore >= 80
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                                        : uploadScore >= 70
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                                    }`}
                                  >
                                    {uploadScore}% {uploadScore < 80 ? '(will auto-report to teachers)' : ''}
                                  </span>
                                </div>
                                {activeUploadId && (() => {
                                  const selected = previousUploads.find((u) => u.id === activeUploadId);
                                  if (!selected || !selected.history || selected.history.length === 0) return null;
                                  const last = selected.history[0];
                                  const hasMore = selected.history.length > 1;
                                  return (
                                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-200">
                                      <span>
                                        Previous score: {last.score}% on{' '}
                                        {new Date(last.createdAt).toLocaleDateString()}
                                      </span>
                                      {hasMore && (
                                        <button
                                          type="button"
                                          onClick={() => setScoreLogOpen(true)}
                                          className="ml-3 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold"
                                        >
                                          View log
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-200">
                            Upload a handwritten note to review its OCR text and make corrections.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>


        <section
          aria-labelledby="student-tts"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 id="student-tts" className="text-xl font-semibold mb-0">Text-To-Speech Demo</h2>
            <button
              type="button"
              onClick={() => setTtsOpen((open) => !open)}
              className="text-sm px-3 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              aria-expanded={ttsOpen}
              aria-controls="student-tts-panel"
            >
              {ttsOpen ? "▼" : "▲"}
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-200 mb-3">
            Hear a sample Calculus note with your selected voice, speed, and volume.
          </p>
          {!ttsSupported && (
            <p className="text-lg">Text-to-speech is not available in this browser. You can still use your screen reader.</p>
          )}
          {ttsSupported && ttsOpen && (
            <div id="student-tts-panel" className="space-y-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Live reading preview</p>
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Now reading</p>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 text-lg leading-7 min-h-[160px]">
                    {sampleParagraphs[sampleParagraphIndex].split(' ').map((w, wi, arr) => {
                      const isActive = highlightIndex === wi && activeSpeechId === 'sample-note';
                      return (
                        <span
                          key={`live-${wi}`}
                          className={`mr-1 inline-block transition-all duration-200 ${
                            isActive
                              ? 'bg-yellow-200 dark:bg-yellow-500/50 font-semibold text-lg border-2 border-amber-500 rounded px-1.5 shadow transform scale-[1.14]'
                              : ''
                          }`}
                        >
                          {w}
                          {wi < arr.length - 1 ? ' ' : ''}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                      Equation preview
                    </p>
                    <pre className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
                      {`f(x) = x^2 + 3x - 5\nf'(x) = 2x + 3\n∫ f(x) dx = x^3/3 + (3/2)x^2 - 5x + C`}
                    </pre>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Voice</span>
                    <select
                      value={selectedVoiceUri ?? ''}
                      onChange={(e) => {
                        setSelectedVoiceUri(e.target.value);
                        if (typeof window !== 'undefined') {
                          window.localStorage.setItem('tts-prefs', JSON.stringify({ volume, voiceURI: e.target.value, rate }));
                        }
                      }}
                      className="border rounded px-3 py-2 text-lg bg-white dark:bg-slate-800 w-full"
                    >
                      {voices.length === 0 && <option value="">Loading voices...</option>}
                      {voices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Speed</span>
                    <select
                      value={rate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setRate(val);
                        if (typeof window !== 'undefined') {
                          window.localStorage.setItem('tts-prefs', JSON.stringify({ volume, voiceURI: selectedVoiceUri ?? undefined, rate: val }));
                        }
                      }}
                      className="border rounded px-3 py-2 text-lg bg-white dark:bg-slate-800 w-full"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1.0x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2.0x</option>
                    </select>
                  </label>
                </div>
                <div className="w-full max-w-md mx-auto text-sm">
                  <span className="block text-xs text-gray-700 dark:text-gray-300 mb-1 text-center">Volume (starts at 50%)</span>
                  <div className="flex items-center gap-3 justify-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => {
                        const vol = parseFloat(e.target.value);
                        setVolume(vol);
                        if (typeof window !== 'undefined') {
                          window.localStorage.setItem('tts-prefs', JSON.stringify({ volume: vol, voiceURI: selectedVoiceUri ?? undefined, rate }));
                        }
                      }}
                      className="w-full accent-blue-600"
                      aria-valuemin={0}
                      aria-valuemax={1}
                      aria-valuenow={volume}
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-200">{Math.round(volume * 100)}%</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 justify-center">
                  <button type="button" className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50" onClick={() => setSampleParagraphIndex(0)} disabled={sampleParagraphIndex === 0}>First</button>
                  <button type="button" className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50" onClick={() => setSampleParagraphIndex((i) => Math.max(0, i - 1))} disabled={sampleParagraphIndex === 0}>Prev</button>
                  {isSpeaking && activeSpeechId === 'sample-note' ? (
                    <button type="button" onClick={handleStop} className="px-5 py-3 rounded bg-red-700 text-white text-lg disabled:opacity-60">
                      Stop {countdown !== null ? `(${countdown}s)` : ""}
                    </button>
                  ) : (
                    <button type="button" onClick={handlePlaySample} className="px-5 py-3 rounded bg-green-700 text-white text-lg disabled:opacity-60" aria-pressed={activeSpeechId === 'sample-note'} disabled={isSpeaking && activeSpeechId === 'sample-note'}>READ</button>
                  )}
                  <button type="button" className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50" onClick={() => setSampleParagraphIndex((i) => Math.min(sampleParagraphs.length - 1, i + 1))} disabled={sampleParagraphIndex === sampleParagraphs.length - 1}>Next</button>
                  <button type="button" className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50" onClick={() => setSampleParagraphIndex(sampleParagraphs.length - 1)} disabled={sampleParagraphIndex === sampleParagraphs.length - 1}>Last</button>
                </div>
                <div className="text-sm space-y-1 text-center" aria-live="polite" role="status">
                  {speechStatus && <p className="text-emerald-700">{speechStatus}</p>}
                  {speechError && <p className="text-red-700" role="alert">{speechError}</p>}
                </div>
              </div>
            </div>
          )}
        </section>

        <section
          aria-labelledby="student-tts-ai"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 id="student-tts-ai" className="text-xl font-semibold mb-0">AI-To-Speech Demo</h2>
            <button
              type="button"
              onClick={() => setAiTtsOpen((open) => !open)}
              className="text-sm px-3 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              aria-expanded={aiTtsOpen}
              aria-controls="student-tts-ai-panel"
            >
              {aiTtsOpen ? "▼" : "▲"}
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-200 mb-3">
            Preview how an uploaded math image would be OCR’d and read aloud by the AI, using the module you selected above.
          </p>
          {aiTtsOpen && (
            <div id="student-tts-ai-panel" className="mt-1">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 h-[27rem] md:h-[36rem] flex flex-col gap-3 overflow-hidden">
                <div className="flex-1 space-y-3 overflow-auto text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">OCR text (from uploaded image)</span>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                      {activeModuleSample.paragraphs[0]}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">AI readout</span>
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-slate-200 dark:border-slate-700 p-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">AI voice</p>
                      <p>{sampleTLDR}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Chat transcript (demo)</span>
                    <div className="space-y-2">
                      <div className="max-w-[90%] rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2">
                        <p className="text-xs text-slate-600 dark:text-slate-200">You</p>
                        <p>Read this math note aloud with a calm voice.</p>
                      </div>
                      <div className="max-w-[90%] rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 p-2 ml-auto">
                        <p className="text-xs text-emerald-700 dark:text-emerald-200">AI</p>
                        <p>{activeModuleSample.paragraphs[1] ?? sampleTLDR}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                    aria-label="Attach file (demo)"
                  >
                    📎
                  </button>
                  <input
                    type="text"
                    placeholder="Type a prompt or paste OCR text..."
                    className="flex-1 border rounded px-3 py-2 text-sm bg-white dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 rounded bg-blue-700 text-white text-sm"
                  >
                    Send
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                
              </p>
            </div>
          )}
        </section>

        <section
          aria-labelledby="student-braille"
          className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 id="student-braille" className="text-xl font-semibold mb-0">
              Text-To-Braille Demo
            </h2>
            <button
              type="button"
              onClick={() => setBrailleOpen((open) => !open)}
              className="text-sm px-3 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"
              aria-expanded={brailleOpen}
              aria-controls="student-braille-panel"
              aria-label={brailleOpen ? "Hide Braille preview" : "Show Braille preview"}
            >
              {brailleOpen ? "▼" : "▲"}
            </button>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Expand to see the generated Braille and download a .brf
            file for a display or simulator.
          </p>
          {brailleOpen && (
            <div id="student-braille-panel">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Preview source: {notes.length > 0 ? "Latest released note" : "Sample note"}
              </p>
              <div className="flex flex-wrap gap-4 items-end mb-3">
                <label className="text-lg">
                  <span className="block text-sm text-gray-700 dark:text-gray-300">Engine</span>
                  <select
                    value={braillePreferredEngine}
                    onChange={(e) => setBraillePreferredEngine(e.target.value as "liblouis" | "fallback")}
                    className="border rounded px-3 py-2 text-lg bg-white dark:bg-slate-800"
                  >
                    <option value="liblouis">liblouis (Nemeth)</option>
                    <option value="fallback">Grade 1 fallback</option>
                  </select>
                </label>
                <label className="text-lg">
                  <span className="block text-sm text-gray-700 dark:text-gray-300">liblouis table</span>
                  <select
                    value={brailleTable}
                    onChange={(e) => setBrailleTable(e.target.value)}
                    className="border rounded px-3 py-2 text-lg bg-white dark:bg-slate-800"
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
                Available tables: nemeth, en-us-g1, en-us-g2. Switch to Grade 1 fallback if liblouis is not installed on
                the server.
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
              <div className="mt-3 border rounded p-4 bg-gray-50 dark:bg-slate-800 font-mono text-lg whitespace-pre-wrap" aria-live="polite">
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
            </div>
          )}
        </section>

        {/* Report-a-problem block removed per requirements; ticket flow now demo-only in teacher/admin views */}
      </div>

      {scoreLogOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="max-w-md w-full mx-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                OCR score history
              </h3>
              <button
                type="button"
                onClick={() => setScoreLogOpen(false)}
                className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto text-xs text-slate-700 dark:text-slate-200 space-y-1">
              {(() => {
                const selected = activeUploadId
                  ? previousUploads.find((u) => u.id === activeUploadId)
                  : null;
                const history = selected?.history ?? [];
                if (!history.length) {
                  return <p>No score history recorded yet for this image.</p>;
                }
                return history.map((h, idx) => (
                  <p key={`${h.createdAt}-${idx}`}>
                    {h.score}% on {new Date(h.createdAt).toLocaleString()}
                  </p>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed right-4 bottom-4 z-40"
        style={{ fontSize: `${fontScale}rem` }}
      >
        {widgetOpen ? (
          <div
            className={`rounded-2xl shadow-lg border p-3 space-y-2 w-72 ${
              highContrast
                ? "bg-black text-yellow-100 border-yellow-300"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Vision & Reader</p>
              <button
                type="button"
                className="text-sm px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setWidgetOpen(false)}
                aria-label="Collapse accessibility widget"
              >
                Close
              </button>
            </div>
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
            <label className="flex flex-col text-xs text-slate-700 dark:text-slate-200">
              <span className="mb-1">Voice for nav reader</span>
              <select
                value={selectedVoiceUri ?? ""}
                onChange={(e) => {
                  setSelectedVoiceUri(e.target.value);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem(
                      "tts-prefs",
                      JSON.stringify({ volume, voiceURI: e.target.value, rate })
                    );
                  }
                }}
                className="border rounded px-2 py-2 text-sm bg-white dark:bg-slate-800"
              >
                {voices.length === 0 && <option value="">Loading voices...</option>}
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="mt-2 px-3 py-2 rounded border text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60"
                disabled
              >
                Upload custom voice (coming soon)
              </button>
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                <span>Vol</span>
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
                        JSON.stringify({ volume: vol, voiceURI: selectedVoiceUri ?? undefined, rate })
                      );
                    }
                  }}
                  className="w-24 accent-blue-600"
                />
                <span>{Math.round(volume * 100)}%</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
                onClick={handlePlaySample}
                disabled={isSpeaking && activeSpeechId === "sample-note"}
              >
                Nav reader
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
        ) : (
          <button
            type="button"
            className="h-12 w-12 rounded-full shadow-lg bg-blue-700 text-white flex items-center justify-center text-xl"
            aria-label="Open accessibility controls"
            onClick={() => setWidgetOpen(true)}
          >
            A11y
          </button>
        )}
      </div>
    </Layout>
  );
}

export default StudentPage;







