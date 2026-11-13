import React from 'react';
import { ArrowRight, CheckCircle2, Compass, Loader2, Radio, RotateCcw } from 'lucide-react';
import { useMission } from '../state/MissionContext';

function formatElapsedMet(hoursTotal: number): string {
  const days = Math.floor(hoursTotal / 24);
  const hours = hoursTotal % 24;
  return `MET ${String(days).padStart(3, '0')}d ${String(hours).padStart(2, '0')}h`;
}

export const Phase4CruisePanel: React.FC = () => {
  const {
    cruiseStage,
    cruiseProgressPct,
    distanceTravelledMKm,
    remainingDistanceMKm,
    spacecraftSpeedKmS,
    cruiseElapsedHours,
    commStatus,
    cruiseEvents,
    startDeepSpaceCruise,
    setActivePhase,
    proceedToPhase5Landing,
    metrics,
    roverConfiguration,
  } = useMission();

  const isArrival = cruiseStage === 'arrival';

  const stageLabelMap: Record<string, string> = {
    idle: 'STANDBY',
    departure: 'EARTH DEPARTURE',
    transfer: 'TRANS-MARS INJECTION',
    midcourse: 'HELIOCENTRIC CRUISE',
    marsDetected: 'MARS ACQUIRED',
    approach: 'MARS APPROACH',
    arrival: 'MARS ARRIVAL',
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-[#0B0F17]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-slate-100">
            Phase 4 · Deep Space Journey
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Mission: Earth to Mars · {roverConfiguration.roverId}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActivePhase('phase3')}
          className="rounded border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          Back
        </button>
      </div>

      <div className="eng-scroll flex-1 space-y-4 overflow-y-auto p-4">
        {/* Transfer Progress & Mission Clock */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Mission: Earth to Mars</span>
            <span
              className={`font-mono text-xs font-semibold ${
                isArrival ? 'text-emerald-400' : 'text-cyan-400'
              }`}
            >
              {stageLabelMap[cruiseStage] ?? cruiseStage.toUpperCase()}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <p className="font-mono text-2xl font-bold tracking-tight text-slate-100 tabular-nums">
              {cruiseProgressPct.toFixed(1)}
              <span className="ml-0.5 text-xs font-normal text-slate-400">%</span>
            </p>
            <p className="font-mono text-xs font-medium text-slate-300 tabular-nums">
              {formatElapsedMet(cruiseElapsedHours)}
            </p>
          </div>

          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-sm bg-slate-800">
            <div
              className={`h-full transition-all duration-150 ${
                isArrival ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, cruiseProgressPct)}%` }}
            />
          </div>

          {!isArrival && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>CRUISE TELEMETRY ACTIVE</span>
            </div>
          )}
        </section>

        {/* Live Deep Space Telemetry Grid */}
        <section className="grid grid-cols-2 gap-2.5">
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Distance Travelled</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {distanceTravelledMKm.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-slate-400">M km</span>
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Remaining Distance</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {remainingDistanceMKm.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-slate-400">M km</span>
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Spacecraft Speed</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {spacecraftSpeedKmS.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-slate-400">km/s</span>
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <p className="text-[11px] text-slate-400">Battery Status</p>
            <p className="mt-1 font-mono text-sm font-semibold text-emerald-400 tabular-nums">
              {metrics.batteryCapacityWh.toLocaleString()} Wh · 98.4%
            </p>
          </div>
        </section>

        {/* Communication Link Status */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Radio className="h-3.5 w-3.5 text-cyan-400" />
              Communication Status
            </span>
            <span className="font-mono text-[11px] font-medium text-emerald-400">NOMINAL</span>
          </div>
          <p className="mt-1.5 font-mono text-xs text-slate-200 tabular-nums">{commStatus}</p>
        </section>

        {/* Mission Events Progression */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <p className="font-display text-xs font-semibold tracking-wider text-slate-200">
            MISSION EVENTS
          </p>
          <div className="mt-2.5 space-y-1.5">
            {cruiseEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between gap-2 rounded border border-slate-800/80 bg-[#090D14] px-2.5 py-1.5 text-xs"
              >
                <span
                  className={
                    evt.status === 'pending' ? 'text-slate-500' : 'text-slate-100'
                  }
                >
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

        {/* Final Mars Arrival + Continue to Mars Landing */}
        {isArrival && (
          <section className="rounded border border-emerald-500/60 bg-emerald-950/35 p-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold tracking-wider text-emerald-300">
                  MARS APPROACH ESTABLISHED
                </p>
                <p className="mt-1 text-xs text-slate-200">
                  ARES-IV has completed its 480.0 M km interplanetary transfer and is aligned for
                  Martian atmospheric entry.
                </p>

                <button
                  type="button"
                  onClick={proceedToPhase5Landing}
                  className="mt-3.5 flex w-full items-center justify-center gap-2 rounded border border-emerald-400/60 bg-emerald-500 px-4 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  <Compass className="h-4 w-4" />
                  <span>CONTINUE TO MARS LANDING</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={startDeepSpaceCruise}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Replay Deep Space Cruise
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
