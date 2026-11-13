import React from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Compass,
  Flame,
  Loader2,
  OctagonX,
  Power,
  Rocket,
  SatelliteDish,
  Wrench,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { COMPONENT_BY_ID } from '../data/roverComponents';
import { useMission } from '../state/MissionContext';

export const BottomInstallBar: React.FC = () => {
  const {
    activePhase,
    selectedComponentId,
    installedComponents,
    installingComponentId,
    installProgress,
    installComponent,
    testComplete,
    startMachinePhase2,
    activationStage,
    proceedToPhase3Launch,
    launchStage,
    startLaunchCountdown,
    proceedToPhase4Cruise,
    cruiseStage,
    cruiseProgressPct,
    proceedToPhase5Landing,
    edlStage,
    edlProgressPct,
    landingStatusText,
    proceedToPhase6Exploration,
    setDriveControl,
    stopRover,
    zoomCamera,
    exploreSpeedMS,
    explorationComplete,
    proceedToPhase7Transmission,
    transmissionStage,
    transmissionProgressPct,
    transmissionStatusMessage,
  } = useMission();

  const selectedSpec = COMPONENT_BY_ID[selectedComponentId];
  const isInstalled = installedComponents[selectedComponentId];
  const isInstallingThis = installingComponentId === selectedComponentId;
  const isAnyInstalling = installingComponentId !== null;

  if (activePhase === 'phase7') {
    return (
      <div className="shrink-0 border-t border-slate-800 bg-[#0B0F17] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-cyan-400">
              PHASE 07 · EARTH DEEP SPACE NETWORK DOWNLINK ({transmissionProgressPct.toFixed(0)}%)
            </p>
            <p className="mt-0.5 truncate font-display text-sm font-semibold text-slate-100">
              {transmissionStage === 'complete'
                ? 'MARS EXPLORATION MISSION COMPLETED · ALL TELEMETRY RECEIVED BY EARTH CONTROL'
                : transmissionStatusMessage}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {transmissionStage === 'complete' ? (
              <span className="inline-flex items-center gap-2 rounded border border-emerald-500/60 bg-emerald-500/15 px-4 py-2 font-display text-xs font-bold tracking-wider text-emerald-300">
                <Check className="h-4 w-4" />
                MISSION COMPLETED
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-mono text-xs text-cyan-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                TRANSMITTING TO EARTH...
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activePhase === 'phase6') {
    const holdProps = (dir: 'forward' | 'backward' | 'left' | 'right') => ({
      onPointerDown: () => setDriveControl(dir, true),
      onPointerUp: () => setDriveControl(dir, false),
      onPointerLeave: () => setDriveControl(dir, false),
      onPointerCancel: () => setDriveControl(dir, false),
    });

    return (
      <div className="shrink-0 border-t border-slate-800 bg-[#0B0F17] px-5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-cyan-400">
              PHASE 06 · MARS SURFACE DRIVE CONTROLS (WASD / ARROWS · DRAG CAMERA)
            </p>
            <p className="mt-0.5 font-display text-xs font-semibold text-slate-200">
              Hold controls or keyboard keys to steer · Speed:{' '}
              <span className="font-mono text-emerald-400 tabular-nums">
                {exploreSpeedMS.toFixed(2)} m/s
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              {...holdProps('left')}
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-3 py-2 font-mono text-xs font-semibold text-slate-100 select-none hover:border-cyan-500/50 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Turn Left
            </button>
            <button
              type="button"
              {...holdProps('forward')}
              className="flex items-center gap-1 rounded border border-cyan-500/50 bg-cyan-500/20 px-3.5 py-2 font-mono text-xs font-semibold text-cyan-200 select-none hover:bg-cyan-500/35 active:bg-cyan-400 active:text-slate-950"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Forward
            </button>
            <button
              type="button"
              {...holdProps('backward')}
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-3 py-2 font-mono text-xs font-semibold text-slate-100 select-none hover:border-cyan-500/50 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Reverse
            </button>
            <button
              type="button"
              {...holdProps('right')}
              className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-3 py-2 font-mono text-xs font-semibold text-slate-100 select-none hover:border-cyan-500/50 hover:bg-slate-700 active:bg-cyan-500 active:text-slate-950"
            >
              Turn Right
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={stopRover}
              className="flex items-center gap-1 rounded border border-rose-500/60 bg-rose-500/20 px-3 py-2 font-mono text-xs font-semibold text-rose-200 hover:bg-rose-500/35"
            >
              <OctagonX className="h-3.5 w-3.5" />
              Stop
            </button>

            <div className="ml-1 flex items-center gap-1 border-l border-slate-700 pl-2">
              <button
                type="button"
                onClick={() => zoomCamera(-1.4)}
                aria-label="Zoom In"
                className="flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2.5 py-2 font-mono text-xs text-slate-200 hover:border-cyan-500/50"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => zoomCamera(1.4)}
                aria-label="Zoom Out"
                className="flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2.5 py-2 font-mono text-xs text-slate-200 hover:border-cyan-500/50"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
            </div>

            {explorationComplete && (
              <button
                type="button"
                onClick={proceedToPhase7Transmission}
                className="ml-1 flex items-center gap-1.5 rounded border border-emerald-400/60 bg-emerald-500 px-3.5 py-2 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-emerald-400 whitespace-nowrap"
              >
                <SatelliteDish className="h-3.5 w-3.5" />
                <span>TRANSMIT DATA</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activePhase === 'phase5') {
    return (
      <div className="shrink-0 border-t border-slate-800 bg-[#0B0F17] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-amber-400">
              PHASE 05 · MARS ENTRY, DESCENT & LANDING ({edlProgressPct.toFixed(1)}%)
            </p>
            <p className="mt-0.5 truncate font-display text-sm font-semibold text-slate-100">
              {edlStage === 'complete'
                ? 'MARS LANDING SUCCESSFUL · ROVER DEPLOYMENT COMPLETE · ALL SYSTEMS OPERATIONAL'
                : landingStatusText}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {edlStage === 'complete' ? (
              <button
                type="button"
                onClick={proceedToPhase6Exploration}
                className="flex items-center gap-2 rounded border border-emerald-400/60 bg-emerald-500 px-5 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-emerald-400 whitespace-nowrap"
              >
                <Compass className="h-4 w-4" />
                <span>CONTINUE TO MARS EXPLORATION</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-mono text-xs text-amber-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                EDL SEQUENCE IN PROGRESS...
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activePhase === 'phase4') {
    const cruiseLabels: Record<string, string> = {
      idle: 'Cruise stage standby in Earth departure orbit',
      departure: 'Earth departure confirmed · Leaving Earth orbit',
      transfer: 'Trans-Mars cruise trajectory nominal',
      midcourse: 'Heliocentric deep-space transfer in progress',
      marsDetected: 'Mars optical navigation lock acquired',
      approach: 'Mars approach initiated · Closing on Red Planet',
      arrival: 'MARS APPROACH ESTABLISHED · READY FOR ENTRY & LANDING',
    };

    return (
      <div className="shrink-0 border-t border-slate-800 bg-[#0B0F17] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-cyan-400">
              PHASE 04 · DEEP SPACE JOURNEY ({cruiseProgressPct.toFixed(1)}%)
            </p>
            <p className="mt-0.5 truncate font-display text-sm font-semibold text-slate-100">
              {cruiseLabels[cruiseStage] ?? 'Deep space cruise active'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {cruiseStage === 'arrival' ? (
              <button
                type="button"
                onClick={proceedToPhase5Landing}
                className="flex items-center gap-2 rounded border border-emerald-400/60 bg-emerald-500 px-5 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-emerald-400 whitespace-nowrap"
              >
                <Compass className="h-4 w-4" />
                <span>CONTINUE TO MARS LANDING</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-mono text-xs text-cyan-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                TRANSIT TO MARS IN PROGRESS...
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activePhase === 'phase3') {
    const launchLabels: Record<string, string> = {
      pad: 'Launch vehicle fueled on Pad 41 · Rover encapsulated inside fairing',
      countdown: 'Terminal 10-second countdown sequence active',
      ignition: 'Main engine ignition · Hold-down release imminent',
      liftoff: 'Liftoff confirmed · Clearing launch tower',
      stageSep: 'First stage booster separated · Upper stage burn nominal',
      fairingSep: 'Payload fairing jettisoned · Rover exposed to orbit',
      spacecraftSep: 'Spacecraft separation in progress',
      orbitSuccess: 'LAUNCH SUCCESS · ARES-IV IN EARTH PARKING ORBIT',
    };

    return (
      <div className="shrink-0 border-t border-slate-800 bg-[#0B0F17] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-cyan-400">
              PHASE 03 · EARTH LAUNCH COMPLEX 41
            </p>
            <p className="mt-0.5 truncate font-display text-sm font-semibold text-slate-100">
              {launchLabels[launchStage]}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {launchStage === 'pad' ? (
              <button
                type="button"
                onClick={startLaunchCountdown}
                className="flex items-center gap-2 rounded border border-amber-400/60 bg-amber-500 px-5 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap"
              >
                <Flame className="h-4 w-4" />
                START 10-SECOND COUNTDOWN
              </button>
            ) : launchStage === 'orbitSuccess' ? (
              <button
                type="button"
                onClick={proceedToPhase4Cruise}
                className="flex items-center gap-2 rounded border border-emerald-400/60 bg-emerald-500 px-5 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-emerald-400 whitespace-nowrap"
              >
                <Rocket className="h-4 w-4" />
                <span>CONTINUE TO PHASE 4 – DEEP SPACE JOURNEY</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-mono text-xs text-amber-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ASCENT IN PROGRESS...
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activePhase === 'phase2') {
    const stageLabels: Record<string, string> = {
      idle: 'Ready to initiate startup sequence',
      power: 'Sequence 1: Power Activation in progress',
      mechanical: 'Sequence 2: Mechanical Activation in progress',
      diagnostics: 'Sequence 3: System Diagnostics running',
      ready: 'Sequence 4: ALL SYSTEMS OPERATIONAL · READY FOR LAUNCH',
    };

    return (
      <div className="shrink-0 border-t border-slate-800 bg-[#0B0F17] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-cyan-400">
              PHASE 02 · MACHINE ACTIVATION CONTROL
            </p>
            <p className="mt-0.5 truncate font-display text-sm font-semibold text-slate-100">
              {stageLabels[activationStage]}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activationStage === 'ready' ? (
              <button
                type="button"
                onClick={proceedToPhase3Launch}
                className="flex items-center gap-2 rounded border border-emerald-400/60 bg-emerald-500 px-5 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-emerald-400 whitespace-nowrap"
              >
                <Rocket className="h-4 w-4" />
                PROCEED TO LAUNCH
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-mono text-xs text-amber-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ACTIVATING SYSTEMS...
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-slate-800 bg-[#0B0F17] px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Selected Component Identification */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[11px] font-medium text-slate-400">
              SELECTED COMPONENT:
            </span>
            <span className="font-display text-sm font-semibold text-cyan-300">
              {selectedSpec.name}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
              {selectedSpec.mountLocation}
            </span>
          </div>

          {/* Smooth Installation Progress Indicator */}
          {isInstallingThis ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${installProgress}%` }}
                />
              </div>
              <span className="font-mono text-xs text-amber-400 tabular-nums">
                {installProgress}%
              </span>
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-slate-400">
              {isInstalled
                ? 'Hardware mounted and secured to rover chassis.'
                : 'Click INSTALL ON ROVER to mount this subsystem onto the highlighted hardpoint.'}
            </p>
          )}
        </div>

        {/* Dedicated Explicit Install / Phase 2 Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={isInstalled || isAnyInstalling}
            onClick={() => installComponent(selectedSpec.id)}
            className={`flex items-center gap-2 rounded px-5 py-2.5 font-display text-xs font-bold tracking-wider transition-colors whitespace-nowrap ${
              isInstalled
                ? 'cursor-default border border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : isAnyInstalling
                  ? 'cursor-wait border border-amber-500/40 bg-amber-500/15 text-amber-300'
                  : 'border border-cyan-400/60 bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:bg-cyan-300'
            }`}
          >
            {isInstalled ? (
              <>
                <Check className="h-4 w-4" />
                INSTALLED ON ROVER
              </>
            ) : isInstallingThis ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                INSTALLING ({installProgress}%)
              </>
            ) : isAnyInstalling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                MOUNTING...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4" />
                INSTALL ON ROVER
              </>
            )}
          </button>

          {testComplete && (
            <button
              type="button"
              onClick={startMachinePhase2}
              className="flex items-center gap-2 rounded border border-amber-400/60 bg-amber-500 px-5 py-2.5 font-display text-xs font-bold tracking-wider text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap"
            >
              <Power className="h-4 w-4" />
              START MACHINE
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
