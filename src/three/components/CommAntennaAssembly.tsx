import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getRoverMaterials } from '../materials';
import {
  ComponentAssemblyProps,
  resolveMaterial,
  useMountSlideAnimation,
} from './installHelpers';

export const CommAntennaAssembly: React.FC<ComponentAssemblyProps> = ({
  mode,
  installProgress,
  isTestingActive,
  activationStage,
  activeMechStepId,
  externalScienceRef,
  externalAntennaTracking = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const dishGimbalRef = useRef<THREE.Group>(null);
  const pulseRingRefs = useRef<Array<THREE.Mesh | null>>([]);
  const mats = useMemo(() => getRoverMaterials(), []);

  // Procedural Parabolic High-Gain Dish via LatheGeometry
  const dishGeometry = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const steps = 14;
    const radius = 0.34;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = t * radius;
      const y = 0.11 * t * t;
      pts.push(new THREE.Vector2(r, y));
    }
    // Add lip rim thickness
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const r = t * radius;
      const y = 0.11 * t * t - 0.016;
      pts.push(new THREE.Vector2(r, y));
    }
    return new THREE.LatheGeometry(pts, 32);
  }, []);

  useMountSlideAnimation(groupRef, mode, installProgress, [0, 0.85, -0.3]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const sci = externalScienceRef?.current;
    const isCommPing = mode === 'installed' && sci?.activity === 'commCheck';
    const isTrackingEarth = mode === 'installed' && (isCommPing || externalAntennaTracking);

    if (dishGimbalRef.current) {
      const mechCommActive =
        activationStage === 'mechanical' && (!activeMechStepId || activeMechStepId === 'mech-comm');
      const activeSlew =
        mode === 'installed' &&
        (isTestingActive ||
          mechCommActive ||
          activationStage === 'diagnostics' ||
          activationStage === 'ready');

      if (externalAntennaTracking) {
        // Aim dish high skyward toward Earth in Martian sky with gentle tracking lock
        dishGimbalRef.current.rotation.y = THREE.MathUtils.damp(
          dishGimbalRef.current.rotation.y,
          -0.28 + Math.sin(t * 0.7) * 0.05,
          4,
          delta
        );
        dishGimbalRef.current.rotation.x = THREE.MathUtils.damp(
          dishGimbalRef.current.rotation.x,
          -0.46 + Math.cos(t * 0.5) * 0.03,
          4,
          delta
        );
      } else if (isCommPing) {
        // Sweep skyward across MRO / DSN elevation arc during comm check
        dishGimbalRef.current.rotation.y = THREE.MathUtils.damp(
          dishGimbalRef.current.rotation.y,
          Math.sin(t * 2.8) * 0.65,
          6,
          delta
        );
        dishGimbalRef.current.rotation.x = THREE.MathUtils.damp(
          dishGimbalRef.current.rotation.x,
          -0.42 + Math.cos(t * 2.2) * 0.18,
          6,
          delta
        );
      } else if (activeSlew) {
        const speed = activationStage === 'ready' ? 0.65 : 2.5;
        dishGimbalRef.current.rotation.y = Math.sin(t * speed) * 0.5;
        dishGimbalRef.current.rotation.x = 0.5 + Math.cos(t * speed) * 0.18;
      } else if (mode === 'installed') {
        dishGimbalRef.current.rotation.y = THREE.MathUtils.damp(
          dishGimbalRef.current.rotation.y,
          -0.35 + Math.sin(t * 0.35) * 0.12,
          3,
          delta
        );
        dishGimbalRef.current.rotation.x = THREE.MathUtils.damp(dishGimbalRef.current.rotation.x, 0.58, 3, delta);
      }
    }

    for (let i = 0; i < pulseRingRefs.current.length; i++) {
      const ring = pulseRingRefs.current[i];
      if (!ring) continue;
      ring.visible = isTrackingEarth;
      if (isTrackingEarth) {
        const phase = (t * 1.35 + i * 0.33) % 1;
        ring.position.y = 0.28 + phase * 1.45;
        const sc = 0.6 + phase * 2.8;
        ring.scale.setScalar(sc);
      }
    }
  });

  if (mode === 'hidden') return null;

  const whiteMat = resolveMaterial(mode, mats.chassisWhite, mats);
  const darkMat = resolveMaterial(mode, mats.titaniumDark, mats);
  const aluMat = resolveMaterial(mode, mats.brushedAluminum, mats);
  const goldMat = resolveMaterial(mode, mats.kaptonGold, mats);
  const ledMat = resolveMaterial(mode, mats.cyanEmissive, mats);

  return (
    <group ref={groupRef}>
      {/* High-Gain Parabolic Dish Gimbal (Aft Port Deck) */}
      <group position={[-0.32, 1.07, -0.46]}>
        {/* Pedestal */}
        <mesh position={[0, 0.08, 0]} material={darkMat} castShadow={mode !== 'preview'}>
          <cylinderGeometry args={[0.055, 0.075, 0.16, 14]} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={goldMat}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 14]} />
        </mesh>

        {/* 2-Axis Gimbal Head + Parabolic Dish */}
        <group position={[0, 0.28, 0]} ref={dishGimbalRef} rotation={[0.58, -0.35, 0]}>
          <mesh material={darkMat}>
            <sphereGeometry args={[0.055, 12, 12]} />
          </mesh>

          <mesh
            position={[0, 0.05, 0]}
            geometry={dishGeometry}
            material={whiteMat}
            castShadow={mode !== 'preview'}
          />

          {/* Central Feed Horn & Sub-reflector */}
          <mesh position={[0, 0.16, 0]} material={goldMat}>
            <cylinderGeometry args={[0.024, 0.036, 0.18, 12]} />
          </mesh>
          <mesh position={[0, 0.26, 0]} material={aluMat}>
            <cylinderGeometry args={[0.058, 0.032, 0.032, 16]} />
          </mesh>

          {/* 3 Feed Support Struts */}
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((ang, idx) => (
            <mesh
              key={idx}
              position={[Math.cos(ang) * 0.11, 0.18, Math.sin(ang) * 0.11]}
              rotation={[Math.sin(ang) * 0.65, 0, -Math.cos(ang) * 0.65]}
              material={darkMat}
            >
              <cylinderGeometry args={[0.008, 0.008, 0.24, 8]} />
            </mesh>
          ))}

          {/* Expanding RF Signal Pulses during Comm Check & Phase 7 */}
          {[0, 1, 2].map((idx) => (
            <mesh
              key={`rf-${idx}`}
              ref={(el) => {
                pulseRingRefs.current[idx] = el;
              }}
              position={[0, 0.4, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              visible={false}
            >
              <torusGeometry args={[0.24, 0.014, 8, 28]} />
              <meshBasicMaterial color="#22d3ee" transparent opacity={0.78} />
            </mesh>
          ))}
        </group>
      </group>

      {/* UHF Orbiter Relay Helical Mast (Aft Far-Port) */}
      <group position={[-0.42, 1.07, -0.72]}>
        <mesh position={[0, 0.05, 0]} material={darkMat}>
          <cylinderGeometry args={[0.042, 0.05, 0.1, 12]} />
        </mesh>
        <mesh position={[0, 0.34, 0]} material={aluMat} castShadow={mode !== 'preview'}>
          <cylinderGeometry args={[0.016, 0.022, 0.5, 10]} />
        </mesh>
        <mesh position={[0, 0.61, 0]} material={ledMat}>
          <sphereGeometry args={[0.026, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
};
