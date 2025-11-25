export function isTtsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.speechSynthesis !== "undefined";
}

export function speakText(text: string): void {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth || !text.trim()) return;

  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
}

