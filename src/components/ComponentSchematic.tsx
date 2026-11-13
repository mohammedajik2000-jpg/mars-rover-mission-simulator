import React from 'react';
import { ComponentId } from '../types/mission';

export const ComponentSchematic: React.FC<{ componentId: ComponentId; installed: boolean }> = ({
  componentId,
  installed,
}) => {
  const stroke = installed ? '#10B981' : '#06B6D4';
  const subtle = installed ? 'rgba(16, 185, 129, 0.22)' : 'rgba(6, 182, 212, 0.22)';

  return (
    <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded border border-slate-800 bg-[#070A10]">
      <svg
        viewBox="0 0 220 100"
        className="h-full w-full"
        aria-label={`${componentId} technical blueprint`}
      >
        {/* Technical Grid Lines */}
        <defs>
          <pattern id="cadGrid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="rgba(148, 163, 184, 0.08)"
              strokeWidth="0.75"
            />
          </pattern>
        </defs>
        <rect width="220" height="100" fill="url(#cadGrid)" />

        {componentId === 'wheels' && (
          <g stroke={stroke} strokeWidth="1.5" fill="none">
            <line x1="45" y1="68" x2="110" y2="30" />
            <line x1="110" y1="30" x2="145" y2="50" />
            <line x1="110" y1="68" x2="145" y2="50" />
            <line x1="145" y1="50" x2="175" y2="68" />
            {[45, 110, 175].map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy="68" r="16" fill={subtle} />
                <circle cx={cx} cy="68" r="7" />
                <circle cx={cx} cy="68" r="2" fill={stroke} />
              </g>
            ))}
          </g>
        )}

        {componentId === 'solarPanels' && (
          <g stroke={stroke} strokeWidth="1.5" fill="none">
            <rect x="24" y="34" width="60" height="32" fill={subtle} />
            <rect x="88" y="30" width="44" height="40" fill={subtle} />
            <rect x="136" y="34" width="60" height="32" fill={subtle} />
            <line x1="44" y1="34" x2="44" y2="66" strokeOpacity="0.6" />
            <line x1="64" y1="34" x2="64" y2="66" strokeOpacity="0.6" />
            <line x1="156" y1="34" x2="156" y2="66" strokeOpacity="0.6" />
            <line x1="176" y1="34" x2="176" y2="66" strokeOpacity="0.6" />
            <line x1="24" y1="50" x2="196" y2="50" strokeOpacity="0.5" />
          </g>
        )}

        {componentId === 'battery' && (
          <g stroke={stroke} strokeWidth="1.5" fill="none">
            <rect x="52" y="28" width="90" height="44" rx="4" fill={subtle} />
            {[36, 44, 52, 60, 68].map((y) => (
              <line key={y} x1="142" y1={y} x2="168" y2={y} />
            ))}
            <rect x="66" y="38" width="24" height="24" />
            <rect x="100" y="38" width="24" height="24" />
            <path d="M 78 43 L 73 51 L 79 51 L 75 58" stroke="#F59E0B" />
          </g>
        )}

        {componentId === 'navCameras' && (
          <g stroke={stroke} strokeWidth="1.5" fill="none">
            <line x1="110" y1="84" x2="110" y2="38" strokeWidth="3" />
            <rect x="92" y="78" width="36" height="8" fill={subtle} />
            <rect x="74" y="18" width="72" height="24" rx="2" fill={subtle} />
            <circle cx="90" cy="30" r="5" />
            <circle cx="110" cy="30" r="7" />
            <circle cx="130" cy="30" r="5" />
          </g>
        )}

        {componentId === 'commAntenna' && (
          <g stroke={stroke} strokeWidth="1.5" fill="none">
            <path d="M 65 44 Q 110 80 155 44" fill={subtle} strokeWidth="2" />
            <line x1="110" y1="62" x2="110" y2="86" strokeWidth="2.5" />
            <line x1="88" y1="86" x2="132" y2="86" />
            <line x1="82" y1="50" x2="110" y2="26" />
            <line x1="138" y1="50" x2="110" y2="26" />
            <circle cx="110" cy="24" r="4" fill={stroke} />
            <path d="M 96 18 Q 110 10 124 18" strokeOpacity="0.65" />
          </g>
        )}

        {componentId === 'roboticArm' && (
          <g stroke={stroke} strokeWidth="1.5" fill="none">
            <rect x="34" y="42" width="16" height="28" fill={subtle} />
            <circle cx="54" cy="56" r="6" fill={subtle} />
            <line x1="60" y1="53" x2="108" y2="28" strokeWidth="3" />
            <circle cx="112" cy="26" r="6" fill={subtle} />
            <line x1="116" y1="30" x2="152" y2="62" strokeWidth="2.5" />
            <circle cx="160" cy="68" r="12" fill={subtle} />
            <polygon points="172,64 190,68 172,72" fill={stroke} />
          </g>
        )}

        {componentId === 'scienceInstruments' && (
          <g stroke={stroke} strokeWidth="1.5" fill="none">
            <rect x="48" y="26" width="64" height="36" fill={subtle} />
            <circle cx="80" cy="44" r="10" />
            <circle cx="80" cy="44" r="4" fill={stroke} />
            <polygon points="128,32 164,32 152,58 140,58" fill={subtle} />
            <rect x="56" y="70" width="108" height="10" fill={subtle} />
            <line x1="80" y1="80" x2="80" y2="90" strokeDasharray="2 2" />
            <line x1="110" y1="80" x2="110" y2="92" strokeDasharray="2 2" />
            <line x1="140" y1="80" x2="140" y2="90" strokeDasharray="2 2" />
          </g>
        )}
      </svg>
    </div>
  );
};
