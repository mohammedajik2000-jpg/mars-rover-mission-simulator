import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import { useMission } from '../state/MissionContext';

export const AudioControlWidget: React.FC = () => {
  const { audioPrefs, updateAudioPrefs, toggleAudioEnabled, toggleMute } = useMission();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const isAudible = audioPrefs.enabled && !audioPrefs.muted && audioPrefs.masterVolume > 0;

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      {/* Primary Visible Sound ON/OFF & Mute Button */}
      <button
        type="button"
        onClick={toggleMute}
        title={isAudible ? 'Mute All Audio' : 'Unmute Audio'}
        className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
          isAudible
            ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
            : 'border-slate-700 bg-[#111722] text-slate-400 hover:border-slate-600 hover:text-slate-200'
        }`}
      >
        {isAudible ? (
          <Volume2 className="h-3.5 w-3.5 text-cyan-300" />
        ) : (
          <VolumeX className="h-3.5 w-3.5 text-slate-400" />
        )}
        <span className="hidden sm:inline font-mono text-[11px]">
          {isAudible ? 'SOUND ON' : 'MUTED'}
        </span>
      </button>

      {/* Mixer Dropdown Toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Audio mixer controls"
        aria-expanded={open}
        className={`flex items-center justify-center rounded border p-1.5 transition-colors ${
          open
            ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
            : 'border-slate-700 bg-[#111722] text-slate-300 hover:border-slate-600 hover:text-white'
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-64 rounded border border-slate-700 bg-[#0B1018] p-3.5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="font-display text-xs font-semibold tracking-wider text-slate-100">
              AUDIO TELEMETRY
            </span>
            <button
              type="button"
              onClick={toggleAudioEnabled}
              className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                audioPrefs.enabled && !audioPrefs.muted
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                  : 'border-rose-500/50 bg-rose-500/15 text-rose-300'
              }`}
            >
              {audioPrefs.enabled && !audioPrefs.muted ? 'ENABLED' : 'OFF'}
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {/* Master Volume */}
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Master Volume</span>
                <span className="font-mono text-cyan-300 tabular-nums">
                  {Math.round(audioPrefs.masterVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(audioPrefs.masterVolume * 100)}
                onChange={(e) =>
                  updateAudioPrefs({
                    masterVolume: Number(e.target.value) / 100,
                    muted: false,
                    enabled: true,
                  })
                }
                className="mt-1 h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Ambience Volume */}
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Background Ambience</span>
                <span className="font-mono text-cyan-300 tabular-nums">
                  {Math.round(audioPrefs.ambienceVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(audioPrefs.ambienceVolume * 100)}
                onChange={(e) =>
                  updateAudioPrefs({
                    ambienceVolume: Number(e.target.value) / 100,
                  })
                }
                className="mt-1 h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Sound Effects Volume */}
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Sound Effects (SFX)</span>
                <span className="font-mono text-cyan-300 tabular-nums">
                  {Math.round(audioPrefs.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(audioPrefs.sfxVolume * 100)}
                onChange={(e) =>
                  updateAudioPrefs({
                    sfxVolume: Number(e.target.value) / 100,
                  })
                }
                className="mt-1 h-1.5 w-full cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-800/70 px-3 py-1.5 font-mono text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700"
          >
            {isAudible ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {isAudible ? 'Mute All Sound' : 'Unmute All Sound'}
          </button>
        </div>
      )}
    </div>
  );
};
