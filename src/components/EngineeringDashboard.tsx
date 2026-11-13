import React from 'react';
import { useMission } from '../state/MissionContext';
import { ROVER_COMPONENTS } from '../data/roverComponents';
import { ComponentDetailsPanel } from './ComponentDetailsPanel';
import { SystemTestingPanel } from './SystemTestingPanel';
import { Phase2ActivationPanel } from './Phase2ActivationPanel';
import { Phase3LaunchPanel } from './Phase3LaunchPanel';
import { Phase4CruisePanel } from './Phase4CruisePanel';
import { Phase5LandingPanel } from './Phase5LandingPanel';
import { Phase6ExplorationPanel } from './Phase6ExplorationPanel';
import { Phase7TransmissionPanel } from './Phase7TransmissionPanel';

export const EngineeringDashboard: React.FC = () => {
  const {
    activePhase,
    installedComponents,
    installedCount,
    totalComponents,
    metrics,
    testComplete,
  } = useMission();

  if (activePhase === 'phase7') {
    return <Phase7TransmissionPanel />;
  }

  if (activePhase === 'phase6') {
    return <Phase6ExplorationPanel />;
  }

  if (activePhase === 'phase5') {
    return <Phase5LandingPanel />;
  }

  if (activePhase === 'phase4') {
    return <Phase4CruisePanel />;
  }

  if (activePhase === 'phase3') {
    return <Phase3LaunchPanel />;
  }

  if (activePhase === 'phase2') {
    return <Phase2ActivationPanel />;
  }

  const missionReadinessPct = testComplete
    ? 100
    : Math.round((installedCount / totalComponents) * 85);

  const netPowerColor =
    metrics.netPowerW > 0
      ? 'text-emerald-400'
      : metrics.netPowerW === 0
        ? 'text-slate-300'
        : 'text-amber-400';

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-[#0B0F17]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-slate-100">
            Component Details & Telemetry
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            ARES-IV Configuration & Verification
          </p>
        </div>
        <span
          className={`font-mono text-xs font-medium ${
            testComplete ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {testComplete ? '● Verified' : '◐ Assembly'}
        </span>
      </div>

      <div className="eng-scroll flex-1 overflow-y-auto">
        <ComponentDetailsPanel />

        <div className="space-y-4 p-4">
          {/* Mission Readiness Bar */}
          <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-slate-400">Mission Readiness</span>
              <span className="font-mono text-xl font-semibold text-slate-100 tabular-nums">
                {missionReadinessPct}
                <span className="ml-0.5 text-xs text-slate-400">%</span>
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-sm bg-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  testComplete ? 'bg-emerald-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${missionReadinessPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              {testComplete
                ? 'All hardware mounted and system diagnostics passed'
                : installedCount === totalComponents
                  ? 'Hardware complete · Awaiting Test Machine verification'
                  : 'Assemble all 7 subsystems to reach 85%, then run verification'}
            </p>
          </div>

          {/* Primary Quantitative Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
              <p className="text-[11px] text-slate-400">Total Rover Weight</p>
              <p className="mt-1 font-mono text-xl font-semibold text-slate-100 tabular-nums">
                {metrics.totalMassKg}
                <span className="ml-1 text-xs font-normal text-slate-400">kg</span>
              </p>
            </div>

            <div className="rounded border border-slate-800 bg-[#0E141F] p-3">
              <p className="text-[11px] text-slate-400">Battery Capacity</p>
              <p className="mt-1 font-mono text-xl font-semibold text-slate-100 tabular-nums">
                {metrics.batteryCapacityWh.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-slate-400">Wh</span>
              </p>
            </div>
          </div>

          {/* Subsystem Status Readout Table */}
          <div className="rounded border border-slate-800 bg-[#0E141F]">
            <div className="border-b border-slate-800 px-3 py-2">
              <span className="text-xs font-medium text-slate-300">Subsystem Status</span>
            </div>
            <div className="divide-y divide-slate-800/80 px-3">
              <div className="flex items-center justify-between py-2 text-xs">
                <span className="text-slate-400">Installed Components</span>
                <span className="font-mono font-medium text-slate-100 tabular-nums">
                  {installedCount} / {totalComponents}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 text-xs">
                <span className="text-slate-400">Power Status</span>
                <span className="font-mono font-medium text-slate-100">
                  {metrics.powerStatus}{' '}
                  <span className={`tabular-nums ${netPowerColor}`}>
                    ({metrics.netPowerW >= 0 ? `+${metrics.netPowerW}` : metrics.netPowerW} W)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between py-2 text-xs">
                <span className="text-slate-400">Wheel Status</span>
                <span
                  className={`font-mono text-[11px] font-medium ${
                    installedComponents.wheels ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {metrics.wheelStatus}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 text-xs">
                <span className="text-slate-400">Communication Status</span>
                <span
                  className={`font-mono text-[11px] font-medium ${
                    installedComponents.commAntenna ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {metrics.commStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Installed Hardware Manifest */}
          <div className="rounded border border-slate-800 bg-[#0E141F]">
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
              <span className="text-xs font-medium text-slate-300">Installed Manifest</span>
              <span className="font-mono text-[11px] text-slate-500">Base Chassis: 420 kg</span>
            </div>
            <div className="divide-y divide-slate-800/70 px-3">
              {ROVER_COMPONENTS.map((comp) => {
                const isMounted = installedComponents[comp.id];
                return (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between py-1.5 text-xs"
                  >
                    <span className={isMounted ? 'text-slate-200' : 'text-slate-500'}>
                      {isMounted ? '● ' : '○ '}
                      {comp.name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {isMounted ? `+${comp.massKg} kg` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Integrated Testing & Verification Console */}
        <SystemTestingPanel />
      </div>
    </aside>
  );
};
