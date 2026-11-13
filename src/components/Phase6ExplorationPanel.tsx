import React from 'react';
import {
  Activity,
  Award,
  Camera,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Mountain,
  Radio,
  RotateCcw,
  SatelliteDish,
  Thermometer,
  Wrench,
} from 'lucide-react';
import { ExplorationActivityId } from '../types/mission';
import { useMission } from '../state/MissionContext';

function formatMissionDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

const SCIENCE_BUTTONS: Array<{
  id: ExplorationActivityId;
  label: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'rockSample',
    label: 'Rock Sample Analysis',
    subtitle: 'PIXL X-ray & Raman outcrop core scan',
    Icon: Mountain,
  },
  {
    id: 'soilComposition',
    label: 'Soil Composition Analysis',
    subtitle: 'APXS regolith mineralogy assay',
    Icon: FlaskConical,
  },
  {
    id: 'surfaceTemp',
    label: 'Surface Temperature Measurement',
    subtitle: 'MEDA ground & atmospheric thermal sweep',
    Icon: Thermometer,
  },
  {
    id: 'cameraObs',
    label: 'Camera Observation',
    subtitle: 'Mastcam-Z 360° geological panorama',
    Icon: Camera,
  },
  {
    id: 'roboticArm',
    label: 'Robotic Arm Interaction',
    subtitle: '5-DOF turret deploy & brush calibration',
    Icon: Wrench,
  },
  {
    id: 'commCheck',
    label: 'Communication Signal Check',
    subtitle: 'MRO UHF & Earth DSN X-Band relay ping',
    Icon: Radio,
  },
];

