import React from 'react';
import {
  BatteryCharging,
  Check,
  Cog,
  Disc,
  Eye,
  FlaskConical,
  GripVertical,
  Loader2,
  Radio,
  Sun,
} from 'lucide-react';
import { ROVER_COMPONENTS } from '../data/roverComponents';
import { useMission } from '../state/MissionContext';
import { ComponentId } from '../types/mission';

const COMPONENT_ICONS: Record<ComponentId, React.FC<{ className?: string }>> = {
  wheels: Disc,
  solarPanels: Sun,
  battery: BatteryCharging,
  navCameras: Eye,
  commAntenna: Radio,
  roboticArm: Cog,
  scienceInstruments: FlaskConical,
};

export const ComponentPanel: React.FC = () => {
  const {
    selectedComponentId,
    focusOnComponent,
    installedComponents,
    installingComponentId,
    installProgress,
    installedCount,
    totalComponents,
    draggingComponentId,
    setDraggingComponentId,
    setDropZoneAligned,
    dragPointerNdcRef,
  } = useMission();

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-[#0B0F17]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-slate-100">
            Component Library
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Drag module onto rover mount or click to inspect
          </p>
        </div>
        <span className="font-mono text-xs font-medium text-cyan-400 tabular-nums">
          {installedCount}/{totalComponents}
        </span>
      </div>

      <div className="eng-scroll flex-1 space-y-2 overflow-y-auto p-3">
        {ROVER_COMPONENTS.map((comp, idx) => {
          const Icon = COMPONENT_ICONS[comp.id];
          const installed = installedComponents[comp.id];
          const installing = installingComponentId === comp.id;
          const selected = selectedComponentId === comp.id;
          const isDragging = draggingComponentId === comp.id;
          const canDrag = !installed && installingComponentId === null;

          return (
            <button
              key={comp.id}
              type="button"
              draggable={canDrag}
              onDragStart={(e) => {
                if (!canDrag) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.setData('text/plain', comp.id);
                e.dataTransfer.effectAllowed = 'move';
                setDraggingComponentId(comp.id);
                focusOnComponent(comp.id);
              }}
              onDragEnd={() => {
                setDraggingComponentId(null);
                setDropZoneAligned(false);
                dragPointerNdcRef.current.active = false;
              }}
              onClick={() => focusOnComponent(comp.id)}
              className={`group flex w-full items-start gap-2.5 rounded border p-3 text-left transition-colors ${
                canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
              } ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/35 opacity-80'
                  : selected
                    ? 'border-cyan-400 bg-[#121D2E]'
                    : 'border-slate-800/90 bg-[#0E141F] hover:border-slate-700 hover:bg-[#111927]'
              }`}
            >
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded border ${
                  installed
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : selected
                      ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300'
                      : 'border-slate-800 bg-[#090D14] text-slate-400 group-hover:text-cyan-300'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-display text-sm font-semibold text-slate-100">
                    {comp.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {canDrag && (
                      <GripVertical
                        className="h-3.5 w-3.5 text-slate-600 transition-colors group-hover:text-cyan-400"
                        aria-hidden="true"
                      />
                    )}
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      0{idx + 1}
                    </span>
                  </div>
                </div>

                <p className="mt-0.5 truncate text-xs text-slate-400">{comp.subsystem}</p>

                <div className="mt-2 flex items-center justify-between text-xs tabular-nums">
                  <span className="font-mono text-[11px] text-slate-400">
                    {comp.massKg} kg
                    <span aria-hidden="true" className="mx-1.5 text-slate-600">
                      ·
                    </span>
                    {comp.powerGenW > 0
                      ? `+${comp.powerGenW} W`
                      : comp.powerDrawW > 0
                        ? `-${comp.powerDrawW} W`
                        : `${comp.batteryWh} Wh`}
                  </span>

                  {installed ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                      <Check className="h-3 w-3" />
                      Installed
                    </span>
                  ) : installing ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {installProgress}%
                    </span>
                  ) : (
                    <span
                      className={`font-mono text-[11px] ${
                        selected ? 'text-cyan-400' : 'text-slate-500'
                      }`}
                    >
                      {selected ? 'Drag / Install' : 'Drag to Mount'}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
