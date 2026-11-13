import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getRoverMaterials } from '../materials';
import {
  ComponentAssemblyProps,
  resolveMaterial,
  useMountSlideAnimation,
} from './installHelpers';

export const SolarPanelsAssembly: React.FC<ComponentAssemblyProps> = ({
  mode,
  installProgress,
  activationStage,
  activeMechStepId,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const mats = useMemo(() => getRoverMaterials(), []);

  useMountSlideAnimation(groupRef, mode, installProgress, [0, 0.75, 0]);

  useFrame((_, delta) => {
    const solarStartedInMech =
      activationStage === 'mechanical' && activeMechStepId !== 'mech-wheels';
    const deployedInPhase2 =
      solarStartedInMech ||
      activationStage === 'diagnostics' ||
      activationStage === 'ready';
    const targetDeploy =
      mode === 'installed'
        ? deployedInPhase2
          ? -0.04
          : 0.24
        : mode === 'installing'
          ? 0.55
          : 0.14;
    if (leftWingRef.current) {
      leftWingRef.current.rotation.z = THREE.MathUtils.damp(
        leftWingRef.current.rotation.z,
        targetDeploy,
        6,
        delta
      );
    }
    if (rightWingRef.current) {
      rightWingRef.current.rotation.z = THREE.MathUtils.damp(
        rightWingRef.current.rotation.z,
        -targetDeploy,
        6,
        delta
      );
    }
  });

  if (mode === 'hidden') return null;

  const frameMat = resolveMaterial(mode, mats.kaptonGold, mats);
  const darkMat = resolveMaterial(mode, mats.carbonComposite, mats);
  const cellMat = resolveMaterial(mode, mats.solarCell, mats);
  const aluMat = resolveMaterial(mode, mats.brushedAluminum, mats);

  return (
    <group ref={groupRef}>
      {/* Aft Center Deck Photovoltaic Panel */}
      <group position={[0, 1.09, -0.32]}>
        <mesh material={darkMat} castShadow={mode !== 'preview'}>
          <boxGeometry args={[0.88, 0.032, 0.72]} />
        </mesh>
        <mesh position={[0, 0.018, 0]} material={cellMat}>
          <boxGeometry args={[0.82, 0.008, 0.66]} />
        </mesh>
      </group>

      {/* Left Wing Hinge & Deployable Solar Array */}
      <group position={[-0.48, 1.09, -0.22]} ref={leftWingRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={aluMat}>
          <cylinderGeometry args={[0.025, 0.025, 0.56, 12]} />
        </mesh>
        <mesh position={[-0.44, 0, 0]} material={frameMat} castShadow={mode !== 'preview'}>
          <boxGeometry args={[0.82, 0.028, 0.86]} />
        </mesh>
        <mesh position={[-0.44, 0.017, 0]} material={cellMat}>
          <boxGeometry args={[0.76, 0.008, 0.8]} />
        </mesh>
        {/* Under-wing Support Strut */}
        <mesh position={[-0.36, -0.024, 0.25]} material={darkMat}>
          <boxGeometry args={[0.68, 0.018, 0.03]} />
        </mesh>
        <mesh position={[-0.36, -0.024, -0.25]} material={darkMat}>
          <boxGeometry args={[0.68, 0.018, 0.03]} />
        </mesh>
      </group>

      {/* Right Wing Hinge & Deployable Solar Array */}
      <group position={[0.48, 1.09, -0.22]} ref={rightWingRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={aluMat}>
          <cylinderGeometry args={[0.025, 0.025, 0.56, 12]} />
        </mesh>
        <mesh position={[0.44, 0, 0]} material={frameMat} castShadow={mode !== 'preview'}>
          <boxGeometry args={[0.82, 0.028, 0.86]} />
        </mesh>
        <mesh position={[0.44, 0.017, 0]} material={cellMat}>
          <boxGeometry args={[0.76, 0.008, 0.8]} />
        </mesh>
        <mesh position={[0.36, -0.024, 0.25]} material={darkMat}>
          <boxGeometry args={[0.68, 0.018, 0.03]} />
        </mesh>
        <mesh position={[0.36, -0.024, -0.25]} material={darkMat}>
          <boxGeometry args={[0.68, 0.018, 0.03]} />
        </mesh>
      </group>
    </group>
  );
};
