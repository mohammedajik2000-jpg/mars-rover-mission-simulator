import React from 'react';
import { Lock, RotateCcw, X } from 'lucide-react';
import { MISSION_PHASES } from '../data/roverComponents';
import { useMission } from '../state/MissionContext';
import { AudioControlWidget } from './AudioControlWidget';

export const MissionNav: React.FC = () => {
  const {
    activePhase,
    setActivePhase,
    inspectedFuturePhase,
    setInspectedFuturePhase,
    resetMissionAssembly,
    roverConfiguration,
    installedCount,
    totalComponents,
    testComplete,
    startMachinePhase2,
    activationStage,
    proceedToPhase3Launch,
    launchStage,
    cruiseStage,
    proceedToPhase4Cruise,
    edlStage,
    proceedToPhase5Landing,
    explorationStarted,
    proceedToPhase6Exploration,
    explorationComplete,
    transmissionStage,
    proceedToPhase7Transmission,
  } = useMission();

  const inspectedPhaseData = inspectedFuturePhase
    ? MISSION_PHASES.find((p) => p.id === inspectedFuturePhase) ?? null
    : null;

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between gap-6 border-b border-slate-800 bg-[#090D14] px-5">
        <div className="font-display text-sm font-bold tracking-wider text-slate-100 whitespace-nowrap shrink-0">
          ARES-IV ROVER LAB
        </div>

        <nav
          aria-label="Mission Phases"
          className="hidden lg:flex items-center gap-1 overflow-x-auto"
        >
          {MISSION_PHASES.map((phase) => {
            const isCurrent = phase.id === activePhase;
            const isPhase2Unlocked = phase.id === 'phase2' && testComplete;
            const isPhase3Unlocked = phase.id === 'phase3' && activationStage === 'ready';
            const isPhase4Unlocked =
              phase.id === 'phase4' &&
              (launchStage === 'orbitSuccess' || cruiseStage !== 'idle');
            const isPhase5Unlocked =
              phase.id === 'phase5' &&
              (cruiseStage === 'arrival' || edlStage !== 'idle');
            const isPhase6Unlocked =
              phase.id === 'phase6' &&
              (edlStage === 'complete' || explorationStarted);
            const isPhase7Unlocked =
              phase.id === 'phase7' &&
              (explorationComplete || transmissionStage !== 'idle');
            const isUnlocked =
              phase.id === 'phase1' ||
              isPhase2Unlocked ||
              isPhase3Unlocked ||
              isPhase4Unlocked ||
              isPhase5Unlocked ||
              isPhase6Unlocked ||
              isPhase7Unlocked;

            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => {
                  if (phase.id === 'phase1') {
                    setInspectedFuturePhase(null);
                    setActivePhase('phase1');
                  } else if (phase.id === 'phase2' && testComplete) {
                    setInspectedFuturePhase(null);
                    if (activationStage === 'idle') {
                      startMachinePhase2();
                    } else {
                      setActivePhase('phase2');
                    }
                  } else if (phase.id === 'phase3' && activationStage === 'ready') {
                    proceedToPhase3Launch();
                  } else if (phase.id === 'phase4' && isPhase4Unlocked) {
                    setInspectedFuturePhase(null);
                    if (cruiseStage === 'idle') {
                      proceedToPhase4Cruise();
                    } else {
                      setActivePhase('phase4');
                    }
                  } else if (phase.id === 'phase5' && isPhase5Unlocked) {
                    setInspectedFuturePhase(null);
                    if (edlStage === 'idle') {
                      proceedToPhase5Landing();
                    } else {
                      setActivePhase('phase5');
                    }
                  } else if (phase.id === 'phase6' && isPhase6Unlocked) {
                    setInspectedFuturePhase(null);
                    if (!explorationStarted) {
                      proceedToPhase6Exploration();
                    } else {
                      setActivePhase('phase6');
                    }
                  } else if (phase.id === 'phase7' && isPhase7Unlocked) {
                    setInspectedFuturePhase(null);
                    if (transmissionStage === 'idle') {
                      proceedToPhase7Transmission();
                    } else {
                      setActivePhase('phase7');
                    }
                  } else {
                    setInspectedFuturePhase(phase.id);
                  }
                }}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'bg-cyan-500/15 text-cyan-300'
                    : isUnlocked
                      ? 'text-emerald-300 hover:bg-slate-800/70'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                }`}
              >
                <span className="font-mono text-[11px] tabular-nums">0{phase.number}</span>
                <span>{phase.shortTitle}</span>
                {!isUnlocked && (
                  <Lock className="h-3 w-3 text-slate-600" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Audio Controls & Reset Action */}
        <div className="flex items-center gap-2 shrink-0">
          <AudioControlWidget />
          <button
            type="button"
            onClick={resetMissionAssembly}
            className="flex items-center gap-1.5 rounded border border-slate-700 bg-[#111722] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Bay</span>
          </button>
        </div>
      </header>

      {/* Future Phase Briefing & Configuration State Modal */}
      {inspectedPhaseData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="phase-modal-title"
        >
          <div className="w-full max-w-lg rounded border border-slate-700 bg-[#0D121B] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-medium text-cyan-400">
                  PHASE 0{inspectedPhaseData.number} · SCHEDULED MISSION STAGE
                </p>
                <h2
                  id="phase-modal-title"
                  className="mt-1 font-display text-lg font-semibold text-slate-100"
                >
                  {inspectedPhaseData.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectedFuturePhase(null)}
                className="rounded border border-slate-800 p-1.5 text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-100"
                aria-label="Close phase briefing"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {inspectedPhaseData.summary}
            </p>

            <div className="mt-4 rounded border border-slate-800 bg-[#090D14] p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Phase Prerequisite</span>
                <span className="font-mono text-amber-400">
                  {inspectedPhaseData.prerequisites}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Assembly State</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {installedCount}/{totalComponents} Subsystems · {roverConfiguration.totalMassKg} kg
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">Systems Check Status</span>
                <span
                  className={`font-mono ${
                    roverConfiguration.systemsVerified ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {roverConfiguration.systemsVerified
                    ? 'Verified · Ready for Phase 2'
                    : 'Pending Phase 1 Verification'}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded border border-slate-800 bg-[#070A0F] p-3">
              <p className="font-mono text-[11px] text-slate-400">
                Saved Rover Configuration Payload (Ready for Phase 2–7 Handoff)
              </p>
              <pre className="eng-scroll mt-2 max-h-36 overflow-auto font-mono text-[11px] leading-relaxed text-cyan-300/90">
                {JSON.stringify(roverConfiguration, null, 2)}
              </pre>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedFuturePhase(null)}
                className="rounded border border-cyan-500/40 bg-cyan-500 px-4 py-2 font-display text-xs font-semibold tracking-wide text-slate-950 transition-colors hover:bg-cyan-400"
              >
                {activePhase === 'phase7'
                  ? 'Return to Data Transmission'
                  : activePhase === 'phase6'
                    ? 'Return to Mars Exploration'
                    : activePhase === 'phase5'
                      ? 'Return to Mars Landing'
                      : activePhase === 'phase4'
                        ? 'Return to Deep Space Cruise'
                        : 'Close Mission Briefing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
