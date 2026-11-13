import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getRoverMaterials } from '../materials';
import {
  ComponentAssemblyProps,
  resolveMaterial,
  useMountSlideAnimation,
} from './installHelpers';

export const RoboticArmAssembly: React.FC<ComponentAssemblyProps> = ({
  mode,
  installProgress,
  isTestingActive,
  activationStage,
  activeMechStepId,
  externalArmActiveRef,
  externalScienceRef,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const shoulderRef = useRef<THREE.Group>(null);
  const elbowRef = useRef<THREE.Group>(null);
  const turretRef = useRef<THREE.Group>(null);
  const rockSamplePodRef = useRef<THREE.Group>(null);
  const soilSamplePodRef = useRef<THREE.Group>(null);
  const mats = useMemo(() => getRoverMaterials(), []);

  useMountSlideAnimation(groupRef, mode, installProgress, [0, 0.15, 0.9]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const sci = externalScienceRef?.current;
    const activity = mode === 'installed' ? sci?.activity ?? null : null;
    const p = sci?.progress ?? 0;

    // Hide sample pods unless inside sample-collection transfer stages
    if (rockSamplePodRef.current) {
      rockSamplePodRef.current.visible = activity === 'rockSample' && p >= 0.56 && p <= 0.88;
    }
    if (soilSamplePodRef.current) {
      soilSamplePodRef.current.visible = activity === 'soilComposition' && p >= 0.56 && p <= 0.88;
    }

    if (activity === 'rockSample') {
      // 8-stage rock drilling & core container deposit sequence
      let targetShoulderX = 0;
      let targetShoulderY = 0.04;
      let targetElbowX = 0.55;
      let targetTurretZPos = 0.34;

      if (p < 0.22) {
        // Move arm down toward rock outcrop
        const k = THREE.MathUtils.smoothstep(p, 0.04, 0.22);
        targetShoulderX = 0.44 * k;
        targetShoulderY = THREE.MathUtils.lerp(0.18, -0.04, k);
        targetElbowX = THREE.MathUtils.lerp(0.55, 0.96, k);
      } else if (p < 0.58) {
        // Percussive rotary drilling against rock
        targetShoulderX = 0.44;
        targetShoulderY = -0.04 + Math.sin(t * 26) * 0.01;
        targetElbowX = 0.96 + Math.cos(t * 32) * 0.014;
        targetTurretZPos = 0.34 + Math.sin(t * 46) * 0.018;
        if (turretRef.current) {
          turretRef.current.rotation.z += delta * 18;
        }
      } else if (p < 0.84) {
        // Lift core sample container up to deck analyzer inlet
        const k = THREE.MathUtils.smoothstep(p, 0.58, 0.76);
        targetShoulderX = THREE.MathUtils.lerp(0.44, -0.18, k);
        targetShoulderY = THREE.MathUtils.lerp(-0.04, -0.22, k);
        targetElbowX = THREE.MathUtils.lerp(0.96, 0.34, k);
      } else {
        // Return cleanly to rest position
        const k = THREE.MathUtils.smoothstep(p, 0.84, 1.0);
        targetShoulderX = THREE.MathUtils.lerp(-0.18, 0, k);
        targetShoulderY = THREE.MathUtils.lerp(-0.22, 0.18, k);
        targetElbowX = THREE.MathUtils.lerp(0.34, 0.55, k);
      }

      if (shoulderRef.current) {
        shoulderRef.current.rotation.x = THREE.MathUtils.damp(shoulderRef.current.rotation.x, targetShoulderX, 8, delta);
        shoulderRef.current.rotation.y = THREE.MathUtils.damp(shoulderRef.current.rotation.y, targetShoulderY, 8, delta);
      }
      if (elbowRef.current) {
        elbowRef.current.rotation.x = THREE.MathUtils.damp(elbowRef.current.rotation.x, targetElbowX, 8, delta);
      }
      if (turretRef.current) {
        turretRef.current.position.z = targetTurretZPos;
      }
      return;
    }

    if (activity === 'soilComposition') {
      // Distinct regolith trench scooping sequence (wide lateral scraping sweeps)
      let targetShoulderX = 0;
      let targetShoulderY = 0.18;
      let targetElbowX = 0.55;
      let targetTurretSpin = 0;

      if (p < 0.2) {
        const k = THREE.MathUtils.smoothstep(p, 0.04, 0.2);
        targetShoulderX = 0.54 * k;
        targetShoulderY = 0.18 * (1 - k);
        targetElbowX = THREE.MathUtils.lerp(0.55, 1.04, k);
      } else if (p < 0.58) {
        // Slow wide lateral trenching & regolith scoop pass
        const sweep = Math.sin(t * 4.2);
        targetShoulderX = 0.54 - Math.abs(sweep) * 0.05;
        targetShoulderY = sweep * 0.38;
        targetElbowX = 1.02 + Math.cos(t * 4.2) * 0.09;
        targetTurretSpin = sweep * 0.55;
      } else if (p < 0.84) {
        // Lift scooped regolith capsule up to deck analyzer inlet
        const k = THREE.MathUtils.smoothstep(p, 0.58, 0.76);
        targetShoulderX = THREE.MathUtils.lerp(0.54, -0.18, k);
        targetShoulderY = THREE.MathUtils.lerp(0, -0.22, k);
        targetElbowX = THREE.MathUtils.lerp(1.02, 0.34, k);
      } else {
        const k = THREE.MathUtils.smoothstep(p, 0.84, 1.0);
        targetShoulderX = THREE.MathUtils.lerp(-0.18, 0, k);
        targetShoulderY = THREE.MathUtils.lerp(-0.22, 0.18, k);
        targetElbowX = THREE.MathUtils.lerp(0.34, 0.55, k);
      }

      if (shoulderRef.current) {
        shoulderRef.current.rotation.x = THREE.MathUtils.damp(shoulderRef.current.rotation.x, targetShoulderX, 7, delta);
        shoulderRef.current.rotation.y = THREE.MathUtils.damp(shoulderRef.current.rotation.y, targetShoulderY, 7, delta);
      }
      if (elbowRef.current) {
        elbowRef.current.rotation.x = THREE.MathUtils.damp(elbowRef.current.rotation.x, targetElbowX, 7, delta);
      }
      if (turretRef.current) {
        turretRef.current.position.z = 0.34;
        turretRef.current.rotation.z = THREE.MathUtils.damp(turretRef.current.rotation.z, targetTurretSpin, 7, delta);
      }
      return;
    }

    const mechArmActive =
      activationStage === 'mechanical' && (!activeMechStepId || activeMechStepId === 'mech-arm');
    const armActive =
      mode === 'installed' &&
      (activity === 'roboticArm' ||
        Boolean(externalArmActiveRef?.current) ||
        isTestingActive ||
        mechArmActive ||
        activationStage === 'diagnostics');

    if (armActive) {
      if (shoulderRef.current) {
        shoulderRef.current.rotation.x = THREE.MathUtils.damp(shoulderRef.current.rotation.x, 0.14, 6, delta);
        shoulderRef.current.rotation.y = Math.sin(t * 2.2) * 0.36;
      }
      if (elbowRef.current) {
        elbowRef.current.rotation.x = 0.44 + Math.sin(t * 2.8) * 0.28;
      }
      if (turretRef.current) {
        turretRef.current.position.z = 0.34;
        turretRef.current.rotation.z += delta * 4.8;
      }
    } else if (mode === 'installed') {
      if (shoulderRef.current) {
        shoulderRef.current.rotation.x = THREE.MathUtils.damp(shoulderRef.current.rotation.x, 0, 5, delta);
        shoulderRef.current.rotation.y = THREE.MathUtils.damp(
          shoulderRef.current.rotation.y,
          activationStage === 'ready' ? 0.05 : 0.18,
          4,
          delta
        );
      }
      if (elbowRef.current) {
        elbowRef.current.rotation.x = THREE.MathUtils.damp(
          elbowRef.current.rotation.x,
          activationStage === 'ready' ? 0.35 : 0.55,
          4,
          delta
        );
      }
      if (turretRef.current) {
        turretRef.current.position.z = 0.34;
      }
    }
  });

  if (mode === 'hidden') return null;

  const darkMat = resolveMaterial(mode, mats.titaniumDark, mats);
  const aluMat = resolveMaterial(mode, mats.brushedAluminum, mats);
  const whiteMat = resolveMaterial(mode, mats.chassisWhite, mats);
  const goldMat = resolveMaterial(mode, mats.kaptonGold, mats);
  const copperMat = resolveMaterial(mode, mats.copperAccent, mats);
  const lensMat = resolveMaterial(mode, mats.opticLens, mats);

  return (
    <group ref={groupRef}>
      {/* Forward Bulkhead Arm Mount */}
      <group position={[-0.14, 0.88, 0.84]}>
        {/* Mounting Collar */}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={darkMat} castShadow={mode !== 'preview'}>
          <cylinderGeometry args={[0.09, 0.105, 0.1, 16]} />
        </mesh>

        {/* Shoulder Azimuth/Elevation Joint */}
        <group ref={shoulderRef} position={[0, 0, 0.08]} rotation={[0, 0.18, 0]}>
          <mesh material={goldMat}>
            <cylinderGeometry args={[0.068, 0.068, 0.14, 14]} />
          </mesh>

          {/* Upper Arm Boom */}
          <mesh position={[0, 0.08, 0.26]} rotation={[1.25, 0, 0]} material={aluMat} castShadow={mode !== 'preview'}>
            <boxGeometry args={[0.07, 0.56, 0.075]} />
          </mesh>

          {/* Upper Arm Hydraulic/Cable Conduit */}
          <mesh position={[0.045, 0.11, 0.26]} rotation={[1.25, 0, 0]} material={copperMat}>
            <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
          </mesh>

          {/* Elbow Joint */}
          <group ref={elbowRef} position={[0, 0.16, 0.52]} rotation={[0.55, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={darkMat}>
              <cylinderGeometry args={[0.058, 0.058, 0.13, 14]} />
            </mesh>

            {/* Forearm Linkage */}
            <mesh position={[0, -0.22, 0.18]} rotation={[-0.65, 0, 0]} material={whiteMat} castShadow={mode !== 'preview'}>
              <boxGeometry args={[0.06, 0.48, 0.06]} />
            </mesh>

            {/* Wrist & Coring Drill Turret */}
            <group position={[0, -0.42, 0.34]} ref={turretRef}>
              <mesh material={darkMat} castShadow={mode !== 'preview'}>
                <cylinderGeometry args={[0.11, 0.11, 0.12, 18]} />
              </mesh>

              {/* Rotary Percussive Coring Drill */}
              <mesh position={[0, -0.02, 0.14]} rotation={[Math.PI / 2, 0, 0]} material={aluMat}>
                <cylinderGeometry args={[0.032, 0.048, 0.18, 12]} />
              </mesh>
              <mesh position={[0, -0.02, 0.26]} rotation={[Math.PI / 2, 0, 0]} material={copperMat}>
                <coneGeometry args={[0.028, 0.08, 12]} />
              </mesh>

              {/* Contact Spectrometer Window */}
              <mesh position={[0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={lensMat}>
                <cylinderGeometry args={[0.036, 0.036, 0.04, 14]} />
              </mesh>

              {/* Abrasion Brush Head */}
              <mesh position={[-0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={goldMat}>
                <cylinderGeometry args={[0.04, 0.04, 0.05, 12]} />
              </mesh>

              {/* Visible Rock Core Sample Container (appears after drilling) */}
              <group ref={rockSamplePodRef} position={[0, -0.08, 0.14]} visible={false}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.kaptonGold}>
                  <cylinderGeometry args={[0.032, 0.032, 0.12, 14]} />
                </mesh>
                <mesh position={[0, 0, 0.065]} rotation={[Math.PI / 2, 0, 0]} material={mats.cyanEmissive}>
                  <cylinderGeometry args={[0.022, 0.022, 0.018, 12]} />
                </mesh>
              </group>

              {/* Visible Martian Soil Sample Scoop Container (appears after scooping) */}
              <group ref={soilSamplePodRef} position={[0, -0.09, 0.1]} visible={false}>
                <mesh material={mats.brushedAluminum}>
                  <cylinderGeometry args={[0.044, 0.034, 0.08, 14]} />
                </mesh>
                <mesh position={[0, 0.038, 0]}>
                  <sphereGeometry args={[0.036, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                  <meshStandardMaterial color="#b4532a" roughness={0.94} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
