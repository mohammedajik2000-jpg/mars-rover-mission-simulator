import React from 'react';
import { Compass, Navigation } from 'lucide-react';
import { MinimapTelemetry } from '../state/useMarsExploration';

interface MarsMinimapHudProps {
  telemetry: MinimapTelemetry;
}

const WORLD_EXTENT = 24;
const SVG_SIZE = 156;
const CENTER = SVG_SIZE / 2;

function worldToSvg(x: number, z: number): { sx: number; sy: number } {
  const clampX = Math.max(-WORLD_EXTENT, Math.min(WORLD_EXTENT, x));
  const clampZ = Math.max(-WORLD_EXTENT, Math.min(WORLD_EXTENT, z));
  return {
    sx: CENTER + (clampX / WORLD_EXTENT) * (CENTER - 14),
    sy: CENTER + (clampZ / WORLD_EXTENT) * (CENTER - 14),
  };
}

function headingLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

export const MarsMinimapHud: React.FC<MarsMinimapHudProps> = ({ telemetry }) => {
  const roverPt = worldToSvg(telemetry.roverX, telemetry.roverZ);
  const nextPt = worldToSvg(telemetry.nextWaypoint.x, telemetry.nextWaypoint.z);

  // Convert roverYaw (0 = +Z South, +PI/2 = +X East) to SVG screen angle (0 deg = Up/-Z)
  const roverSvgRotDeg = 180 - (telemetry.roverYaw * 180) / Math.PI;

  return (
    <div className="pointer-events-auto absolute top-4 right-4 z-20 w-[184px] rounded border border-slate-700/90 bg-[#080C13]/95 p-2.5 shadow-xl">
      {/* Header & Compass Heading */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span className="flex items-center gap-1 font-display text-[11px] font-semibold tracking-wider text-slate-200">
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          JEZERO RADAR
        </span>
        <span className="font-mono text-[10px] font-semibold text-cyan-300 tabular-nums">
          {String(telemetry.headingDeg).padStart(3, '0')}° {headingLabel(telemetry.headingDeg)}
        </span>
      </div>

      {/* Interactive Surface Map */}
      <div className="relative mt-2 flex justify-center">
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="rounded border border-slate-800 bg-[#110b09]"
          aria-label="Mars surface navigation minimap"
        >
          {/* Range rings */}
          <circle cx={CENTER} cy={CENTER} r={28} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth={1} />
          <circle cx={CENTER} cy={CENTER} r={54} fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth={1} />
          <line x1={CENTER} y1={10} x2={CENTER} y2={SVG_SIZE - 10} stroke="rgba(148,163,184,0.12)" strokeWidth={1} />
          <line x1={10} y1={CENTER} x2={SVG_SIZE - 10} y2={CENTER} stroke="rgba(148,163,184,0.12)" strokeWidth={1} />

          {/* Cardinal Compass Markers */}
          <text x={CENTER} y={9} textAnchor="middle" fill="#67e8f9" fontSize="8" fontFamily="monospace" fontWeight="700">
            N
          </text>
          <text x={SVG_SIZE - 6} y={CENTER + 3} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            E
          </text>
          <text x={CENTER} y={SVG_SIZE - 3} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            S
          </text>
          <text x={6} y={CENTER + 3} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            W
          </text>

          {/* Route Guide Line to Next Objective */}
          <line
            x1={roverPt.sx}
            y1={roverPt.sy}
            x2={nextPt.sx}
            y2={nextPt.sy}
            stroke="#22d3ee"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            opacity={0.85}
          />

          {/* Waypoint Markers */}
          {telemetry.waypoints.map((wp) => {
            const pt = worldToSvg(wp.x, wp.z);
            const isTarget = wp.id === telemetry.nextWaypoint.id;
            const color = wp.completed
              ? '#10b981'
              : wp.kind === 'soil'
                ? '#f59e0b'
                : wp.kind === 'rock'
                  ? '#38bdf8'
                  : '#94a3b8';

            return (
              <g key={wp.id} transform={`translate(${pt.sx}, ${pt.sy})`}>
                {isTarget && (
                  <circle cx={0} cy={0} r={9} fill="none" stroke="#22d3ee" strokeWidth={1.2} opacity={0.85} />
                )}
                <circle cx={0} cy={0} r={5} fill="#090d14" stroke={color} strokeWidth={1.6} />
                <text
                  x={0}
                  y={-8}
                  textAnchor="middle"
                  fill={color}
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  {wp.shortCode}
                </text>
              </g>
            );
          })}

          {/* Rover Heading Arrow */}
          <g transform={`translate(${roverPt.sx}, ${roverPt.sy}) rotate(${roverSvgRotDeg})`}>
            <polygon points="0,-7 4.5,5 0,2.5 -4.5,5" fill="#f8fafc" stroke="#06b6d4" strokeWidth={1} />
          </g>
        </svg>
      </div>

      {/* Next Objective Readout */}
      <div className="mt-2 rounded border border-slate-800 bg-[#0B1019] px-2 py-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 font-mono text-slate-400">
            <Navigation className="h-3 w-3 text-cyan-400" />
            NEXT: {telemetry.nextWaypoint.shortCode}
          </span>
          <span className="font-mono font-semibold text-cyan-300 tabular-nums">
            {telemetry.nextWaypoint.distM.toFixed(1)} m · {String(telemetry.nextWaypoint.bearingDeg).padStart(3, '0')}°
          </span>
        </div>
        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-200">
          {telemetry.nextWaypoint.label}
        </p>
      </div>
    </div>
  );
};
