import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getRoverMaterials } from '../materials';
import {
  ComponentAssemblyProps,
  resolveMaterial,
  useMountSlideAnimation,
} from './installHelpers';

export const NavCamerasAssembly: React.FC<ComponentAssemblyProps> = ({
  mode,
  installProgress,
  isTestingActive,
  activationStage,
  activeMechStepId,
  lightsOn,
  externalScienceRef,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const headPanRef = useRef<THREE.Group>(null);
  const focusLensRef = useRef<THREE.Mesh>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const flashHaloRef = useRef<THREE.Mesh>(null);
  const mats = useMemo(() => getRoverMaterials(), []);

  useMountSlideAnimation(groupRef, mode, installProgress, [0, 0.85, 0]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const sci = externalScienceRef?.current;
    const activity = mode === 'installed' ? sci?.activity ?? null : null;
    const p = sci?.progress ?? 0;

    if (headPanRef.current) {
      if (activity === 'cameraObs' && sci) {
        // Aim mast cleanly toward target landmark, dip slightly during shutter capture
        const sweepYaw = sci.targetYawOffset + Math.sin(p * Math.PI * 1.4) * 0.28;
        const focusPitch = p > 0.35 && p < 0.8 ? -0.08 : 0.04;
        headPanRef.current.rotation.y = THREE.MathUtils.damp(headPanRef.current.rotation.y, sweepYaw, 6, delta);
        headPanRef.current.rotation.x = THREE.MathUtils.damp(headPanRef.current.rotation.x, focusPitch, 6, delta);
      } else if (activity === 'rockSample' || activity === 'soilComposition') {
        // Tilt camera mast downward toward forward ground work area to monitor sampling
        headPanRef.current.rotation.y = THREE.MathUtils.damp(headPanRef.current.rotation.y, -0.22, 5, delta);
        headPanRef.current.rotation.x = THREE.MathUtils.damp(headPanRef.current.rotation.x, 0.28, 5, delta);
      } else {
        const mechCamActive =
          activationStage === 'mechanical' && (!activeMechStepId || activeMechStepId === 'mech-cam');
        const activeScan =
          mode === 'installed' &&
          (isTestingActive ||
            mechCamActive ||
            activationStage === 'diagnostics' ||
            activationStage === 'ready');
        if (activeScan) {
          const speed = activationStage === 'ready' ? 0.85 : 3.2;
          const amp = activationStage === 'ready' ? 0.35 : 0.65;
          headPanRef.current.rotation.y = Math.sin(t * speed) * amp;
          headPanRef.current.rotation.x = THREE.MathUtils.damp(headPanRef.current.rotation.x, 0, 5, delta);
        } else if (mode === 'installed') {
          headPanRef.current.rotation.y = THREE.MathUtils.damp(
            headPanRef.current.rotation.y,
            Math.sin(t * 0.45) * 0.14,
            3,
            delta
          );
          headPanRef.current.rotation.x = THREE.MathUtils.damp(headPanRef.current.rotation.x, 0, 4, delta);
        }
      }
    }

    // Focus barrel extension during optical observation
    if (focusLensRef.current) {
      const targetZ = activity === 'cameraObs' ? 0.14 + Math.sin(p * Math.PI * 3) * 0.025 : 0.14;
      focusLensRef.current.position.z = THREE.MathUtils.damp(focusLensRef.current.position.z, targetZ, 10, delta);
    }

    // Brief 3D flash burst at shutter capture moment
    const flash = mode === 'installed' ? sci?.cameraFlashIntensity ?? 0 : 0;
    if (flashLightRef.current) {
      flashLightRef.current.intensity = flash * 16;
    }
    if (flashHaloRef.current) {
      flashHaloRef.current.visible = flash > 0.05;
      const s = 0.8 + flash * 1.4;
      flashHaloRef.current.scale.setScalar(s);
    }
  });

  if (mode === 'hidden') return null;

  const whiteMat = resolveMaterial(mode, mats.chassisWhite, mats);
  const darkMat = resolveMaterial(mode, mats.titaniumDark, mats);
  const aluMat = resolveMaterial(mode, mats.brushedAluminum, mats);
  const goldMat = resolveMaterial(mode, mats.kaptonGold, mats);
  const lensMat = resolveMaterial(mode, lightsOn ? mats.cyanEmissive : mats.opticLens, mats);
  const ledMat = resolveMaterial(mode, lightsOn ? mats.amberEmissive : mats.cyanEmissive, mats);

  return (
    <group ref={groupRef}>
      {/* Remote Sensing Mast (Forward Starboard Deck) */}
      <group position={[0.34, 1.07, 0.54]}>
        {/* Mast Base Azimuth Pedestal */}
        <mesh position={[0, 0.05, 0]} material={darkMat} castShadow={mode !== 'preview'}>
          <cylinderGeometry args={[0.09, 0.11, 0.1, 16]} />
        </mesh>

        {/* Gold Thermal Collar */}
        <mesh position={[0, 0.16, 0]} material={goldMat}>
          <cylinderGeometry args={[0.055, 0.06, 0.12, 14]} />
        </mesh>

        {/* Telescopic Mast Column */}
        <mesh position={[0, 0.46, 0]} material={aluMat} castShadow={mode !== 'preview'}>
          <cylinderGeometry args={[0.036, 0.045, 0.62, 14]} />
        </mesh>

        {/* Articulated Camera Head */}
        <group position={[0, 0.8, 0]} ref={headPanRef}>
          {/* Pitch Neck Bracket */}
          <mesh position={[0, -0.04, 0]} material={darkMat}>
            <boxGeometry args={[0.14, 0.08, 0.12]} />
          </mesh>

          {/* Main Optical Box */}
          <mesh position={[0, 0.06, 0.02]} material={whiteMat} castShadow={mode !== 'preview'}>
            <boxGeometry args={[0.34, 0.16, 0.22]} />
          </mesh>

          {/* Top Sun Visor Hood */}
          <mesh position={[0, 0.15, 0.05]} material={aluMat}>
            <boxGeometry args={[0.36, 0.024, 0.26]} />
          </mesh>

          {/* Central ChemCam Cyclops Laser Optic + Focusing Barrel */}
          <mesh
            ref={focusLensRef}
            position={[0, 0.06, 0.14]}
            rotation={[Math.PI / 2, 0, 0]}
            material={darkMat}
          >
            <cylinderGeometry args={[0.052, 0.056, 0.06, 18]} />
          </mesh>
          <mesh
            position={[0, 0.06, 0.17]}
            rotation={[Math.PI / 2, 0, 0]}
            material={lensMat}
          >
            <cylinderGeometry args={[0.038, 0.038, 0.014, 18]} />
          </mesh>

          {/* Camera Shutter Flash Strobe */}
          <pointLight ref={flashLightRef} position={[0, 0.08, 0.42]} color="#fef9c3" intensity={0} distance={8} />
          <mesh ref={flashHaloRef} position={[0, 0.07, 0.21]} visible={false}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.85} />
          </mesh>

          {/* Stereo NavCam Left & Right Lenses */}
          {[-0.11, 0.11].map((xOff, i) => (
            <group key={i} position={[xOff, 0.07, 0.135]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={darkMat}>
                <cylinderGeometry args={[0.028, 0.028, 0.04, 14]} />
              </mesh>
              <mesh position={[0, 0, 0.022]} rotation={[Math.PI / 2, 0, 0]} material={lensMat}>
                <cylinderGeometry args={[0.02, 0.02, 0.01, 14]} />
              </mesh>
            </group>
          ))}

          {/* Mast Status Beacon */}
          <mesh position={[0.14, 0.155, -0.04]} material={ledMat}>
            <boxGeometry args={[0.035, 0.018, 0.035]} />
          </mesh>
        </group>
      </group>

      {/* Forward Stereo Hazard Avoidance Cameras (Hazcams) */}
      {[-0.26, 0.26].map((xOff, i) => (
        <group key={`fhaz-${i}`} position={[xOff, 0.78, 0.84]}>
          <mesh material={darkMat} castShadow={mode !== 'preview'}>
            <boxGeometry args={[0.09, 0.06, 0.05]} />
          </mesh>
          <mesh position={[0, 0, 0.028]} rotation={[Math.PI / 2, 0, 0]} material={lensMat}>
            <cylinderGeometry args={[0.018, 0.018, 0.01, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
