import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getRoverMaterials } from '../materials';
import {
  ComponentAssemblyProps,
  ComponentRenderMode,
  resolveMaterial,
  useMountSlideAnimation,
} from './installHelpers';

const WHEEL_POSITIONS: Array<[number, number, number]> = [
  [-0.92, 0.26, 0.78],
  [-0.92, 0.26, -0.05],
  [-0.92, 0.26, -0.78],
  [0.92, 0.26, 0.78],
  [0.92, 0.26, -0.05],
  [0.92, 0.26, -0.78],
];

const CLEAT_ANGLES = Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2);
const SPOKE_ANGLES = Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2);

const SingleWheel: React.FC<{
  position: [number, number, number];
  side: 'left' | 'right';
  mode: ComponentRenderMode;
  isTestingActive?: boolean;
  activationStage?: ComponentAssemblyProps['activationStage'];
  activeMechStepId?: string | null;
  externalWheelSpeedRef?: React.MutableRefObject<number>;
}> = ({
  position,
  side,
  mode,
  isTestingActive,
  activationStage,
  activeMechStepId,
  externalWheelSpeedRef,
}) => {
  const mats = useMemo(() => getRoverMaterials(), []);
  const wheelSpinRef = useRef<THREE.Group>(null);
  const steerSign = side === 'left' ? 1 : -1;

  useFrame((state, delta) => {
    if (!wheelSpinRef.current) return;
    const extSpeed = externalWheelSpeedRef?.current ?? 0;
    if (mode === 'installed' && Math.abs(extSpeed) > 0.001) {
      wheelSpinRef.current.rotation.x += delta * extSpeed;
      return;
    }

    const mechWheelActive =
      activationStage === 'mechanical' && (!activeMechStepId || activeMechStepId === 'mech-wheels');
    const spinActive =
      mode === 'installed' &&
      (isTestingActive || mechWheelActive || activationStage === 'diagnostics');

    if (spinActive) {
      const dir = activationStage === 'mechanical' ? Math.sin(state.clock.elapsedTime * 2.5) : 1;
      wheelSpinRef.current.rotation.x += delta * 2.8 * (dir >= 0 ? 1 : -1);
    } else if (mode === 'installed' && !externalWheelSpeedRef) {
      wheelSpinRef.current.rotation.x = THREE.MathUtils.damp(
        wheelSpinRef.current.rotation.x,
        Math.sin(state.clock.elapsedTime * 0.4) * 0.04,
        4,
        delta
      );
    }
  });

  const treadMat = resolveMaterial(mode, mats.wheelTread, mats);
  const aluMat = resolveMaterial(mode, mats.brushedAluminum, mats);
  const darkMat = resolveMaterial(mode, mats.titaniumDark, mats);
  const copperMat = resolveMaterial(mode, mats.copperAccent, mats);

  return (
    <group position={position}>
      {/* Steering Knuckle Clevis */}
      <mesh
        position={[-0.17 * steerSign, 0.14, 0]}
        material={darkMat}
        castShadow={mode !== 'preview'}
      >
        <cylinderGeometry args={[0.055, 0.065, 0.16, 12]} />
      </mesh>
      <mesh
        position={[-0.1 * steerSign, 0.08, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={aluMat}
        castShadow={mode !== 'preview'}
      >
        <cylinderGeometry args={[0.036, 0.036, 0.16, 12]} />
      </mesh>

      {/* Rotating Wheel Assembly */}
      <group ref={wheelSpinRef}>
        {/* Outer Tire Drum */}
        <mesh
          rotation={[0, 0, Math.PI / 2]}
          material={treadMat}
          castShadow={mode !== 'preview'}
          receiveShadow={mode !== 'preview'}
        >
          <cylinderGeometry args={[0.255, 0.255, 0.22, 28]} />
        </mesh>

        {/* Inner Machined Rim */}
        <mesh
          rotation={[0, 0, Math.PI / 2]}
          material={aluMat}
          castShadow={mode !== 'preview'}
        >
          <cylinderGeometry args={[0.19, 0.19, 0.23, 24]} />
        </mesh>

        {/* Central Planetary Hub */}
        <mesh
          position={[0.05 * steerSign, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={darkMat}
        >
          <cylinderGeometry args={[0.075, 0.085, 0.16, 16]} />
        </mesh>
        <mesh
          position={[0.125 * steerSign, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={copperMat}
        >
          <cylinderGeometry args={[0.042, 0.042, 0.03, 12]} />
        </mesh>

        {/* Titanium Wheel Spokes */}
        {SPOKE_ANGLES.map((angle, idx) => (
          <mesh
            key={idx}
            position={[0.095 * steerSign, Math.cos(angle) * 0.11, Math.sin(angle) * 0.11]}
            rotation={[angle, 0, 0]}
            material={darkMat}
          >
            <boxGeometry args={[0.025, 0.12, 0.022]} />
          </mesh>
        ))}

        {/* Chevron Grouser Tread Cleats */}
        {CLEAT_ANGLES.map((angle, idx) => (
          <mesh
            key={idx}
            position={[0, Math.cos(angle) * 0.257, Math.sin(angle) * 0.257]}
            rotation={[angle, 0, idx % 2 === 0 ? 0.14 : -0.14]}
            material={aluMat}
          >
            <boxGeometry args={[0.2, 0.014, 0.024]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const SuspensionSide: React.FC<{
  side: 'left' | 'right';
  mode: ComponentRenderMode;
}> = ({ side, mode }) => {
  const mats = useMemo(() => getRoverMaterials(), []);
  const xSign = side === 'left' ? -1 : 1;
  const xPos = 0.68 * xSign;

  const tubeMat = resolveMaterial(mode, mats.brushedAluminum, mats);
  const jointMat = resolveMaterial(mode, mats.titaniumDark, mats);

  return (
    <group>
      {/* Main Rocker Pivot on Chassis */}
      <mesh
        position={[0.56 * xSign, 0.78, 0.05]}
        rotation={[0, 0, Math.PI / 2]}
        material={jointMat}
        castShadow={mode !== 'preview'}
      >
        <cylinderGeometry args={[0.065, 0.065, 0.18, 16]} />
      </mesh>

      {/* Rocker Forward Strut (Pivot to Front Wheel) */}
      <mesh
        position={[xPos, 0.59, 0.42]}
        rotation={[0.54, 0, xSign * -0.18]}
        material={tubeMat}
        castShadow={mode !== 'preview'}
      >
        <cylinderGeometry args={[0.032, 0.036, 0.84, 12]} />
      </mesh>

      {/* Rocker Rear Link (Pivot to Bogie Pivot) */}
      <mesh
        position={[xPos, 0.65, -0.18]}
        rotation={[-0.58, 0, xSign * -0.16]}
        material={tubeMat}
        castShadow={mode !== 'preview'}
      >
        <cylinderGeometry args={[0.032, 0.032, 0.54, 12]} />
      </mesh>

      {/* Bogie Pivot Joint */}
      <mesh
        position={[0.72 * xSign, 0.51, -0.4]}
        rotation={[0, 0, Math.PI / 2]}
        material={jointMat}
      >
        <cylinderGeometry args={[0.048, 0.048, 0.1, 14]} />
      </mesh>

      {/* Bogie Forward Arm (to Middle Wheel) */}
      <mesh
        position={[0.76 * xSign, 0.42, -0.22]}
        rotation={[1.05, 0, xSign * -0.12]}
        material={tubeMat}
        castShadow={mode !== 'preview'}
      >
        <cylinderGeometry args={[0.026, 0.026, 0.42, 10]} />
      </mesh>

      {/* Bogie Aft Arm (to Rear Wheel) */}
      <mesh
        position={[0.76 * xSign, 0.42, -0.59]}
        rotation={[-1.05, 0, xSign * -0.12]}
        material={tubeMat}
        castShadow={mode !== 'preview'}
      >
        <cylinderGeometry args={[0.026, 0.026, 0.44, 10]} />
      </mesh>
    </group>
  );
};

export const WheelsAssembly: React.FC<ComponentAssemblyProps> = ({
  mode,
  installProgress,
  isTestingActive,
  activationStage,
  activeMechStepId,
  externalWheelSpeedRef,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const mats = useMemo(() => getRoverMaterials(), []);

  useMountSlideAnimation(groupRef, mode, installProgress, [0, -0.45, 0]);

  if (mode === 'hidden') return null;

  const diffMat = resolveMaterial(mode, mats.titaniumDark, mats);
  const rodMat = resolveMaterial(mode, mats.brushedAluminum, mats);

  return (
    <group ref={groupRef}>
      {/* Left & Right Rocker-Bogie Linkages */}
      <SuspensionSide side="left" mode={mode} />
      <SuspensionSide side="right" mode={mode} />

      {/* Differential Crossbar Linkage */}
      <mesh position={[0, 1.07, -0.34]} material={diffMat} castShadow={mode !== 'preview'}>
        <cylinderGeometry args={[0.045, 0.045, 0.08, 16]} />
      </mesh>
      <mesh
        position={[0, 1.07, -0.34]}
        rotation={[0, 0, Math.PI / 2]}
        material={rodMat}
      >
        <cylinderGeometry args={[0.018, 0.018, 1.12, 10]} />
      </mesh>

      {/* 6 Wheels */}
      {WHEEL_POSITIONS.map((pos, idx) => (
        <SingleWheel
          key={idx}
          position={pos}
          side={idx < 3 ? 'left' : 'right'}
          mode={mode}
          isTestingActive={isTestingActive}
          activationStage={activationStage}
          activeMechStepId={activeMechStepId}
          externalWheelSpeedRef={externalWheelSpeedRef}
        />
      ))}
    </group>
  );
};
