import React from 'react';
import {
  CheckCircle2,
  Cpu,
  Lightbulb,
  Loader2,
  Rocket,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useMission } from '../state/MissionContext';

export const Phase2ActivationPanel: React.FC = () => {
  const {
    activationStage,
    powerLevelPct,
    busVoltage,
    lightsOn,
    computerOnline,
    mechanicalProgressPct,
    mechanicalSubstep,
    mechSteps,
    phase2Diagnostics,
    restartActivation,
    setActivePhase,
    proceedToPhase3Launch,
  } = useMission();

  const passedDiagCount = phase2Diagnostics.filter((d) => d.status === 'passed').length;

  const isPowerDone = activationStage !== 'idle' && activationStage !== 'power';
  const isMechDone = activationStage === 'diagnostics' || activationStage === 'ready';
  const isReady = activationStage === 'ready';

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-[#0B0F17]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-slate-100">
            Phase 2 · Machine Activation
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Mission Control Startup & Diagnostics
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActivePhase('phase1')}
          className="rounded border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          Back to Bay
        </button>
      </div>

      <div className="eng-scroll flex-1 space-y-4 overflow-y-auto p-4">
        {/* SEQUENCE 1: POWER ACTIVATION */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <h3 className="font-display text-xs font-semibold tracking-wider text-slate-100">
                SEQUENCE 1 · POWER ACTIVATION
              </h3>
            </div>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                isPowerDone ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isPowerDone ? 'ONLINE' : `${powerLevelPct}%`}
            </span>
          </div>

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-sm bg-slate-800">
            <div
              className={`h-full transition-all duration-75 ${
                isPowerDone ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              style={{ width: `${powerLevelPct}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded border border-slate-800 bg-[#090D14] p-2">
              <span className="block text-[10px] text-slate-500">Bus Voltage</span>
              <span className="mt-0.5 block font-mono font-semibold text-slate-100 tabular-nums">
                {busVoltage.toFixed(1)} V
              </span>
            </div>
            <div className="rounded border border-slate-800 bg-[#090D14] p-2">
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <Lightbulb className="h-3 w-3" />
                Lights
              </span>
              <span
                className={`mt-0.5 block font-mono font-semibold ${
                  lightsOn ? 'text-cyan-400' : 'text-slate-500'
                }`}
              >
                {lightsOn ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="rounded border border-slate-800 bg-[#090D14] p-2">
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <Cpu className="h-3 w-3" />
                Computer
              </span>
              <span
                className={`mt-0.5 block font-mono font-semibold ${
                  computerOnline ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {computerOnline ? 'BOOTED' : 'INIT'}
              </span>
            </div>
          </div>
        </section>

        {/* SEQUENCE 2: MECHANICAL ACTIVATION */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xs font-semibold tracking-wider text-slate-100">
              SEQUENCE 2 · MECHANICAL ACTIVATION
            </h3>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                isMechDone
                  ? 'text-emerald-400'
                  : activationStage === 'mechanical'
                    ? 'text-amber-400'
                    : 'text-slate-500'
              }`}
            >
              {isMechDone ? 'COMPLETE' : `${mechanicalProgressPct}%`}
            </span>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-slate-800">
            <div
              className={`h-full transition-all duration-75 ${
                isMechDone ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${mechanicalProgressPct}%` }}
            />
          </div>

          <p className="mt-2 font-mono text-[11px] text-slate-300">{mechanicalSubstep}</p>

          <div className="mt-2.5 space-y-1.5">
            {mechSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between rounded border border-slate-800/80 bg-[#090D14] px-2.5 py-1.5 text-[11px]"
              >
                <span className="truncate text-slate-300">{step.label}</span>
                <span
                  className={`shrink-0 font-mono font-medium ${
                    step.status === 'passed'
                      ? 'text-emerald-400'
                      : step.status === 'running'
                        ? 'text-amber-400'
                        : 'text-slate-500'
                  }`}
                >
                  {step.status === 'passed'
                    ? 'ACTIVE · PASS'
                    : step.status === 'running'
                      ? 'ACTIVATING'
                      : 'STANDBY'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* SEQUENCE 3: SYSTEM DIAGNOSTICS */}
        <section className="rounded border border-slate-800 bg-[#0E141F] p-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xs font-semibold tracking-wider text-slate-100">
              SEQUENCE 3 · SYSTEM DIAGNOSTICS
            </h3>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {passedDiagCount === phase2Diagnostics.length
                ? '6 PASS / 0 FAIL'
                : `${passedDiagCount}/6 PASS`}
            </span>
          </div>

          <div className="mt-2.5 space-y-2">
            {phase2Diagnostics.map((item) => (
              <div
                key={item.id}
                className="rounded border border-slate-800/90 bg-[#090D14] px-2.5 py-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{item.label}</span>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      item.status === 'passed'
                        ? 'text-emerald-400'
                        : item.status === 'running'
                          ? 'text-amber-400'
                          : 'text-slate-500'
                    }`}
                  >
                    {item.status === 'passed'
                      ? 'PASS'
                      : item.status === 'running'
                        ? `${item.progress}%`
                        : 'WAIT'}
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-sm bg-slate-800">
                  <div
                    className={`h-full transition-all duration-75 ${
                      item.status === 'passed'
                        ? 'bg-emerald-400'
                        : item.status === 'running'
                          ? 'bg-amber-400'
                          : 'bg-slate-700'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-400">{item.metric}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SEQUENCE 4: MISSION READY */}
        {isReady ? (
          <section className="rounded border border-emerald-500/60 bg-emerald-950/35 p-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold tracking-wider text-emerald-300">
                  ALL SYSTEMS OPERATIONAL
                </p>
                <div className="mt-2 space-y-1 font-mono text-xs">
                  <p className="text-slate-100">ROVER STATUS: READY</p>
                  <p className="text-cyan-300">MISSION STATUS: READY FOR LAUNCH</p>
                </div>

                <button
                  type="button"
                  onClick={proceedToPhase3Launch}
                  className="mt-3.5 flex w-full items-center justify-center gap-2 rounded border border-emerald-400/60 bg-emerald-500 px-4 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  <Rocket className="h-4 w-4" />
                  PROCEED TO LAUNCH
                </button>

                <button
                  type="button"
                  onClick={restartActivation}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Replay Activation Sequence
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded border border-slate-800 bg-[#0E141F] px-3 py-2.5 font-mono text-xs text-amber-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Executing Phase 2 Startup Sequence...</span>
          </div>
        )}
      </div>
    </aside>
  );
};
