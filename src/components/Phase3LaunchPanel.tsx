import React from 'react';
import { ArrowRight, CheckCircle2, Flame, Loader2, Rocket, RotateCcw } from 'lucide-react';
import { useMission } from '../state/MissionContext';
import { LaunchStage } from '../types/mission';

const LAUNCH_MILESTONES: Array<{ stage: LaunchStage; label: string }> = [
  { stage: 'countdown', label: 'T-10s Terminal Countdown' },
  { stage: 'ignition', label: 'Main Engine Ignition' },
  { stage: 'liftoff', label: 'Launchpad Liftoff' },
  { stage: 'stageSep', label: 'First Stage Separation' },
  { stage: 'fairingSep', label: 'Payload Fairing Jettison' },
  { stage: 'spacecraftSep', label: 'Spacecraft Separation' },
  { stage: 'orbitSuccess', label: 'Orbital Insertion Confirmed' },
];

const STAGE_ORDER: LaunchStage[] = [
  'pad',
  'countdown',
  'ignition',
  'liftoff',
  'stageSep',
  'fairingSep',
  'spacecraftSep',
  'orbitSuccess',
];

function formatMissionClock(sec: number): string {
  const sign = sec < 0 ? 'T-' : 'T+';
  const abs = Math.abs(sec);
  const whole = Math.floor(abs);
  const tenths = Math.floor((abs - whole) * 10);
  const mins = Math.floor(whole / 60);
  const rem = whole % 60;
  return `${sign}${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}.${tenths}`;
}

export const Phase3LaunchPanel: React.FC = () => {
  const {
    launchStage,
    missionTimeSec,
    altitudeKm,
    velocityKmS,
    gForce,
    downrangeKm,
    startLaunchCountdown,
    resetLaunch,
    setActivePhase,
    proceedToPhase4Cruise,
    roverConfiguration,
  } = useMission();

  const currentIdx = STAGE_ORDER.indexOf(launchStage);
  const isSuccess = launchStage === 'orbitSuccess';
  const isInFlight = launchStage !== 'pad' && !isSuccess;

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-[#0B0F17]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-slate-100">
            Phase 3 · Earth Rocket Launch
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Launch Complex 41 · Payload: {roverConfiguration.roverId}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActivePhase('phase2')}
          className="rounded border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          Back
        </button>
      </div>

      <div className="eng-scroll flex-1 space-y-4 overflow-y-auto p-4">
        {/* Countdown & Mission Elapsed Clock */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Mission Clock</span>
            <span
              className={`font-mono text-xs font-semibold ${
                isSuccess
                  ? 'text-emerald-400'
                  : launchStage === 'pad'
                    ? 'text-cyan-400'
                    : 'text-amber-400'
              }`}
            >
              {launchStage.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-slate-100 tabular-nums">
            {formatMissionClock(missionTimeSec)}
          </p>

          {launchStage === 'pad' && (
            <button
              type="button"
              onClick={startLaunchCountdown}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded border border-amber-400/60 bg-amber-500 px-4 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-amber-400"
            >
              <Flame className="h-4 w-4" />
              START 10-SECOND COUNTDOWN
            </button>
          )}

          {isInFlight && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>LAUNCH SEQUENCE ACTIVE</span>
            </div>
          )}
        </section>

        {/* Live Flight Telemetry */}
        <section className="grid grid-cols-2 gap-2.5">
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Altitude</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {altitudeKm.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-slate-400">km</span>
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Velocity</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {velocityKmS.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-slate-400">km/s</span>
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Acceleration</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {gForce.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-slate-400">G</span>
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Downrange</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {downrangeKm.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-slate-400">km</span>
            </p>
          </div>
        </section>

        {/* Flight Milestone Progression */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <p className="font-display text-xs font-semibold tracking-wider text-slate-200">
            ASCENT TELEMETRY EVENTS
          </p>
          <div className="mt-2.5 space-y-1.5">
            {LAUNCH_MILESTONES.map((m) => {
              const mIdx = STAGE_ORDER.indexOf(m.stage);
              const done = currentIdx > mIdx || isSuccess;
              const active = currentIdx === mIdx && !isSuccess;
              return (
                <div
                  key={m.stage}
                  className="flex items-center justify-between rounded border border-slate-800/80 bg-[#090D14] px-2.5 py-1.5 text-xs"
                >
                  <span className={done || active ? 'text-slate-100' : 'text-slate-500'}>
                    {m.label}
                  </span>
                  <span
                    className={`font-mono text-[11px] ${
                      done
                        ? 'text-emerald-400'
                        : active
                          ? 'text-amber-400'
                          : 'text-slate-600'
                    }`}
                  >
                    {done ? 'CONFIRMED' : active ? 'ACTIVE' : 'PENDING'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Launch Success + Continue to Phase 4 */}
        {isSuccess && (
          <section className="rounded border border-emerald-500/60 bg-emerald-950/35 p-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold tracking-wider text-emerald-300">
                  LAUNCH SUCCESS · ORBIT ACHIEVED
                </p>
                <p className="mt-1 text-xs text-slate-200">
                  {roverConfiguration.roverId} ({roverConfiguration.totalMassKg} kg) separated
                  cleanly from upper stage in Earth parking orbit.
                </p>

                <button
                  type="button"
                  onClick={proceedToPhase4Cruise}
                  className="mt-3.5 flex w-full items-center justify-center gap-2 rounded border border-emerald-400/60 bg-emerald-500 px-4 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  <Rocket className="h-4 w-4" />
                  <span>CONTINUE TO PHASE 4 – DEEP SPACE JOURNEY</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={resetLaunch}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Launchpad
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
