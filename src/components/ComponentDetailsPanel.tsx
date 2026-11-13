import React from 'react';
import { Crosshair } from 'lucide-react';
import { COMPONENT_BY_ID } from '../data/roverComponents';
import { useMission } from '../state/MissionContext';
import { ComponentSchematic } from './ComponentSchematic';

export const ComponentDetailsPanel: React.FC = () => {
  const {
    selectedComponentId,
    focusOnComponent,
    installedComponents,
    installingComponentId,
    installProgress,
  } = useMission();

  const spec = COMPONENT_BY_ID[selectedComponentId];
  const isInstalled = installedComponents[selectedComponentId];
  const isInstalling = installingComponentId === selectedComponentId;

  const powerSummary =
    spec.powerGenW > 0 && spec.batteryWh > 0
      ? `+${spec.powerGenW} W / ${spec.batteryWh.toLocaleString()} Wh`
      : spec.powerGenW > 0
        ? `+${spec.powerGenW} W Generation`
        : `${spec.powerDrawW} W Draw`;

  return (
    <div className="border-b border-slate-800 bg-[#0D131E] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-medium text-cyan-400">{spec.code}</span>
            <span aria-hidden="true" className="text-slate-600">
              /
            </span>
            <span
              className={`font-mono font-medium ${
                isInstalled
                  ? 'text-emerald-400'
                  : isInstalling
                    ? 'text-amber-400'
                    : 'text-slate-300'
              }`}
            >
              {isInstalled
                ? 'Installed'
                : isInstalling
                  ? `Installing (${installProgress}%)`
                  : 'Not Installed'}
            </span>
          </div>
          <h3 className="mt-1 font-display text-base font-semibold text-slate-100">
            {spec.name}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => focusOnComponent(spec.id)}
          title="Focus 3D camera on mount location"
          className="shrink-0 rounded border border-slate-700 bg-slate-800/70 p-1.5 text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
        >
          <Crosshair className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Component Blueprint Preview */}
      <div className="mt-2.5">
        <ComponentSchematic componentId={spec.id} installed={isInstalled} />
      </div>

      {/* Purpose */}
      <div className="mt-2.5">
        <p className="text-[11px] font-medium text-slate-400">Purpose</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{spec.description}</p>
      </div>

      {/* Specifications & Power Requirements */}
      <div className="mt-3 divide-y divide-slate-800/80 border-y border-slate-800/80">
        <div className="flex items-center justify-between py-1.5 text-xs">
          <span className="text-slate-400">Power Requirement</span>
          <span className="font-mono font-medium text-cyan-300 tabular-nums">{powerSummary}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 text-xs">
          <span className="text-slate-400">Component Mass</span>
          <span className="font-mono font-medium text-slate-200 tabular-nums">
            {spec.massKg} kg
          </span>
        </div>
        <div className="flex items-center justify-between py-1.5 text-xs">
          <span className="text-slate-400">Mount Zone</span>
          <span className="font-mono text-[11px] text-slate-300">{spec.mountLocation}</span>
        </div>
        {spec.specs.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1.5 text-xs">
            <span className="text-slate-400">{row.label}</span>
            <span className="font-mono font-medium text-slate-200 tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
