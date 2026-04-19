import { useState, useRef } from 'react';

export function useVoiceInput(onResult: (transcript: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const SR: any =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const start = () => {
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      onResult(e.results[0][0].transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return { listening, start, stop, supported: !!SR };
}