export const Phase6ExplorationPanel: React.FC = () => {
  const {
    setActivePhase,
    roverConfiguration,
    exploreBatteryPct,
    exploreSpeedMS,
    exploreDistanceM,
    exploreMissionTimeSec,
    exploreSurfaceTempC,
    exploreCommStatus,
    exploreRoverHealthPct,
    exploreCollisionAlert,
    targetRockDistanceM,
    nearestRockName,
    activeScienceScan,
    scienceSubstage,
    scienceProgressPct,
    scienceNotice,
    completedActivities,
    activityResults,
    capturedPhotos,
    explorationObjectives,
    explorationComplete,
    samplesAnalysedCount,
    triggerActivity,
    resetExploration,
    proceedToPhase7Transmission,
  } = useMission();

  const completedList = Object.values(activityResults).filter(Boolean);

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-[#0B0F17]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-slate-100">
            Phase 6 · Mars Exploration
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Jezero Crater Traverse · {roverConfiguration.roverId}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActivePhase('phase5')}
          className="rounded border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          Back
        </button>
      </div>

      <div className="eng-scroll flex-1 space-y-4 overflow-y-auto p-4">
        {/* Final Mission Completion Report */}
        {explorationComplete && (
          <section className="rounded border border-emerald-500/65 bg-emerald-950/40 p-4">
            <div className="flex items-start gap-2.5">
              <Award className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold tracking-wider text-emerald-300">
                  MARS MISSION ACCOMPLISHED
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-cyan-300">
                  FINAL SURFACE EXPLORATION REPORT
                </p>

                <div className="mt-3 divide-y divide-emerald-500/20 rounded border border-emerald-500/30 bg-[#091210] px-3 text-xs">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">Total Distance Travelled</span>
                    <span className="font-mono font-semibold text-emerald-300 tabular-nums">
                      {exploreDistanceM.toFixed(1)} m
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">Scientific Activities Completed</span>
                    <span className="font-mono font-semibold text-emerald-300 tabular-nums">
                      {completedActivities.length} / 6
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">Samples Analysed</span>
                    <span className="font-mono font-semibold text-emerald-300 tabular-nums">
                      {samplesAnalysedCount} Core & Regolith
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">Mission Duration</span>
                    <span className="font-mono font-semibold text-emerald-300 tabular-nums">
                      {formatMissionDuration(exploreMissionTimeSec)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">Final Rover Health</span>
                    <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                      {exploreRoverHealthPct.toFixed(1)}% NOMINAL
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={proceedToPhase7Transmission}
                    className="flex w-full items-center justify-center gap-1.5 rounded border border-cyan-400/60 bg-cyan-500 px-3 py-2 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-cyan-400"
                  >
                    <SatelliteDish className="h-3.5 w-3.5" />
                    TRANSMIT MISSION DATA TO EARTH
                  </button>
                  <button
                    type="button"
                    onClick={resetExploration}
                    className="flex w-full items-center justify-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restart Surface Traverse
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Live Mission Dashboard Telemetry */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-display text-xs font-semibold tracking-wider text-slate-200">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              MISSION DASHBOARD
            </span>
            <span className="font-mono text-[11px] font-semibold text-emerald-400 tabular-nums">
              SOL 01 · {formatMissionDuration(exploreMissionTimeSec)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded border border-slate-800/90 bg-[#090D14] p-2.5">
              <p className="text-[11px] text-slate-400">Battery</p>
              <p className="mt-0.5 font-mono text-base font-semibold text-emerald-400 tabular-nums">
                {exploreBatteryPct.toFixed(1)}
                <span className="ml-0.5 text-xs font-normal text-slate-400">%</span>
              </p>
            </div>
            <div className="rounded border border-slate-800/90 bg-[#090D14] p-2.5">
              <p className="text-[11px] text-slate-400">Rover Speed</p>
              <p className="mt-0.5 font-mono text-base font-semibold text-cyan-300 tabular-nums">
                {exploreSpeedMS.toFixed(2)}
                <span className="ml-1 text-xs font-normal text-slate-400">m/s</span>
              </p>
            </div>
            <div className="rounded border border-slate-800/90 bg-[#090D14] p-2.5">
              <p className="text-[11px] text-slate-400">Distance Travelled</p>
              <p className="mt-0.5 font-mono text-base font-semibold text-slate-100 tabular-nums">
                {exploreDistanceM.toFixed(1)}
                <span className="ml-1 text-xs font-normal text-slate-400">m</span>
              </p>
            </div>
            <div className="rounded border border-slate-800/90 bg-[#090D14] p-2.5">
              <p className="text-[11px] text-slate-400">Surface Temp</p>
              <p className="mt-0.5 font-mono text-base font-semibold text-amber-300 tabular-nums">
                {exploreSurfaceTempC.toFixed(1)}
                <span className="ml-0.5 text-xs font-normal text-slate-400">°C</span>
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded border border-slate-800/90 bg-[#090D14] px-2.5 py-1.5 text-xs">
            <span className="text-slate-400">Comm Link</span>
            <span className="font-mono text-[11px] font-medium text-cyan-300">
              {exploreCommStatus}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between rounded border border-slate-800/90 bg-[#090D14] px-2.5 py-1.5 text-xs">
            <span className="text-slate-400">Completed Discoveries</span>
            <span className="font-mono text-[11px] font-semibold text-emerald-400 tabular-nums">
              {completedActivities.length} / 6
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between rounded border border-slate-800/90 bg-[#090D14] px-2.5 py-1.5 text-xs">
            <span className="truncate text-slate-400">Nearest Outcrop</span>
            <span
              className={`shrink-0 font-mono text-[11px] font-semibold tabular-nums ${
                targetRockDistanceM <= 6.2 ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {targetRockDistanceM.toFixed(1)} m · {nearestRockName.split(' ')[0]}
            </span>
          </div>

          {exploreCollisionAlert && (
            <div className="mt-2 rounded border border-amber-500/50 bg-amber-950/40 px-2.5 py-1.5 font-mono text-[11px] text-amber-300">
              HAZARD AVOIDANCE ACTIVE · Boulder or perimeter boundary detected
            </div>
          )}
        </section>

        {/* 5 Dynamic Mission Objectives */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <p className="font-display text-xs font-semibold tracking-wider text-slate-200">
            MISSION OBJECTIVES
          </p>
          <div className="mt-2.5 space-y-1.5">
            {explorationObjectives.map((obj) => (
              <div
                key={obj.id}
                className={`rounded border px-2.5 py-2 text-xs transition-colors ${
                  obj.completed
                    ? 'border-emerald-500/35 bg-emerald-950/25'
                    : 'border-slate-800/80 bg-[#090D14]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={obj.completed ? 'font-medium text-emerald-200' : 'text-slate-200'}>
                    {obj.label}
                  </span>
                  {obj.completed ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <span className="font-mono text-[10px] text-slate-500">ACTIVE</span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">{obj.hint}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6 Interactive Scientific Activities */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <p className="font-display text-xs font-semibold tracking-wider text-slate-200">
            SCIENTIFIC INSTRUMENTS & ACTIVITIES
          </p>

          {activeScienceScan && scienceSubstage && (
            <div className="mt-2 rounded border border-amber-500/50 bg-amber-950/35 p-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-mono font-medium text-amber-200">{scienceSubstage}</span>
                <span className="font-mono font-semibold text-amber-300 tabular-nums">
                  {scienceProgressPct}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-sm bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-all duration-100"
                  style={{ width: `${scienceProgressPct}%` }}
                />
              </div>
            </div>
          )}

          {!activeScienceScan && scienceNotice && (
            <div className="mt-2 rounded border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1.5 font-mono text-[11px] text-cyan-200">
              {scienceNotice}
            </div>
          )}

          <div className="mt-2.5 space-y-2">
            {SCIENCE_BUTTONS.map(({ id, label, subtitle, Icon }) => {
              const isDone = completedActivities.includes(id);
              const isRunning = activeScienceScan === id;
              const result = activityResults[id];

              return (
                <div
                  key={id}
                  className={`rounded border p-2.5 transition-colors ${
                    isRunning
                      ? 'border-amber-400/60 bg-amber-950/25'
                      : isDone
                        ? 'border-emerald-500/35 bg-[#091210]'
                        : 'border-slate-800 bg-[#090D14]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isRunning
                            ? 'text-amber-300'
                            : isDone
                              ? 'text-emerald-400'
                              : 'text-cyan-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-100">{label}</p>
                        <p className="truncate text-[11px] text-slate-400">{subtitle}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={Boolean(activeScienceScan)}
                      onClick={() => triggerActivity(id)}
                      className={`shrink-0 rounded px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                        isRunning
                          ? 'border border-amber-400/50 bg-amber-500/20 text-amber-200'
                          : isDone
                            ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                            : 'border border-cyan-500/50 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50'
                      }`}
                    >
                      {isRunning ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          SCAN
                        </span>
                      ) : isDone ? (
                        'RE-RUN'
                      ) : (
                        'RUN'
                      )}
                    </button>
                  </div>

                  {result && (
                    <div className="mt-2 border-t border-slate-800/80 pt-1.5">
                      <p className="font-mono text-[11px] font-semibold text-emerald-300">
                        {result.reading}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                        {result.detail}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Captured Mars Photo Gallery */}
        {capturedPhotos.length > 0 && (
          <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-display text-xs font-semibold tracking-wider text-slate-200">
                <Camera className="h-3.5 w-3.5 text-cyan-400" />
                MARS PHOTO GALLERY
              </span>
              <span className="font-mono text-[11px] font-semibold text-cyan-300 tabular-nums">
                {capturedPhotos.length} SAVED
              </span>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {capturedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded border border-slate-800 bg-[#090D14]"
                >
                  <img
                    src={photo.dataUrl}
                    alt={`Mars panorama - ${photo.subject}`}
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

        {completedList.length > 0 && !explorationComplete && (
          <div className="rounded border border-slate-800 bg-[#0E141F] px-3 py-2 text-[11px] text-slate-400">
            Logged <span className="font-mono text-cyan-300">{completedList.length}</span> science
            findings. Complete all 5 mission objectives to unlock Earth data transmission.
          </div>
        )}
      </div>
    </aside>
  );
};
