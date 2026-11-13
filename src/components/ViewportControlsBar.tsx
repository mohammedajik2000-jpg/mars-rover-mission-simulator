import React from 'react';
import { Maximize2, Minimize2, RotateCw } from 'lucide-react';
import { useMission } from '../state/MissionContext';
import { CameraPresetId } from '../types/mission';

const CAMERA_BUTTONS: Array<{ id: CameraPresetId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
  { id: 'aft', label: 'Aft' },
];

export const ViewportControlsBar: React.FC<{
  zenMode: boolean;
  onToggleZenMode: () => void;
}> = ({ zenMode, onToggleZenMode }) => {
  const { cameraPreset, setCameraPreset, autoRotate, setAutoRotate } = useMission();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded border border-slate-800 bg-[#0B0F17]/95 p-1.5">
        {CAMERA_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => setCameraPreset(btn.id)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              cameraPreset === btn.id
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            {btn.label}
          </button>
        ))}

        <div className="mx-1 h-4 w-px bg-slate-800" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            autoRotate
              ? 'bg-amber-500/20 text-amber-300'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Orbit</span>
        </button>

        <button
          type="button"
          onClick={onToggleZenMode}
          className="hidden lg:flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 whitespace-nowrap shrink-0"
          title={zenMode ? 'Show Engineering Panels' : 'Expand 3D Viewport'}
        >
          {zenMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          <span>{zenMode ? 'Show Panels' : 'Expand'}</span>
        </button>
      </div>
    </div>
  );
};
