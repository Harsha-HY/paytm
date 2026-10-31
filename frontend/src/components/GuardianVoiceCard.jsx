import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api/client';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  BrainCircuit,
  Languages,
  CheckCircle2,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

const LANGUAGES = [
  { id: 'Kannada', label: 'ಕನ್ನಡ (Kannada)', code: 'kn-IN' },
  { id: 'Hindi', label: 'हिंदी (Hindi)', code: 'hi-IN' },
  { id: 'English', label: 'English', code: 'en-IN' },
  { id: 'Tamil', label: 'தமிழ் (Tamil)', code: 'ta-IN' },
  { id: 'Telugu', label: 'తెలుగు (Telugu)', code: 'te-IN' },
];

export default function GuardianVoiceCard() {
  const [selectedLang, setSelectedLang] = useState('Kannada');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const fetchExplanation = async (lang) => {
    try {
      setLoading(true);
      const res = await apiRequest(`/explain/settlement?language=${lang}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load explainer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanation(selectedLang);
  }, [selectedLang]);

  // Handle Playback: First tries native audio tag, also uses Web Speech API for rich native Indic speech
  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    setIsPlaying(true);
    // Play tone audio if available
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }

    // Trigger browser SpeechSynthesis for real voice narration in the selected Indic language!
    if ('speechSynthesis' in window && data?.active_script) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(data.active_script);
      const langObj = LANGUAGES.find((l) => l.id === selectedLang);
      utterance.lang = langObj ? langObj.code : 'en-IN';
      utterance.rate = 0.95; // comfortable cadence
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlaying(false), 4000);
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleLanguageChange = async (lang) => {
    stopPlayback();
    setSelectedLang(lang);
    // Save preference to Cognee
    try {
      await apiRequest('/explain/set-language', {
        method: 'POST',
        body: JSON.stringify({ language: lang }),
      });
    } catch (e) {}
  };

  return (
    <div className="bg-[#0A192F] text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden mb-6">
      {/* Top subtle glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#00BAF2]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hidden audio element for tone / Sarvam audio */}
      {data?.voice?.audio_base64 && (
        <audio
          ref={audioRef}
          src={data.voice.audio_base64}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Card Header & Cognee Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-[#00BAF2]/20 text-[#00BAF2] flex items-center justify-center shrink-0 shadow-md">
            <Volume2 className={`w-6 h-6 ${isPlaying ? 'animate-bounce text-[#00BAF2]' : ''}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00BAF2] bg-sky-950 px-2.5 py-0.5 rounded-full border border-sky-800">
                Sarvam Voice AI · Vernacular Explainer
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800 flex items-center space-x-1">
                <BrainCircuit className="w-3 h-3" />
                <span>Cognee Memory Active</span>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1">
              Deterministic Settlement Story
            </h3>
          </div>
        </div>

        {/* Language selector chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLanguageChange(l.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedLang === l.id
                  ? 'bg-[#00BAF2] text-slate-950 shadow-md shadow-[#00BAF2]/30 scale-105'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Script & Voice Controls */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400 font-medium animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#00BAF2] mb-2" />
          Synthesizing vernacular speech & recalling Cognee memory...
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Audio Playback Controls Banner */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00BAF2] to-sky-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-sky-500/25 hover:scale-105 transition-all cursor-pointer shrink-0"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
              </button>

              <div>
                <span className="font-extrabold text-white text-sm block">
                  {isPlaying ? 'Speaking explanation out loud...' : 'Listen to Voice Explanation'}
                </span>
                <span className="text-[11px] text-slate-400">
                  Sarvam Voice Engine · {selectedLang} Voice Note
                </span>
              </div>
            </div>

            {/* Audio Waveform Animation when playing */}
            <div className="hidden sm:flex items-center space-x-1 h-6">
              {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95].map((h, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full bg-[#00BAF2] transition-all duration-200 ${
                    isPlaying ? 'animate-pulse' : 'opacity-30'
                  }`}
                  style={{
                    height: isPlaying ? `${h}%` : '20%',
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Transcript Display (Indic text + English translation) */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00BAF2]">
                Spoken Transcript ({selectedLang})
              </span>
              <span className="text-[10px] text-slate-400">
                100% Math Verified by Rules Engine
              </span>
            </div>

            <p className="text-sm text-slate-100 font-medium leading-relaxed italic">
              "{data?.active_script}"
            </p>

            {selectedLang !== 'English' && data?.scripts?.english && (
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-300">English Translation: </span>
                "{data.scripts.english}"
              </div>
            )}
          </div>

          {/* Cognee Memory Context Pill */}
          {data?.cognee_memory && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="flex items-center space-x-1 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                <span>
                  Cognee remembers {data.cognee_memory.settlements_remembered} settlement records
                </span>
              </span>

              <span className="flex items-center space-x-1 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Accumulated GST ITC: ₹{data.cognee_memory.itc_accumulated.toFixed(2)}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
