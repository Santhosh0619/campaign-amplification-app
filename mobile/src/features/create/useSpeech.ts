import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const getCtor = (): (new () => RecognitionLike) | undefined => {
  if (Platform.OS !== 'web') return undefined;
  const g = globalThis as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return g.SpeechRecognition ?? g.webkitSpeechRecognition;
};

/**
 * Speech-to-text where the platform provides it (browsers). On phones without a built-in recogniser
 * `supported` is false and the interview falls back to typing or the keyboard's own dictation button.
 */
export function useSpeech(onText: (text: string) => void) {
  const supported = Boolean(getCtor());
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<RecognitionLike | null>(null);
  const handler = useRef(onText);
  handler.current = onText;

  const stop = useCallback(() => {
    ref.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const C = getCtor();
    if (!C) return;
    setError(null);
    const r = new C();
    r.continuous = true;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onresult = (e) => {
      let out = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) if (e.results[i].isFinal) out += e.results[i][0].transcript;
      if (out.trim()) handler.current(out.trim());
    };
    r.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'Microphone access was blocked. You can type instead.' : 'Could not hear that. You can type instead.');
      setListening(false);
    };
    r.onend = () => setListening(false);
    ref.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError('Could not start the microphone. You can type instead.');
    }
  }, []);

  useEffect(() => () => ref.current?.stop(), []);

  return { supported, listening, error, start, stop };
}
