export function isTtsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.speechSynthesis !== "undefined";
}

type SpeakTextOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  voice?: SpeechSynthesisVoice;
};

export function speakText(
  text: string,
  options: SpeakTextOptions = {}
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined") return null;
  const synth = window.speechSynthesis;
  if (!synth || !text.trim()) return null;

  // Cancel any currently speaking utterance to avoid overlap.
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;
  if (options.voice) {
    utterance.voice = options.voice;
  }

  if (options.onStart) utterance.onstart = options.onStart;
  if (options.onEnd) utterance.onend = options.onEnd;
  if (options.onError) utterance.onerror = options.onError;

  synth.speak(utterance);
  return utterance;
}

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
}
