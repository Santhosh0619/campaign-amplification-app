import { useCallback, useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

type Sub = { remove: () => void };

/**
 * Speech-to-text through the phone's own recogniser (the browser's on web). Final phrases are
 * handed to `onText`; the phrase being spoken right now is exposed as `interim` for live feedback.
 */
export function useSpeech(onText: (text: string) => void) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const handler = useRef(onText);
  handler.current = onText;

  useEffect(() => {
    let alive = true;
    try {
      const ok = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (alive) setSupported(Boolean(ok));
    } catch {
      if (alive) setSupported(false);
    }
    const subs: Sub[] = [];
    try {
      subs.push(
        ExpoSpeechRecognitionModule.addListener('result', (e) => {
          const text = e.results?.[0]?.transcript?.trim() ?? '';
          if (e.isFinal) {
            setInterim('');
            if (text) handler.current(text);
          } else {
            setInterim(text);
          }
        }),
        ExpoSpeechRecognitionModule.addListener('end', () => {
          setListening(false);
          setInterim('');
        }),
        ExpoSpeechRecognitionModule.addListener('error', (e) => {
          setListening(false);
          setInterim('');
          if (e.error === 'aborted' || e.error === 'no-speech') {
            if (e.error === 'no-speech') setError('We did not hear anything. Tap the microphone and try again.');
            return;
          }
          setError(
            e.error === 'not-allowed'
              ? 'Microphone access is turned off. Allow it in your phone settings, or type your answer.'
              : e.error === 'service-not-allowed' || e.error === 'language-not-supported'
                ? 'Speech recognition is not available on this phone. You can type your answer.'
                : 'Could not understand that. Try again or type your answer.',
          );
        }),
      );
    } catch {
      setSupported(false);
    }
    return () => {
      alive = false;
      subs.forEach((s) => s.remove());
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // nothing to stop
      }
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone access is turned off. Allow it in your phone settings, or type your answer.');
        return;
      }
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true, addsPunctuation: true });
      setListening(true);
    } catch {
      setError('Could not start the microphone. You can type your answer.');
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // already stopped
    }
    setListening(false);
  }, []);

  return { supported, listening, interim, error, start, stop };
}
