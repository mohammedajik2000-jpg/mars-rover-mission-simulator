import React from 'react';
import {
  Activity,
  Award,
  Camera,
  CheckCircle2,
  Compass,
  FlaskConical,
  Loader2,
  Radio,
  SatelliteDish,
  ShieldCheck,
} from 'lucide-react';
import { useMission } from '../state/MissionContext';

function formatDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const Phase7TransmissionPanel: React.FC = () => {
  const {
    setActivePhase,
    roverConfiguration,
    exploreBatteryPct,
    exploreDistanceM,
    exploreMissionTimeSec,
    exploreRoverHealthPct,
    completedActivities,
    activityResults,
    capturedPhotos,
    samplesAnalysedCount,
    transmissionStage,
    transmissionProgressPct,
    transmittedMb,
    totalPayloadMb,
    transmissionStatusMessage,
    transmissionCategories,
    replayPhase7Transmission,
  } = useMission();

  const isComplete = transmissionStage === 'complete';
  const findings = Object.values(activityResults).filter(Boolean);

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-[#0B0F17]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-slate-100">
            Phase 7 · Data Transmission
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Earth Deep Space Network · {roverConfiguration.roverId}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActivePhase('phase6')}
          className="rounded border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          Surface
        </button>
      </div>

      <div className="eng-scroll flex-1 space-y-4 overflow-y-auto p-4">
        {/* Final Mission Completed Banner & Report */}
        {isComplete && (
          <section className="rounded border border-emerald-500/70 bg-emerald-950/35 p-4">
            <div className="flex items-start gap-2.5">
              <Award className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold tracking-wider text-emerald-300">
                  MARS EXPLORATION MISSION COMPLETED
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-cyan-300">
                  FINAL MISSION CONTROL SUMMARY · EARTH RECEIPT CONFIRMED
                </p>

                <div className="mt-3 divide-y divide-emerald-500/20 rounded border border-emerald-500/30 bg-[#08110f] px-3 text-xs">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">Mission Status</span>
                    <span className="font-mono font-semibold text-emerald-300">SUCCESSFUL</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">Data Successfully Transmitted</span>
                    <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                      {totalPayloadMb.toFixed(1)} MB (100%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">Total Traverse Distance</span>
                    <span className="font-mono font-semibold text-slate-100 tabular-nums">
                      {exploreDistanceM.toFixed(1)} m
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">Scientific Discoveries</span>
                    <span className="font-mono font-semibold text-emerald-300 tabular-nums">
                      {completedActivities.length} / 6 Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">Samples & Photos Logged</span>
                    <span className="font-mono font-semibold text-emerald-300 tabular-nums">
                      {samplesAnalysedCount} Samples · {capturedPhotos.length} Photos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Live Telemetry Transmission Progress */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-display text-xs font-semibold tracking-wider text-slate-200">
              <SatelliteDish className="h-3.5 w-3.5 text-cyan-400" />
              MARS-TO-EARTH DSN DOWNLINK
            </span>
            <span
              className={`font-mono text-[11px] font-semibold tabular-nums ${
                isComplete ? 'text-emerald-400' : 'text-cyan-300'
              }`}
            >
              {transmissionProgressPct.toFixed(0)}%
            </span>
          </div>

          <p className="mt-1.5 font-mono text-[11px] text-slate-300">{transmissionStatusMessage}</p>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-sm bg-slate-800">
            <div
              className={`h-full transition-all duration-150 ${
                isComplete ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${transmissionProgressPct}%` }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-slate-400 tabular-nums">
            <span>X-BAND CARRIER · 225M KM</span>
            <span>
              {transmittedMb.toFixed(1)} / {totalPayloadMb.toFixed(1)} MB
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {transmissionCategories.map((cat) => (
              <div
                key={cat.id}
                className="rounded border border-slate-800/90 bg-[#090D14] px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-100">{cat.label}</span>
                  {cat.status === 'verified' ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      VERIFIED
                    </span>
                  ) : cat.status === 'sending' ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-cyan-300 tabular-nums">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {cat.progress}%
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-slate-500">QUEUED</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate">{cat.summary}</span>
                  <span className="ml-2 shrink-0 font-mono tabular-nums">{cat.sizeMb.toFixed(1)} MB</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-sm bg-slate-800">
                  <div
                    className={`h-full transition-all duration-150 ${
                      cat.status === 'verified' ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${cat.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mission Control Dashboard Metrics */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-display text-xs font-semibold tracking-wider text-slate-200">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              MISSION CONTROL DASHBOARD
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {formatDuration(exploreMissionTimeSec)}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded border border-slate-800 bg-[#090D14] p-2.5">
              <p className="text-[11px] text-slate-400">Rover Health</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-emerald-400 tabular-nums">
                {exploreRoverHealthPct.toFixed(1)}%
              </p>
            </div>
            <div className="rounded border border-slate-800 bg-[#090D14] p-2.5">
              <p className="text-[11px] text-slate-400">Battery Reserve</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-cyan-300 tabular-nums">
                {exploreBatteryPct.toFixed(1)}%
              </p>
            </div>
            <div className="rounded border border-slate-800 bg-[#090D14] p-2.5">
              <p className="text-[11px] text-slate-400">Distance Driven</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-slate-100 tabular-nums">
                {exploreDistanceM.toFixed(1)} m
              </p>
            </div>
            <div className="rounded border border-slate-800 bg-[#090D14] p-2.5">
              <p className="text-[11px] text-slate-400">Data Transmitted</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-emerald-400 tabular-nums">
                {transmittedMb.toFixed(1)} MB
              </p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded border border-slate-800 bg-[#090D14] p-2">
              <p className="font-mono text-sm font-semibold text-cyan-300 tabular-nums">
                {completedActivities.length}
              </p>
              <p className="text-[10px] text-slate-400">Discoveries</p>
            </div>
            <div className="rounded border border-slate-800 bg-[#090D14] p-2">
              <p className="font-mono text-sm font-semibold text-amber-300 tabular-nums">
                {samplesAnalysedCount}
              </p>
              <p className="text-[10px] text-slate-400">Samples</p>
            </div>
            <div className="rounded border border-slate-800 bg-[#090D14] p-2">
              <p className="font-mono text-sm font-semibold text-emerald-300 tabular-nums">
                {capturedPhotos.length}
              </p>
              <p className="text-[10px] text-slate-400">Photos</p>
            </div>
          </div>
        </section>

        {/* Scientific Findings Log */}
        {findings.length > 0 && (
          <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
            <p className="flex items-center gap-1.5 font-display text-xs font-semibold tracking-wider text-slate-200">
              <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />
              SCIENTIFIC FINDINGS ARCHIVE
            </p>
            <div className="mt-2.5 space-y-2">
              {findings.map((item) =>
                item ? (
                  <div
                    key={item.id}
                    className="rounded border border-slate-800 bg-[#090D14] p-2.5 text-xs"
                  >
                    <p className="font-semibold text-slate-100">{item.title}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-emerald-300">{item.reading}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{item.detail}</p>
                  </div>
                ) : null
              )}
            </div>
          </section>
        )}

        {/* Captured Mars Photographs Strip */}
        {capturedPhotos.length > 0 && (
          <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
            <p className="flex items-center gap-1.5 font-display text-xs font-semibold tracking-wider text-slate-200">
              <Camera className="h-3.5 w-3.5 text-cyan-400" />
              TRANSMITTED MARS PHOTOGRAPHS ({capturedPhotos.length})
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {capturedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded border border-slate-800 bg-[#090D14]"
                >
                  <img
                    src={photo.dataUrl}
                    alt={`Mars Mastcam frame - ${photo.subject}`}
                    className="aspect-video w-full object-cover"
                  />
                  <div className="px-2 py-1">
                    <p className="truncate font-mono text-[10px] text-cyan-300">{photo.subject}</p>
                    <p className="truncate font-mono text-[9px] text-slate-400">
                      {photo.bearingDeg}° · {photo.locationLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={replayPhase7Transmission}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-cyan-500/50 bg-cyan-500/15 px-3 py-2 font-display text-xs font-semibold tracking-wider text-cyan-200 transition-colors hover:bg-cyan-500/25"
          >
            <Radio className="h-3.5 w-3.5" />
            {isComplete ? 'Replay Data Transmission' : 'Restart Transmission Stream'}
          </button>

          <button
            type="button"
            onClick={() => setActivePhase('phase6')}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            <Compass className="h-3.5 w-3.5" />
            Return to Mars Surface Operations
          </button>

          <div className="flex items-center justify-center gap-1.5 pt-1 font-mono text-[10px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
            <span>{roverConfiguration.totalMassKg} kg ARES-IV Hardware Certified</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
