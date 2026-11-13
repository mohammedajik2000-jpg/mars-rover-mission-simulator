import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { getRoverMaterials } from '../materials';
import * as THREE from 'three';
import {
  ComponentAssemblyProps,
  resolveMaterial,
  useMountSlideAnimation,
} from './installHelpers';

export const ScienceInstrumentsAssembly: React.FC<ComponentAssemblyProps> = ({
  mode,
  installProgress,
  isTestingActive,
  externalScienceRef,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const thermalProbeRef = useRef<THREE.Group>(null);
  const thermalTipRef = useRef<THREE.Mesh>(null);
  const inletGlowRef = useRef<THREE.Mesh>(null);
  const mats = useMemo(() => getRoverMaterials(), []);

  useMountSlideAnimation(groupRef, mode, installProgress, [-0.55, 0.55, 0]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const sci = externalScienceRef?.current;
    const activity = mode === 'installed' ? sci?.activity ?? null : null;
    const p = sci?.progress ?? 0;

    if (thermalProbeRef.current) {
      const targetPosY = activity === 'surfaceTemp' ? 0.25 + Math.sin(t * 7) * 0.025 : 0.04;
      thermalProbeRef.current.position.y = THREE.MathUtils.damp(
        thermalProbeRef.current.position.y,
        targetPosY,
        7,
        delta
      );
      if (activity === 'surfaceTemp') {
        thermalProbeRef.current.rotation.y += delta * 2.8;
      }
    }

    if (thermalTipRef.current) {
      thermalTipRef.current.visible = activity === 'surfaceTemp';
      const s = 1 + Math.sin(t * 14) * 0.25;
      thermalTipRef.current.scale.setScalar(s);
    }

    if (inletGlowRef.current) {
      const isReceivingSample =
        (activity === 'rockSample' || activity === 'soilComposition') && p >= 0.64 && p <= 0.88;
      inletGlowRef.current.visible = isReceivingSample;
      if (isReceivingSample) {
        const s = 1 + Math.sin(t * 10) * 0.14;
        inletGlowRef.current.scale.setScalar(s);
      }
    }
  });

  if (mode === 'hidden') return null;

  const whiteMat = resolveMaterial(mode, mats.chassisWhite, mats);
  const darkMat = resolveMaterial(mode, mats.titaniumDark, mats);
  const goldMat = resolveMaterial(mode, mats.kaptonGold, mats);
  const aluMat = resolveMaterial(mode, mats.brushedAluminum, mats);
  const copperMat = resolveMaterial(mode, mats.copperAccent, mats);
  const lensMat = resolveMaterial(mode, mats.opticLens, mats);
  const statusMat = resolveMaterial(
    mode,
    isTestingActive ? mats.amberEmissive : mats.cyanEmissive,
    mats
  );

  return (
    <group ref={groupRef}>
      {/* Upper Deck Raman UV Spectrometer & Atmospheric Lab (Port Forward Deck) */}
      <group position={[-0.24, 1.18, 0.24]}>
        <mesh material={whiteMat} castShadow={mode !== 'preview'}>
          <boxGeometry args={[0.38, 0.2, 0.44]} />
        </mesh>
        {/* Gold MLI Thermal Shroud */}
        <mesh position={[-0.195, 0, 0]} material={goldMat}>
          <boxGeometry args={[0.02, 0.17, 0.38]} />
        </mesh>
        {/* Atmospheric Intake Louvers */}
        <mesh position={[0, 0.11, -0.06]} material={darkMat}>
          <boxGeometry args={[0.28, 0.03, 0.22]} />
        </mesh>
        {/* UV Laser Spectrometer Aperture */}
        <mesh position={[0, 0.02, 0.23]} rotation={[Math.PI / 2, 0, 0]} material={darkMat}>
          <cylinderGeometry args={[0.048, 0.052, 0.04, 16]} />
        </mesh>
        <mesh position={[0, 0.02, 0.25]} rotation={[Math.PI / 2, 0, 0]} material={lensMat}>
          <cylinderGeometry args={[0.034, 0.034, 0.012, 16]} />
        </mesh>
        {/* Calibration Status Bar */}
        <mesh position={[0.14, 0.105, 0.14]} material={statusMat}>
          <boxGeometry args={[0.06, 0.015, 0.08]} />
        </mesh>

        {/* MEDA Telescopic Surface Temperature Probe Rod */}
        <group ref={thermalProbeRef} position={[-0.12, 0.04, -0.14]}>
          <mesh material={aluMat}>
            <cylinderGeometry args={[0.014, 0.018, 0.34, 10]} />
          </mesh>
          <mesh position={[0, 0.17, 0]} material={copperMat}>
            <boxGeometry args={[0.09, 0.018, 0.022]} />
          </mesh>
          <mesh ref={thermalTipRef} position={[0, 0.2, 0]} material={mats.amberEmissive} visible={false}>
            <sphereGeometry args={[0.036, 12, 12]} />
          </mesh>
        </group>
      </group>

      {/* Forward Sample Inlet & Regolith Analyzer Funnel */}
      <group position={[0.04, 1.13, 0.62]}>
        <mesh material={aluMat} castShadow={mode !== 'preview'}>
          <cylinderGeometry args={[0.085, 0.045, 0.12, 16]} />
        </mesh>
        <mesh position={[0, 0.065, 0]} material={copperMat}>
          <torusGeometry args={[0.085, 0.012, 10, 20]} />
        </mesh>
        <mesh ref={inletGlowRef} position={[0, 0.075, 0]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
          <torusGeometry args={[0.11, 0.014, 10, 24]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.9} />
        </mesh>
      </group>

      {/* Ventral Ground-Penetrating Radar Plate (Under-Belly) */}
      <group position={[0, 0.64, -0.05]}>
        <mesh material={darkMat}>
          <boxGeometry args={[0.64, 0.04, 0.56]} />
        </mesh>
        <mesh position={[0, -0.024, 0]} material={copperMat}>
          <boxGeometry args={[0.56, 0.012, 0.46]} />
        </mesh>
      </group>
    </group>
  );
};
