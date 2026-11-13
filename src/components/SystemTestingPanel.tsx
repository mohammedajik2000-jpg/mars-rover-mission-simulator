import React from 'react';
import { Activity, CheckCircle2, Loader2, Power, ShieldCheck } from 'lucide-react';
import { useMission } from '../state/MissionContext';

export const SystemTestingPanel: React.FC = () => {
  const {
    allInstalled,
    installedCount,
    totalComponents,
    checks,
    isTesting,
    testComplete,
    runSystemChecks,
    startMachinePhase2,
  } = useMission();

  return (
    <div className="border-t border-slate-800 bg-[#0D131E] p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-wide text-slate-100">
            Systems Verification
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {allInstalled
              ? 'All subsystems mounted · Ready for diagnostics'
              : `Mount ${totalComponents - installedCount} remaining subsystem${totalComponents - installedCount === 1 ? '' : 's'} to unlock`}
          </p>
        </div>
      </div>

      {/* TEST MACHINE Trigger */}
      <button
        type="button"
        disabled={!allInstalled || isTesting}
        onClick={runSystemChecks}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded px-4 py-2.5 font-display text-xs font-semibold tracking-wider transition-colors ${
          !allInstalled
            ? 'cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500'
            : isTesting
              ? 'cursor-wait border border-amber-500/40 bg-amber-500/15 text-amber-300'
              : testComplete
                ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                : 'border border-amber-400/60 bg-amber-500 text-slate-950 hover:bg-amber-400'
        }`}
      >
        {isTesting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            RUNNING DIAGNOSTICS...
          </>
        ) : testComplete ? (
          <>
            <ShieldCheck className="h-4 w-4" />
            RE-RUN TEST MACHINE
          </>
        ) : (
          <>
            <Activity className="h-4 w-4" />
            TEST MACHINE
          </>
        )}
      </button>

      {/* Individual System Check Progress Rows */}
      {(isTesting || testComplete || allInstalled) && (
        <div className="mt-3 space-y-2">
          {checks.map((chk) => (
            <div key={chk.id} className="rounded border border-slate-800/90 bg-[#0A0E16] px-2.5 py-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-slate-200">{chk.name}</span>
                <span
                  className={`shrink-0 font-mono text-[11px] tabular-nums ${
                    chk.status === 'passed'
                      ? 'text-emerald-400'
                      : chk.status === 'running'
                        ? 'text-amber-400'
                        : 'text-slate-500'
                  }`}
                >
                  {chk.status === 'passed'
                    ? 'PASS 100%'
                    : chk.status === 'running'
                      ? `${chk.progress}%`
                      : 'READY'}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-sm bg-slate-800">
                <div
                  className={`h-full transition-all duration-75 ${
                    chk.status === 'passed'
                      ? 'bg-emerald-400'
                      : chk.status === 'running'
                        ? 'bg-amber-400'
                        : 'bg-slate-700'
                  }`}
                  style={{ width: `${chk.progress}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>{chk.protocol}</span>
                <span className="font-mono text-slate-400">{chk.reading}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Final Mission-Ready Confirmation Banner + START MACHINE */}
      {testComplete && (
        <div className="mt-3 rounded border border-emerald-500/50 bg-emerald-950/30 p-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs font-bold tracking-wider text-emerald-300">
                SYSTEMS CHECK COMPLETE
              </p>
              <p className="mt-0.5 font-display text-xs font-semibold tracking-wide text-slate-100">
                ROVER READY FOR MISSION
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Proceed to Phase 2 Machine Activation sequence.
              </p>
              <button
                type="button"
                onClick={startMachinePhase2}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded border border-amber-400/60 bg-amber-500 px-3 py-2 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-amber-400"
              >
                <Power className="h-3.5 w-3.5" />
                START MACHINE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
