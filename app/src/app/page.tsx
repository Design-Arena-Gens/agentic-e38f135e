'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Status =
  | { type: 'idle' }
  | { type: 'recording' }
  | { type: 'processing' }
  | { type: 'ready'; transcription: string; translation: string };

const languages = [
  { code: 'auto', label: 'Auto Detect' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'tr', label: 'Turkish' },
];

export default function Home() {
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecordingSupported, setIsRecordingSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    ) {
      setIsRecordingSupported(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const canSubmit = useMemo(() => {
    return !isSubmitting && !!selectedFile;
  }, [isSubmitting, selectedFile]);

  const handleRecordingStart = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunks.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
        setSelectedFile(file);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(URL.createObjectURL(blob));
        setStatus({ type: 'idle' });
      };
      mediaRecorder.start();
      setStatus({ type: 'recording' });
    } catch (err) {
      console.error(err);
      setError('Microphone access denied or not available.');
    }
  };

  const handleRecordingStop = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStatus({ type: 'idle' });
    setError(null);
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('audio/')) {
      setError('Please choose a valid audio file.');
      return;
    }
    setSelectedFile(file);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const audioFile = selectedFile;
    if (!audioFile) {
      setError('Record audio or upload a file before submitting.');
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'processing' });

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('sourceLanguage', sourceLanguage);
      formData.append('targetLanguage', targetLanguage);

      const response = await fetch('/api/translate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Translation failed.');
      }

      const payload = (await response.json()) as { transcription: string; translation: string };
      setStatus({ type: 'ready', transcription: payload.transcription, translation: payload.translation });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus({ type: 'idle' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12 sm:py-20">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold sm:text-4xl">Audio Language Translator</h1>
          <p className="text-slate-300">
            Capture or upload speech, then translate it instantly with GPT-powered transcription and translation.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur">
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <h2 className="text-lg font-medium">Source Language</h2>
                <p className="text-sm text-slate-400">
                  Auto-detect works for most uploads. Pick a language for faster, more accurate results.
                </p>
                <select
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                  value={sourceLanguage}
                  onChange={(event) => setSourceLanguage(event.target.value)}
                >
                  {languages.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <h2 className="text-lg font-medium">Target Language</h2>
                <p className="text-sm text-slate-400">Choose any supported language for translated output.</p>
                <select
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                  value={targetLanguage}
                  onChange={(event) => setTargetLanguage(event.target.value)}
                >
                  {languages
                    .filter((language) => language.code !== 'auto')
                    .map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-indigo-500/30 bg-indigo-950/20 p-6">
              <label className="flex cursor-pointer flex-col gap-3 text-center">
                <span className="text-base font-medium text-indigo-200">Upload audio</span>
                <span className="text-sm text-indigo-200/70">
                  Drop an audio file here or click to browse. Supported formats: mp3, wav, m4a, webm.
                </span>
                <input
                  className="hidden"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <span className="text-sm text-indigo-100">{selectedFile.name}</span>
                ) : (
                  <span className="text-sm text-indigo-200/70">No file selected yet</span>
                )}
              </label>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200">Live Recording</p>
                <p className="text-xs text-slate-400">
                  {isRecordingSupported
                    ? 'Use your microphone to capture fresh audio samples.'
                    : 'Recording is unavailable in this browser.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={status.type === 'recording' ? handleRecordingStop : handleRecordingStart}
                  disabled={!isRecordingSupported}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    status.type === 'recording'
                      ? 'bg-rose-500 text-white hover:bg-rose-400'
                      : 'bg-indigo-500 text-white hover:bg-indigo-400'
                  } ${!isRecordingSupported ? 'opacity-40' : ''}`}
                >
                  {status.type === 'recording' ? 'Stop Recording' : 'Start Recording'}
                </button>
                <span
                  className={`flex h-3 w-3 shrink-0 rounded-full ${
                    status.type === 'recording' ? 'bg-rose-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
              </div>
            </div>

            {audioUrl && (
              <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-sm font-semibold text-slate-200">Preview</p>
                <audio controls className="w-full">
                  <source src={audioUrl} />
                </audio>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status.type === 'processing' ? 'Processing…' : 'Translate Audio'}
              </button>
              {error && <p className="text-sm text-rose-400">{error}</p>}
            </div>
          </form>
        </section>

        {status.type === 'ready' && (
          <section className="grid gap-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-medium text-slate-100">Transcription</h2>
              <p className="rounded-xl border border-white/5 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-200">
                {status.transcription}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-medium text-slate-100">Translation</h2>
              <p className="rounded-xl border border-white/5 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-200">
                {status.translation}
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
