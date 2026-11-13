import React, { useMemo, useRef } from 'react';
import { getRoverMaterials } from '../materials';
import * as THREE from 'three';
import {
  ComponentAssemblyProps,
  resolveMaterial,
  useMountSlideAnimation,
} from './installHelpers';

const COOLING_FIN_ANGLES = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

export const BatteryAssembly: React.FC<ComponentAssemblyProps> = ({
  mode,
  installProgress,
  isTestingActive,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const mats = useMemo(() => getRoverMaterials(), []);

  useMountSlideAnimation(groupRef, mode, installProgress, [0, 0.25, -0.75]);

  if (mode === 'hidden') return null;

  const darkMat = resolveMaterial(mode, mats.titaniumDark, mats);
  const aluMat = resolveMaterial(mode, mats.brushedAluminum, mats);
  const goldMat = resolveMaterial(mode, mats.kaptonGold, mats);
  const copperMat = resolveMaterial(mode, mats.copperAccent, mats);
  const ledMat = resolveMaterial(
    mode,
    isTestingActive ? mats.amberEmissive : mats.cyanEmissive,
    mats
  );

  return (
    <group ref={groupRef}>
      {/* Aft Mounting Bracket Frame */}
      <mesh position={[0, 0.88, -0.86]} material={darkMat} castShadow={mode !== 'preview'}>
        <boxGeometry args={[0.58, 0.28, 0.14]} />
      </mesh>

      {/* Angled MMRTG / Power Core Cylinder */}
      <group position={[0, 0.94, -1.08]} rotation={[Math.PI / 2 - 0.28, 0, 0]}>
        <mesh material={darkMat} castShadow={mode !== 'preview'}>
          <cylinderGeometry args={[0.16, 0.18, 0.48, 16]} />
        </mesh>

        {/* Gold Kapton Aft Cap */}
        <mesh position={[0, -0.25, 0]} material={goldMat}>
          <cylinderGeometry args={[0.14, 0.17, 0.06, 16]} />
        </mesh>

        {/* 8 Radial Thermal Cooling Fins */}
        {COOLING_FIN_ANGLES.map((angle, idx) => (
          <mesh
            key={idx}
            position={[Math.cos(angle) * 0.2, 0, Math.sin(angle) * 0.2]}
            rotation={[0, -angle, 0]}
            material={aluMat}
            castShadow={mode !== 'preview'}
          >
            <boxGeometry args={[0.09, 0.42, 0.014]} />
          </mesh>
        ))}
      </group>

      {/* Dual Li-Ion Radiation-Hardened Cell Modules */}
      <mesh position={[-0.24, 0.92, -0.9]} material={goldMat} castShadow={mode !== 'preview'}>
        <boxGeometry args={[0.16, 0.22, 0.22]} />
      </mesh>
      <mesh position={[0.24, 0.92, -0.9]} material={goldMat} castShadow={mode !== 'preview'}>
        <boxGeometry args={[0.16, 0.22, 0.22]} />
      </mesh>

      {/* High-Voltage Copper Bus Conduits */}
      <mesh
        position={[-0.15, 0.98, -0.84]}
        rotation={[Math.PI / 2, 0, 0]}
        material={copperMat}
      >
        <cylinderGeometry args={[0.018, 0.018, 0.22, 10]} />
      </mesh>
      <mesh
        position={[0.15, 0.98, -0.84]}
        rotation={[Math.PI / 2, 0, 0]}
        material={copperMat}
      >
        <cylinderGeometry args={[0.018, 0.018, 0.22, 10]} />
      </mesh>

      {/* Charge Status Telemetry Strip */}
      <mesh position={[0, 1.04, -0.82]} material={ledMat}>
        <boxGeometry args={[0.22, 0.022, 0.025]} />
      </mesh>
    </group>
  );
};
