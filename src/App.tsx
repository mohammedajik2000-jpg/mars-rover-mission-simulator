import React, { useState } from 'react';
import { MissionProvider, useMission } from './state/MissionContext';
import { MissionNav } from './components/MissionNav';
import { ComponentPanel } from './components/ComponentPanel';
import { EngineeringDashboard } from './components/EngineeringDashboard';
import { RoverViewport } from './three/RoverViewport';
import { ViewportControlsBar } from './components/ViewportControlsBar';
import { BottomInstallBar } from './components/BottomInstallBar';
import { COMPONENT_BY_ID } from './data/roverComponents';

type MobileTab = 'viewport' | 'components' | 'dashboard';

const SimulatorShell: React.FC = () => {
  const [zenMode, setZenMode] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('viewport');
  const {
    activePhase,
    selectedComponentId,
    installedComponents,
    installingComponentId,
    installProgress,
    activationStage,
    launchStage,
    cruiseStage,
    edlStage,
    explorationComplete,
    exploreDistanceM,
    transmissionStage,
    transmissionProgressPct,
  } = useMission();

  const selectedSpec = COMPONENT_BY_ID[selectedComponentId];
  const isMounted = installedComponents[selectedComponentId];
  const isInstalling = installingComponentId === selectedComponentId;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#07090E] text-slate-100">
      <MissionNav />

      {/* Mobile View Switcher (visible below lg) */}
      <div className="flex border-b border-slate-800 bg-[#0B0F17] p-1 lg:hidden">
        {(
          [
            {
              id: 'viewport',
              label:
                activePhase === 'phase7'
                  ? '3D Earth Link'
                  : activePhase === 'phase6'
                    ? '3D Mars Surface'
                    : activePhase === 'phase5'
                      ? '3D Mars EDL'
                      : activePhase === 'phase4'
                        ? '3D Space'
                        : activePhase === 'phase3'
                          ? '3D Launch'
                          : '3D Rover',
            },
            { id: 'components', label: 'Library' },
            {
              id: 'dashboard',
              label:
                activePhase === 'phase7'
                  ? 'Report'
                  : activePhase === 'phase6'
                    ? 'Science & Nav'
                    : activePhase === 'phase5'
                      ? 'Landing'
                      : activePhase === 'phase4'
                        ? 'Cruise'
                        : activePhase === 'phase3'
                          ? 'Launch'
                          : activePhase === 'phase2'
                            ? 'Activation'
                            : 'Details & Test',
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
              mobileTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Three-Section Engineering Console */}
      <main className="flex min-h-0 flex-1">
        {/* LEFT PANEL: Component Library (Hidden in Phase 3–7 for full mission focus) */}
        {!zenMode &&
          activePhase !== 'phase3' &&
          activePhase !== 'phase4' &&
          activePhase !== 'phase5' &&
          activePhase !== 'phase6' &&
          activePhase !== 'phase7' && (
          <div
            className={`${
              mobileTab === 'components' ? 'flex w-full' : 'hidden'
            } lg:flex lg:w-[300px] xl:w-[320px] shrink-0 min-h-0`}
          >
            <ComponentPanel />
          </div>
        )}

        {/* CENTER STAGE: 3D Viewport + Separate Bottom Installation/Launch Area */}
        <section
          aria-label="3D Mars Rover Viewport"
          className={`${
            mobileTab === 'viewport' ? 'flex' : 'hidden'
          } lg:flex min-w-0 flex-1 flex-col bg-[#07090E]`}
        >
          <div className="relative min-h-0 flex-1">
            {/* Minimalist Top-Left Viewport Context Caption */}
            <div className="pointer-events-none absolute top-4 left-4 z-10">
              <p className="font-mono text-[11px] font-medium tracking-wider text-slate-200/90 drop-shadow">
                {activePhase === 'phase7'
                  ? 'PHASE 07 · MARS-TO-EARTH DEEP SPACE TELEMETRY DOWNLINK'
                  : activePhase === 'phase6'
                    ? 'PHASE 06 · JEZERO CRATER · INTERACTIVE MARS SURFACE EXPLORATION'
                    : activePhase === 'phase5'
                      ? 'PHASE 05 · JEZERO CRATER · MARS ENTRY, DESCENT & ROVER DEPLOYMENT'
                      : activePhase === 'phase4'
                        ? 'PHASE 04 · EARTH-TO-MARS TRANSFER · DEEP SPACE CRUISE'
                        : activePhase === 'phase3'
                          ? 'PHASE 03 · EARTH SPACE LAUNCH COMPLEX 41 · VEHICLE ASCENT'
                          : activePhase === 'phase2'
                            ? 'PHASE 02 · EARTH ENGINEERING LAB · MACHINE ACTIVATION'
                            : 'PHASE 01 · EARTH ENGINEERING LAB · DRAG TO ROTATE / SCROLL TO ZOOM'}
              </p>
              <p className="mt-1 font-display text-sm font-semibold text-white drop-shadow">
                {activePhase === 'phase7' ? (
                  <>
                    ARES-IV High-Gain Downlink{' '}
                    <span className="font-mono text-xs font-normal text-emerald-300">
                      ·{' '}
                      {transmissionStage === 'complete'
                        ? 'MISSION COMPLETED'
                        : `${transmissionProgressPct.toFixed(0)}% TRANSMITTED`}
                    </span>
                  </>
                ) : activePhase === 'phase6' ? (
                  <>
                    ARES-IV Surface Rover{' '}
                    <span className="font-mono text-xs font-normal text-cyan-300">
                      · {explorationComplete ? 'MISSION COMPLETE' : `Traverse ${exploreDistanceM.toFixed(1)} m`}
                    </span>
                  </>
                ) : activePhase === 'phase5' ? (
                  <>
                    ARES-IV Mars Lander{' '}
                    <span className="font-mono text-xs font-normal text-amber-300">
                      · Stage: {edlStage.toUpperCase()}
                    </span>
                  </>
                ) : activePhase === 'phase4' ? (
                  <>
                    ARES-IV Cruise Spacecraft{' '}
                    <span className="font-mono text-xs font-normal text-cyan-300">
                      · Stage: {cruiseStage.toUpperCase()}
                    </span>
                  </>
                ) : activePhase === 'phase3' ? (
                  <>
                    ARES-IV Launch Vehicle{' '}
                    <span className="font-mono text-xs font-normal text-amber-300">
                      · Stage: {launchStage.toUpperCase()}
                    </span>
                  </>
                ) : activePhase === 'phase2' ? (
                  <>
                    ARES-IV Rover{' '}
                    <span className="font-mono text-xs font-normal text-amber-300">
                      ·{' '}
                      {activationStage === 'ready'
                        ? 'ALL SYSTEMS OPERATIONAL'
                        : `Sequence: ${activationStage.toUpperCase()}`}
                    </span>
                  </>
                ) : (
                  <>
                    {selectedSpec.name}{' '}
                    <span className="font-mono text-xs font-normal text-cyan-300">
                      {isMounted
                        ? '· Installed'
                        : isInstalling
                          ? `· Installing ${installProgress}%`
                          : '· Mount Position Highlighted'}
                    </span>
                  </>
                )}
              </p>
            </div>

            <RoverViewport />

            {activePhase !== 'phase3' &&
              activePhase !== 'phase4' &&
              activePhase !== 'phase5' &&
              activePhase !== 'phase6' &&
              activePhase !== 'phase7' && (
              <ViewportControlsBar
                zenMode={zenMode}
                onToggleZenMode={() => setZenMode((prev) => !prev)}
              />
            )}
          </div>

          {/* Dedicated Separate Bottom Installation / Launch Bar */}
          <BottomInstallBar />
        </section>

        {/* RIGHT PANEL: Component Details, Engineering Telemetry & Phase 2 Activation */}
        {!zenMode && (
          <div
            className={`${
              mobileTab === 'dashboard' ? 'flex w-full' : 'hidden'
            } lg:flex lg:w-[345px] xl:w-[370px] shrink-0 min-h-0`}
          >
            <EngineeringDashboard />
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <MissionProvider>
      <SimulatorShell />
    </MissionProvider>
  );
}
