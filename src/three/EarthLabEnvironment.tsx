import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getRoverMaterials } from './materials';

function createCleanroomFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0d131d';
  ctx.fillRect(0, 0, 512, 512);

  // Cleanroom epoxy tile grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Subtle corner alignment crosshairs
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < 512; x += 128) {
    for (let y = 0; y < 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = 8;
  return tex;
}

function createWorkstationScreenTexture(variant: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 144;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#060c17';
  ctx.fillRect(0, 0, 256, 144);

  ctx.fillStyle = '#0e2238';
  ctx.fillRect(0, 0, 256, 20);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(8, 7, 46, 5);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(210, 7, 36, 5);

  if (variant === 0) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1;
    for (let x = 16; x < 140; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 28);
      ctx.lineTo(x, 132);
      ctx.stroke();
    }
    for (let y = 28; y < 132; y += 16) {
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(140, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(46, 54, 64, 44);
    ctx.beginPath();
    ctx.arc(196, 80, 32, 0, Math.PI * 1.65);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 5;
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 14; x < 242; x += 8) {
      const y = 55 + Math.sin(x * 0.08 + variant) * 16 + Math.cos(x * 0.2) * 5;
      if (x === 14) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    const colors = ['#10b981', '#22d3ee', '#f59e0b', '#10b981'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(16, 88 + i * 11, 224, 6);
      ctx.fillStyle = colors[i];
      ctx.fillRect(16, 88 + i * 11, 110 + ((i * 37 + variant * 29) % 105), 6);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMissionWallDisplayTexture(panelIndex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#050a14';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const titles = [
    'ARES-IV · STRUCTURAL TELEMETRY & MASS MATRIX',
    'ORBITAL TRANSFER · EARTH-TO-MARS WINDOW',
    'CLEANROOM ENVIRONMENTAL & THERMAL CONTROL',
    'ACTUATOR TORQUE & WHEEL DYNAMOMETER LAB',
  ];

  ctx.fillStyle = '#0c1f35';
  ctx.fillRect(0, 0, 512, 34);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(titles[panelIndex % titles.length], 16, 22);

  if (panelIndex % 2 === 0) {
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(40, 68, 170, 95);
    ctx.strokeStyle = '#f59e0b';
    ctx.strokeRect(66, 84, 118, 62);
    ctx.fillStyle = '#94a3b8';
    for (const wx of [54, 125, 196]) {
      ctx.fillRect(wx - 10, 52, 20, 12);
      ctx.fillRect(wx - 10, 168, 20, 12);
    }

    const labels =
      panelIndex === 0
        ? ['BUS VOLTAGE 28.0V', 'SOLAR ARRAY 340W', 'CHASSIS TEMP 21.4C', 'THERMAL SHIELD OK']
        : ['ISO-5 FILTRATION', 'HUMIDITY 32.1% RH', 'PRESSURE +14.8 Pa', 'ESD GROUND VERIFIED'];

    labels.forEach((lbl, idx) => {
      const y = 72 + idx * 42;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px monospace';
      ctx.fillText(lbl, 245, y);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(245, y + 8, 236, 10);
      ctx.fillStyle = idx === 1 ? '#f59e0b' : '#10b981';
      ctx.fillRect(245, y + 8, 175 + idx * 14, 10);
    });
  } else {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(256, 210, 140, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(125, 152);
    ctx.quadraticCurveTo(256, 52, 392, 134);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(125, 152, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(392, 134, 11, 0, Math.PI * 2);
    ctx.fill();

    // Waveform readout at bottom
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 40; x < 472; x += 12) {
      const y = 218 + Math.sin(x * 0.06 + panelIndex) * 14;
      if (x === 40) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const PILLAR_ANGLES = [0, 1, 2, 3, 4, 5].map((i) => (i / 6) * Math.PI * 2 + Math.PI / 6);
const WALL_BAY_ANGLES = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);

// 6 Workstations distributed 360° around the central rover bay
const WORKSTATION_POSITIONS: Array<{ pos: [number, number, number]; rotY: number; variant: number }> =
  [
    { pos: [-5.6, 0, -4.4], rotY: 0.68, variant: 0 },
    { pos: [0, 0, -6.9], rotY: 0, variant: 1 },
    { pos: [5.6, 0, -4.4], rotY: -0.68, variant: 0 },
    { pos: [-6.4, 0, 4.6], rotY: 2.38, variant: 1 },
    { pos: [0, 0, 7.3], rotY: Math.PI, variant: 0 },
    { pos: [6.4, 0, 4.6], rotY: -2.38, variant: 1 },
  ];

// 4 Robotic manufacturing & precision inspection gantry arms
const ROBOT_ARM_POSITIONS: Array<{ pos: [number, number, number]; rotY: number }> = [
  { pos: [-4.1, 0, -2.5], rotY: 0.92 },
  { pos: [4.1, 0, -2.5], rotY: -0.92 },
  { pos: [-4.4, 0, 3.2], rotY: 2.15 },
  { pos: [4.4, 0, 3.2], rotY: -2.15 },
];

// 4 Calibration & environmental testing racks around side & rear bays
const TEST_RACK_POSITIONS: Array<{ pos: [number, number, number]; rotY: number }> = [
  { pos: [-7.4, 0, 1.4], rotY: 1.42 },
  { pos: [7.4, 0, 1.4], rotY: -1.42 },
  { pos: [-4.4, 0, 8.8], rotY: 2.75 },
  { pos: [4.4, 0, 8.8], rotY: -2.75 },
];

// 4 Component storage racks, spare parts & mechanical tool cabinets
const STORAGE_CABINET_POSITIONS: Array<{ pos: [number, number, number]; rotY: number }> = [
  { pos: [-8.8, 0, -1.8], rotY: 1.28 },
  { pos: [8.8, 0, -1.8], rotY: -1.28 },
  { pos: [-8.2, 0, 6.2], rotY: 2.25 },
  { pos: [8.2, 0, 6.2], rotY: -2.25 },
];

// 4 Wall-mounted large digital mission-control displays visible from all directions
const WALL_DISPLAY_POSITIONS: Array<{
  pos: [number, number, number];
  rotY: number;
  matIdx: number;
}> = [
  { pos: [-7.6, 3.4, -10.8], rotY: 0.42, matIdx: 0 },
  { pos: [7.6, 3.4, -10.8], rotY: -0.42, matIdx: 1 },
  { pos: [-7.6, 3.4, 10.8], rotY: Math.PI - 0.42, matIdx: 2 },
  { pos: [7.6, 3.4, 10.8], rotY: Math.PI + 0.42, matIdx: 3 },
];

// Exterior aerospace campus buildings visible through all panoramic windows (360°)
const EXTERIOR_CAMPUS_BUILDINGS: Array<{
  pos: [number, number, number];
  size: [number, number, number];
  hasBeacon?: boolean;
}> = [
  { pos: [-16, 4.5, -24], size: [9, 9, 7], hasBeacon: true },
  { pos: [0, 3.2, -28], size: [14, 6.4, 8] },
  { pos: [17, 5.5, -23], size: [8, 11, 7], hasBeacon: true },
  { pos: [-25, 2.8, -10], size: [7, 5.6, 11] },
  { pos: [25, 3.2, -9], size: [8, 6.4, 10] },
  { pos: [-24, 4.0, 14], size: [9, 8.0, 9], hasBeacon: true },
  { pos: [24, 3.4, 14], size: [9, 6.8, 9] },
  { pos: [0, 4.2, 29], size: [16, 8.4, 8] },
];

export const EarthLabEnvironment: React.FC<{ lightsOn?: boolean }> = ({ lightsOn = false }) => {
  const mats = useMemo(() => getRoverMaterials(), []);

  const floorMat = useMemo(() => {
    const map = createCleanroomFloorTexture();
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.44,
      metalness: 0.32,
    });
  }, []);

  const wallPanelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x141c29,
        roughness: 0.58,
        metalness: 0.36,
      }),
    []
  );

  const exteriorSkyDomeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x102542,
        side: THREE.BackSide,
      }),
    []
  );

  const exteriorBuildingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.72,
        metalness: 0.25,
      }),
    []
  );

  const glassObservationMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        roughness: 0.08,
        metalness: 0.1,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    []
  );

  const ceilingLightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        emissive: 0xbae6fd,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      }),
    []
  );

  const toolRedMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xb91c1c,
        roughness: 0.45,
        metalness: 0.35,
      }),
    []
  );

  const safetyYellowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.42,
        metalness: 0.3,
      }),
    []
  );

  const screenMats = useMemo(() => {
    return [0, 1].map((v) => new THREE.MeshBasicMaterial({ map: createWorkstationScreenTexture(v) }));
  }, []);

  const missionDisplayMats = useMemo(() => {
    return [0, 1, 2, 3].map(
      (v) => new THREE.MeshBasicMaterial({ map: createMissionWallDisplayTexture(v) })
    );
  }, []);

  return (
    <group>
      {/* EXTERIOR EARTH AEROSPACE CAMPUS (360° surrounding backdrop outside windows) */}
      <group>
        <mesh>
          <sphereGeometry args={[72, 24, 16]} />
          <primitive object={exteriorSkyDomeMat} attach="material" />
        </mesh>
        <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[15.5, 68, 48]} />
          <meshStandardMaterial color="#182722" roughness={0.95} metalness={0.05} />
        </mesh>
        {EXTERIOR_CAMPUS_BUILDINGS.map((b, idx) => (
          <group key={`ext-b-${idx}`} position={b.pos}>
            <mesh material={exteriorBuildingMat}>
              <boxGeometry args={b.size} />
            </mesh>
            <mesh position={[0, b.size[1] * 0.18, b.size[2] * 0.51]} material={mats.cyanEmissive}>
              <boxGeometry args={[b.size[0] * 0.72, 0.22, 0.04]} />
            </mesh>
            <mesh position={[0, b.size[1] * 0.18, -b.size[2] * 0.51]} material={mats.cyanEmissive}>
              <boxGeometry args={[b.size[0] * 0.72, 0.22, 0.04]} />
            </mesh>
            {b.hasBeacon && (
              <mesh position={[0, b.size[1] * 0.5 + 0.6, 0]} material={mats.amberEmissive}>
                <sphereGeometry args={[0.25, 10, 10]} />
              </mesh>
            )}
          </group>
        ))}
      </group>

      {/* Earth High Bay Cleanroom Epoxy Floor */}
      <mesh position={[0, -0.042, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <circleGeometry args={[16.2, 48]} />
      </mesh>

      {/* Central Calibrated Engineering Turntable */}
      <mesh position={[0, -0.02, 0]} receiveShadow material={mats.turntableSurface}>
        <cylinderGeometry args={[2.55, 2.7, 0.04, 64]} />
      </mesh>
      <mesh position={[0, -0.015, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.titaniumDark}>
        <torusGeometry args={[2.56, 0.045, 12, 64]} />
      </mesh>
      <mesh
        position={[0, 0.003, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={lightsOn ? mats.amberEmissive : mats.cyanEmissive}
      >
        <ringGeometry args={[2.24, 2.26, 64]} />
      </mesh>

      {/* Outer Cleanroom Safety Perimeter Rings & Radial Floor Conduit Tracks */}
      <mesh position={[0, -0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.45, 3.52, 64]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, -0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.15, 5.22, 64]} />
        <meshBasicMaterial color="#0f2942" />
      </mesh>
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, idx) => (
        <group key={`conduit-${idx}`} rotation={[0, ang, 0]}>
          <mesh position={[0, -0.03, 7.8]} material={mats.titaniumDark}>
            <boxGeometry args={[0.38, 0.025, 10.2]} />
          </mesh>
          <mesh position={[0, -0.016, 7.8]} material={mats.cyanEmissive}>
            <boxGeometry args={[0.04, 0.012, 9.8]} />
          </mesh>
        </group>
      ))}

      {/* High Bay Cleanroom 360° Perimeter Bays (Panoramic Windows + Detailed Equipment Alcoves + Pipes) */}
      {WALL_BAY_ANGLES.map((ang, idx) => {
        const radius = 15.6;
        const x = Math.cos(ang) * radius;
        const z = Math.sin(ang) * radius;
        const isPanoramicWindow = idx % 2 === 0;
        return (
          <group key={`wall-${idx}`} position={[x, 0, z]} rotation={[0, -ang + Math.PI / 2, 0]}>
            {/* Lower Structural Knee Wall */}
            <mesh position={[0, 0.85, 0]} material={wallPanelMat}>
              <boxGeometry args={[8.2, 1.7, 0.36]} />
            </mesh>
            {/* Horizontal Cleanroom Coolant & Nitrogen Pipes */}
            <mesh position={[0, 0.52, 0.24]} rotation={[0, 0, Math.PI / 2]} material={mats.brushedAluminum}>
              <cylinderGeometry args={[0.055, 0.055, 7.9, 10]} />
            </mesh>
            <mesh position={[0, 0.72, 0.24]} rotation={[0, 0, Math.PI / 2]} material={mats.copperAccent}>
              <cylinderGeometry args={[0.042, 0.042, 7.9, 10]} />
            </mesh>
            <mesh position={[0, 1.38, 0.24]} rotation={[0, 0, Math.PI / 2]} material={safetyYellowMat}>
              <cylinderGeometry args={[0.036, 0.036, 7.9, 10]} />
            </mesh>

            {isPanoramicWindow ? (
              <>
                <mesh position={[0, 3.8, 0]} material={glassObservationMat}>
                  <boxGeometry args={[7.4, 4.2, 0.06]} />
                </mesh>
                {[-2.4, 0, 2.4].map((mx, mIdx) => (
                  <mesh key={mIdx} position={[mx, 3.8, 0.02]} material={mats.titaniumDark}>
                    <boxGeometry args={[0.14, 4.2, 0.14]} />
                  </mesh>
                ))}
              </>
            ) : (
              <>
                {/* Recessed Acoustic Cleanroom Bulkhead + HEPA Air Intake Louvers */}
                <mesh position={[0, 3.8, 0]} material={wallPanelMat}>
                  <boxGeometry args={[8.2, 4.2, 0.36]} />
                </mesh>
                {[-2.1, 0, 2.1].map((lx, lIdx) => (
                  <group key={lIdx} position={[lx, 3.75, 0.22]}>
                    <mesh material={mats.titaniumDark}>
                      <boxGeometry args={[1.65, 2.9, 0.1]} />
                    </mesh>
                    <mesh position={[0, 0, 0.06]} material={mats.brushedAluminum}>
                      <boxGeometry args={[1.4, 2.5, 0.04]} />
                    </mesh>
                    <mesh position={[0, 1.32, 0.07]} material={mats.amberEmissive}>
                      <boxGeometry args={[1.3, 0.04, 0.03]} />
                    </mesh>
                  </group>
                ))}
              </>
            )}

            {/* Upper Fascia Beam & Overhead Ducting Pipe */}
            <mesh position={[0, 6.75, 0]} material={wallPanelMat}>
              <boxGeometry args={[8.2, 1.7, 0.4]} />
            </mesh>
            <mesh position={[0, 6.1, 0.28]} rotation={[0, 0, Math.PI / 2]} material={mats.brushedAluminum}>
              <cylinderGeometry args={[0.14, 0.14, 7.9, 12]} />
            </mesh>
            <mesh position={[0, 1.74, 0.18]} material={mats.cyanEmissive}>
              <boxGeometry args={[7.2, 0.04, 0.04]} />
            </mesh>
          </group>
        );
      })}

      {/* 4 Large Wall-Mounted Digital Mission-Control Displays (Visible from every angle) */}
      {WALL_DISPLAY_POSITIONS.map((disp, idx) => (
        <group key={`mwall-${idx}`} position={disp.pos} rotation={[0, disp.rotY, 0]}>
          <mesh material={mats.titaniumDark}>
            <boxGeometry args={[4.4, 2.25, 0.12]} />
          </mesh>
          <mesh position={[0, 0, 0.07]} material={missionDisplayMats[disp.matIdx]}>
            <planeGeometry args={[4.15, 2.02]} />
          </mesh>
          <mesh position={[0, -1.16, 0.05]} material={mats.cyanEmissive}>
            <boxGeometry args={[3.8, 0.03, 0.04]} />
          </mesh>
        </group>
      ))}

      {/* High Bay Aerospace Gantry Columns with Vertical Service Risers */}
      {PILLAR_ANGLES.map((ang, idx) => {
        const radius = 11.4;
        const x = Math.cos(ang) * radius;
        const z = Math.sin(ang) * radius;
        return (
          <group key={`pillar-${idx}`} position={[x, 0, z]} rotation={[0, -ang, 0]}>
            <mesh position={[0, 3.9, 0]} material={mats.titaniumDark}>
              <boxGeometry args={[0.45, 7.8, 0.52]} />
            </mesh>
            <mesh position={[-0.25, 5.4, 0]} material={mats.brushedAluminum}>
              <boxGeometry args={[0.14, 2.6, 0.28]} />
            </mesh>
            <mesh position={[-0.23, 3.8, 0]} material={mats.cyanEmissive}>
              <boxGeometry args={[0.04, 1.8, 0.08]} />
            </mesh>
            {/* Vertical Pipe Riser along Column */}
            <mesh position={[0.26, 3.9, 0.15]} material={mats.copperAccent}>
              <cylinderGeometry args={[0.045, 0.045, 7.6, 10]} />
            </mesh>
            <mesh position={[0.26, 3.9, -0.15]} material={mats.brushedAluminum}>
              <cylinderGeometry args={[0.055, 0.055, 7.6, 10]} />
            </mesh>
          </group>
        );
      })}

      {/* 6 Engineering Telemetry & Diagnostics Workstations (360° Ring) */}
      {WORKSTATION_POSITIONS.map((ws, idx) => (
        <group key={`ws-${idx}`} position={ws.pos} rotation={[0, ws.rotY, 0]}>
          <mesh position={[0, 0.48, 0]} material={mats.titaniumDark} castShadow receiveShadow>
            <boxGeometry args={[2.3, 0.96, 0.74]} />
          </mesh>
          <mesh position={[0, 0.97, 0.04]} material={mats.brushedAluminum}>
            <boxGeometry args={[2.38, 0.05, 0.82]} />
          </mesh>
          <mesh position={[0, 0.84, 0.38]} material={mats.cyanEmissive}>
            <boxGeometry args={[1.95, 0.025, 0.02]} />
          </mesh>
          {/* Console Keyboard Pad */}
          <mesh position={[0, 1.01, 0.2]} rotation={[0.1, 0, 0]} material={mats.carbonComposite}>
            <boxGeometry args={[0.82, 0.025, 0.24]} />
          </mesh>
          {/* Operator Pedestal Chair */}
          <group position={[0, 0, 0.88]}>
            <mesh position={[0, 0.24, 0]} material={mats.brushedAluminum}>
              <cylinderGeometry args={[0.04, 0.04, 0.46, 10]} />
            </mesh>
            <mesh position={[0, 0.04, 0]} material={mats.titaniumDark}>
              <cylinderGeometry args={[0.28, 0.3, 0.05, 12]} />
            </mesh>
            <mesh position={[0, 0.48, 0]} material={mats.carbonComposite}>
              <boxGeometry args={[0.48, 0.07, 0.46]} />
            </mesh>
            <mesh position={[0, 0.78, 0.21]} rotation={[-0.12, 0, 0]} material={mats.carbonComposite}>
              <boxGeometry args={[0.46, 0.56, 0.07]} />
            </mesh>
          </group>
          {/* Dual Digital Monitors */}
          {[-0.56, 0.56].map((xOff, sIdx) => (
            <group key={sIdx} position={[xOff, 1.38, -0.14]} rotation={[-0.14, xOff * -0.12, 0]}>
              <mesh material={mats.titaniumDark}>
                <boxGeometry args={[0.98, 0.58, 0.05]} />
              </mesh>
              <mesh
                position={[0, 0, 0.028]}
                material={screenMats[(ws.variant + sIdx) % screenMats.length]}
              >
                <planeGeometry args={[0.9, 0.5]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* 2 Specialized Rover Sub-Assembly Testing Platforms (Wheel Dynamometer & Thermal-Vac Chamber) */}
      <group position={[-8.3, 0, -5.6]} rotation={[0, 0.72, 0]}>
        {/* Wheel-Torque Dynamometer Test Rig */}
        <mesh position={[0, 0.16, 0]} material={mats.titaniumDark} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.32, 1.4]} />
        </mesh>
        <mesh position={[0, 0.34, 0]} material={safetyYellowMat}>
          <boxGeometry args={[2.44, 0.04, 1.44]} />
        </mesh>
        {[-0.65, 0, 0.65].map((rx, rIdx) => (
          <mesh key={rIdx} position={[rx, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.brushedAluminum}>
            <cylinderGeometry args={[0.16, 0.16, 1.05, 16]} />
          </mesh>
        ))}
        <mesh position={[0.95, 0.92, -0.5]} material={mats.titaniumDark}>
          <boxGeometry args={[0.42, 1.2, 0.36]} />
        </mesh>
        <mesh position={[0.95, 1.15, -0.31]} material={screenMats[1]}>
          <planeGeometry args={[0.34, 0.24]} />
        </mesh>
      </group>

      <group position={[8.3, 0, -5.6]} rotation={[0, -0.72, 0]}>
        {/* Thermal-Vacuum Calibration Chamber */}
        <mesh position={[0, 0.25, 0]} material={mats.titaniumDark} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.5, 1.5]} />
        </mesh>
        <mesh position={[0, 1.2, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.brushedAluminum} castShadow>
          <cylinderGeometry args={[0.72, 0.72, 2.0, 24]} />
        </mesh>
        <mesh position={[1.02, 1.2, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.titaniumDark}>
          <cylinderGeometry args={[0.76, 0.76, 0.08, 24]} />
        </mesh>
        <mesh position={[-1.02, 1.2, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.copperAccent}>
          <cylinderGeometry args={[0.35, 0.35, 0.16, 16]} />
        </mesh>
        <mesh position={[0, 1.98, 0]} material={mats.cyanEmissive}>
          <boxGeometry args={[1.4, 0.04, 0.06]} />
        </mesh>
      </group>

      {/* 4 Calibration & Environmental Testing Equipment Racks */}
      {TEST_RACK_POSITIONS.map((rack, idx) => (
        <group key={`rack-${idx}`} position={rack.pos} rotation={[0, rack.rotY, 0]}>
          <mesh position={[0, 1.05, 0]} material={mats.titaniumDark} castShadow receiveShadow>
            <boxGeometry args={[1.15, 2.1, 0.85]} />
          </mesh>
          <mesh position={[0, 1.55, 0.44]} material={screenMats[idx % screenMats.length]}>
            <planeGeometry args={[0.85, 0.52]} />
          </mesh>
          {[0.45, 0.75, 1.05].map((ry, rIdx) => (
            <mesh key={rIdx} position={[0, ry, 0.44]} material={rIdx === 1 ? mats.amberEmissive : mats.cyanEmissive}>
              <boxGeometry args={[0.78, 0.03, 0.02]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 4 Mechanical Tool Cabinets, Component Storage Racks & Purge Cylinders */}
      {STORAGE_CABINET_POSITIONS.map((cab, idx) => (
        <group key={`cab-${idx}`} position={cab.pos} rotation={[0, cab.rotY, 0]}>
          {/* Heavy Tool Chest */}
          <mesh position={[-0.62, 0.55, 0]} material={toolRedMat} castShadow receiveShadow>
            <boxGeometry args={[1.05, 1.1, 0.62]} />
          </mesh>
          {[0.28, 0.52, 0.76, 0.96].map((dy, dIdx) => (
            <mesh key={dIdx} position={[-0.62, dy, 0.32]} material={mats.brushedAluminum}>
              <boxGeometry args={[0.86, 0.04, 0.03]} />
            </mesh>
          ))}

          {/* Component Parts Rack (Spare Wheels & Structural Frame) */}
          <mesh position={[0.68, 0.95, 0]} material={mats.titaniumDark} castShadow>
            <boxGeometry args={[1.15, 1.9, 0.65]} />
          </mesh>
          <mesh position={[0.68, 0.65, 0.04]} material={mats.brushedAluminum}>
            <boxGeometry args={[1.05, 0.06, 0.58]} />
          </mesh>
          <mesh position={[0.68, 1.25, 0.04]} material={mats.brushedAluminum}>
            <boxGeometry args={[1.05, 0.06, 0.58]} />
          </mesh>
          {/* Spare Rover Wheel Assembly on Shelf */}
          <mesh position={[0.42, 0.9, 0.06]} rotation={[Math.PI / 2, 0, 0]} material={mats.wheelTread}>
            <cylinderGeometry args={[0.2, 0.2, 0.18, 16]} />
          </mesh>
          <mesh position={[0.92, 0.9, 0.06]} rotation={[Math.PI / 2, 0, 0]} material={mats.wheelTread}>
            <cylinderGeometry args={[0.2, 0.2, 0.18, 16]} />
          </mesh>
          {/* Spare Gold Thermal Foil Module */}
          <mesh position={[0.68, 1.45, 0.05]} material={mats.kaptonGold}>
            <boxGeometry args={[0.75, 0.28, 0.36]} />
          </mesh>

          {/* Pressurized Nitrogen Purge Tank */}
          <mesh position={[1.45, 0.68, -0.05]} material={mats.chassisWhite} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 1.36, 14]} />
          </mesh>
          <mesh position={[1.45, 1.4, -0.05]} material={mats.emeraldEmissive}>
            <cylinderGeometry args={[0.05, 0.08, 0.1, 10]} />
          </mesh>
        </group>
      ))}

      {/* 4 Cleanroom Robotic Assembly & Inspection Gantry Arms */}
      {ROBOT_ARM_POSITIONS.map((arm, idx) => (
        <group key={`rarm-${idx}`} position={arm.pos} rotation={[0, arm.rotY, 0]}>
          <mesh position={[0, 0.25, 0]} material={mats.titaniumDark} castShadow receiveShadow>
            <cylinderGeometry args={[0.38, 0.48, 0.5, 16]} />
          </mesh>
          <mesh position={[0, 0.52, 0]} material={mats.amberEmissive}>
            <cylinderGeometry args={[0.4, 0.4, 0.04, 16]} />
          </mesh>
          <mesh position={[0, 1.15, 0]} material={mats.chassisWhite} castShadow>
            <cylinderGeometry args={[0.18, 0.24, 1.25, 16]} />
          </mesh>
          <mesh position={[0, 1.82, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.titaniumDark}>
            <cylinderGeometry args={[0.17, 0.17, 0.34, 16]} />
          </mesh>
          <group position={[0, 1.82, 0]} rotation={[0.42, 0, 0]}>
            <mesh position={[0, 0.62, 0]} material={mats.chassisWhite} castShadow>
              <boxGeometry args={[0.18, 1.24, 0.2]} />
            </mesh>
            <group position={[0, 1.24, 0]} rotation={[0.95, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.titaniumDark}>
                <cylinderGeometry args={[0.13, 0.13, 0.26, 14]} />
              </mesh>
              <mesh position={[0, 0.52, 0]} material={mats.brushedAluminum}>
                <cylinderGeometry args={[0.09, 0.12, 1.05, 14]} />
              </mesh>
              <mesh position={[0, 1.08, 0]} material={mats.cyanEmissive}>
                <cylinderGeometry args={[0.11, 0.08, 0.08, 14]} />
              </mesh>
            </group>
          </group>
        </group>
      ))}

      {/* Overhead Industrial Steel Truss Rings, Light Fixtures, Support Beams & Dual Bridge Cranes */}
      <mesh position={[0, 7.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.titaniumDark}>
        <torusGeometry args={[6.8, 0.15, 10, 48]} />
      </mesh>
      <mesh position={[0, 7.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={ceilingLightMat}>
        <torusGeometry args={[6.65, 0.05, 8, 48]} />
      </mesh>
      <mesh position={[0, 7.35, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.titaniumDark}>
        <torusGeometry args={[11.4, 0.18, 10, 48]} />
      </mesh>
      <mesh position={[0, 7.18, 0]} rotation={[Math.PI / 2, 0, 0]} material={ceilingLightMat}>
        <torusGeometry args={[11.2, 0.045, 8, 48]} />
      </mesh>

      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((rot, idx) => (
        <group key={`truss-${idx}`} rotation={[0, rot, 0]}>
          <mesh position={[0, 7.32, 0]} material={mats.titaniumDark}>
            <boxGeometry args={[28, 0.22, 0.22]} />
          </mesh>
          <mesh position={[0, 7.19, 0]} material={ceilingLightMat}>
            <boxGeometry args={[20, 0.05, 0.14]} />
          </mesh>
        </group>
      ))}

      {/* Dual Overhead Bridge Crane Spans */}
      {[-3.4, 4.2].map((cz, idx) => (
        <group key={`crane-${idx}`} position={[0, 7.68, cz]}>
          <mesh material={safetyYellowMat}>
            <boxGeometry args={[22, 0.28, 0.34]} />
          </mesh>
          <mesh position={[idx === 0 ? -1.8 : 2.2, -0.35, 0]} material={mats.titaniumDark}>
            <boxGeometry args={[1.4, 0.42, 0.65]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
