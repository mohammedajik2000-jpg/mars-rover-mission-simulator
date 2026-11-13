import React from 'react';
import { ArrowRight, CheckCircle2, Compass, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { useMission } from '../state/MissionContext';

export const Phase5LandingPanel: React.FC = () => {
  const {
    edlStage,
    edlProgressPct,
    edlAltitudeKm,
    edlSpeedMS,
    heatshieldTempC,
    parachuteDeployed,
    landingStatusText,
    edlEvents,
    startMarsLanding,
    setActivePhase,
    proceedToPhase6Exploration,
    roverConfiguration,
  } = useMission();

  const isComplete = edlStage === 'complete';

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-[#0B0F17]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-slate-100">
            Phase 5 · Mars Entry & Landing
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Jezero Crater EDL · {roverConfiguration.roverId}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActivePhase('phase4')}
          className="rounded border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          Back
        </button>
      </div>

      <div className="eng-scroll flex-1 space-y-4 overflow-y-auto p-4">
        {/* EDL Mission Status & Progress */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Mission Status</span>
            <span
              className={`font-mono text-xs font-semibold ${
                isComplete ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {edlStage.toUpperCase()}
            </span>
          </div>

          <p className="mt-1.5 font-display text-sm font-bold tracking-wide text-cyan-300">
            {landingStatusText}
          </p>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-[11px] text-slate-400">EDL Progress</span>
            <span className="font-mono text-sm font-semibold text-slate-100 tabular-nums">
              {edlProgressPct.toFixed(1)}%
            </span>
          </div>

          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm bg-slate-800">
            <div
              className={`h-full transition-all duration-150 ${
                isComplete ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(100, edlProgressPct)}%` }}
            />
          </div>

          {!isComplete && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 font-mono text-xs text-amber-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>EDL SEQUENCE ACTIVE</span>
            </div>
          )}
        </section>

        {/* Live EDL Telemetry */}
        <section className="grid grid-cols-2 gap-2.5">
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Altitude</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {edlAltitudeKm >= 1 ? edlAltitudeKm.toFixed(1) : (edlAltitudeKm * 1000).toFixed(0)}
              <span className="ml-1 text-xs font-normal text-slate-400">
                {edlAltitudeKm >= 1 ? 'km' : 'm'}
              </span>
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Descent Speed</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {edlSpeedMS >= 10 ? Math.round(edlSpeedMS) : edlSpeedMS.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-slate-400">m/s</span>
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Heatshield Temp</p>
            <p
              className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                heatshieldTempC > 750 ? 'text-amber-400' : 'text-slate-100'
              }`}
            >
              {Math.round(heatshieldTempC)}
              <span className="ml-1 text-xs font-normal text-slate-400">°C</span>
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Parachute</p>
            <p
              className={`mt-1 font-mono text-sm font-semibold ${
                parachuteDeployed ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {parachuteDeployed ? 'DEPLOYED' : 'STOWED'}
            </p>
          </div>
        </section>

        {/* EDL Event Checklist */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <p className="font-display text-xs font-semibold tracking-wider text-slate-200">
            ENTRY & LANDING EVENTS
          </p>
          <div className="mt-2.5 space-y-1.5">
            {edlEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between gap-2 rounded border border-slate-800/80 bg-[#090D14] px-2.5 py-1.5 text-xs"
              >
                <span className={evt.status === 'pending' ? 'text-slate-500' : 'text-slate-100'}>
                  {evt.label}
                </span>
                <span
                  className={`shrink-0 font-mono text-[11px] ${
                    evt.status === 'confirmed'
                      ? 'text-emerald-400'
                      : evt.status === 'active'
                        ? 'text-amber-400'
                        : 'text-slate-600'
                  }`}
                >
                  {evt.status === 'confirmed'
                    ? 'CONFIRMED'
                    : evt.status === 'active'
                      ? 'ACTIVE'
                      : 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Mission Completion Card */}
        {isComplete && (
          <section className="rounded border border-emerald-500/60 bg-emerald-950/35 p-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold tracking-wider text-emerald-300">
                  MARS LANDING SUCCESSFUL
                </p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-emerald-200">
                  ROVER DEPLOYMENT COMPLETE
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-cyan-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  ALL SYSTEMS OPERATIONAL
                </p>
                <p className="mt-2 text-xs text-slate-300">
                  {roverConfiguration.roverId} ({roverConfiguration.totalMassKg} kg) is standing on
                  Jezero Crater soil with all Phase 1 subsystems intact.
                </p>

                <button
                  type="button"
                  onClick={proceedToPhase6Exploration}
                  className="mt-3.5 flex w-full items-center justify-center gap-2 rounded border border-emerald-400/60 bg-emerald-500 px-4 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  <Compass className="h-4 w-4" />
                  <span>CONTINUE TO MARS EXPLORATION</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={startMarsLanding}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Replay Entry & Landing
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
