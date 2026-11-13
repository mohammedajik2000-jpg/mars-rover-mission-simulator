import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getRoverMaterials } from './materials';
import { COMPONENT_BY_ID } from '../data/roverComponents';
import { ActivationSequenceStage, ComponentId, ScienceAnimState } from '../types/mission';
import { ComponentRenderMode } from './components/installHelpers';
import { WheelsAssembly } from './components/WheelsAssembly';
import { BatteryAssembly } from './components/BatteryAssembly';
import { SolarPanelsAssembly } from './components/SolarPanelsAssembly';
import { NavCamerasAssembly } from './components/NavCamerasAssembly';
import { CommAntennaAssembly } from './components/CommAntennaAssembly';
import { RoboticArmAssembly } from './components/RoboticArmAssembly';
import { ScienceInstrumentsAssembly } from './components/ScienceInstrumentsAssembly';

interface RoverModelProps {
  installedComponents: Record<ComponentId, boolean>;
  selectedComponentId: ComponentId;
  installingComponentId: ComponentId | null;
  installProgress: number;
  isTestingActive: boolean;
  activationStage: ActivationSequenceStage;
  lightsOn: boolean;
  computerOnline: boolean;
  activeMechStepId?: string | null;
  isDragging?: boolean;
  dropZoneAligned?: boolean;
  externalWheelSpeedRef?: React.MutableRefObject<number>;
  externalArmActiveRef?: React.MutableRefObject<boolean>;
  externalScienceRef?: React.MutableRefObject<ScienceAnimState>;
  externalAntennaTracking?: boolean;
}

const JACK_POSITIONS: Array<[number, number]> = [
  [-0.38, 0.54],
  [0.38, 0.54],
  [-0.38, -0.54],
  [0.38, -0.54],
];

const MountHighlightBeacon: React.FC<{
  position: [number, number, number];
  isDragging?: boolean;
  isAligned?: boolean;
}> = ({ position, isDragging = false, isAligned = false }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const mats = useMemo(() => getRoverMaterials(), []);
  const activeMat = isAligned ? mats.emeraldEmissive : mats.cyanEmissive;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      const base = isDragging ? (isAligned ? 1.35 : 1.18) : 1.0;
      const s = base + Math.sin(t * (isDragging ? 6 : 4)) * 0.12;
      ringRef.current.scale.setScalar(s);
      ringRef.current.rotation.z = t * (isAligned ? 2.2 : 0.9);
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = -t * 1.4;
      const s2 = (isAligned ? 1.15 : 1.0) + Math.cos(t * 5) * 0.08;
      outerRingRef.current.scale.setScalar(s2);
    }
  });

  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} material={activeMat}>
        <ringGeometry args={[0.16, 0.21, 24]} />
      </mesh>
      {isDragging && (
        <>
          <mesh ref={outerRingRef} rotation={[-Math.PI / 2, 0, 0]} material={activeMat}>
            <ringGeometry args={[0.29, 0.33, 6]} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.025, 0.14, 0.48, 16, 1, true]} />
            <meshBasicMaterial
              color={isAligned ? '#10b981' : '#06b6d4'}
              transparent
              opacity={isAligned ? 0.32 : 0.16}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </group>
  );
};

export const RoverModel: React.FC<RoverModelProps> = ({
  installedComponents,
  selectedComponentId,
  installingComponentId,
  installProgress,
  isTestingActive,
  activationStage,
  lightsOn,
  computerOnline,
  activeMechStepId = null,
  isDragging = false,
  dropZoneAligned = false,
  externalWheelSpeedRef,
  externalArmActiveRef,
  externalScienceRef,
  externalAntennaTracking = false,
}) => {
  const mats = useMemo(() => getRoverMaterials(), []);
  const jacksRef = useRef<THREE.Group>(null);

  // Beveled octagonal Warm Electronics Box (WEB) hull geometry
  const chassisHullGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 0.52;
    const d = 0.82;
    const ch = 0.12;
    shape.moveTo(-w + ch, -d);
    shape.lineTo(w - ch, -d);
    shape.lineTo(w, -d + ch);
    shape.lineTo(w, d - ch);
    shape.lineTo(w - ch, d);
    shape.lineTo(-w + ch, d);
    shape.lineTo(-w, d - ch);
    shape.lineTo(-w, -d + ch);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const getMode = (id: ComponentId): ComponentRenderMode => {
    if (installedComponents[id]) return 'installed';
    if (installingComponentId === id) return 'installing';
    if (selectedComponentId === id) return 'preview';
    return 'hidden';
  };

  const selectedSpec = COMPONENT_BY_ID[selectedComponentId];
  const showMountBeacon =
    !installedComponents[selectedComponentId] && installingComponentId !== selectedComponentId;

  // Retract assembly stand jacks smoothly once wheels are installed
  useFrame((_, delta) => {
    if (!jacksRef.current) return;
    const wheelsMounted = installedComponents.wheels;
    const targetY = wheelsMounted ? -0.68 : 0;
    jacksRef.current.position.y = THREE.MathUtils.damp(
      jacksRef.current.position.y,
      targetY,
      7,
      delta
    );
  });

  return (
    <group>
      {/* Retractable Assembly Bay Support Jacks (ground contact when wheels not installed) */}
      <group ref={jacksRef}>
        {JACK_POSITIONS.map(([x, z], idx) => (
          <group key={idx} position={[x, 0, z]}>
            <mesh position={[0, 0.015, 0]} material={mats.titaniumDark} receiveShadow>
              <cylinderGeometry args={[0.09, 0.11, 0.03, 14]} />
            </mesh>
            <mesh position={[0, 0.34, 0]} material={mats.brushedAluminum} castShadow>
              <cylinderGeometry args={[0.034, 0.044, 0.64, 12]} />
            </mesh>
            <mesh position={[0, 0.56, 0]} material={mats.amberEmissive}>
              <cylinderGeometry args={[0.042, 0.042, 0.04, 12]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* BASE ROVER CHASSIS (Warm Electronics Box - WEB) */}
      <group>
        <mesh
          position={[0, 0.69, 0]}
          geometry={chassisHullGeo}
          material={mats.chassisWhite}
          castShadow
          receiveShadow
        />

        <mesh position={[0, 1.06, 0]} material={mats.brushedAluminum} castShadow receiveShadow>
          <boxGeometry args={[0.96, 0.032, 1.56]} />
        </mesh>

        <mesh position={[0, 0.665, 0]} material={mats.titaniumDark} castShadow>
          <boxGeometry args={[0.88, 0.035, 1.44]} />
        </mesh>

        <mesh position={[-0.535, 0.86, 0]} material={mats.kaptonGold} castShadow>
          <boxGeometry args={[0.025, 0.24, 1.18]} />
        </mesh>
        <mesh position={[0.535, 0.86, 0]} material={mats.kaptonGold} castShadow>
          <boxGeometry args={[0.025, 0.24, 1.18]} />
        </mesh>

        {[-0.45, 0, 0.45].map((zOff, idx) => (
          <mesh key={idx} position={[0, 0.86, zOff]} material={mats.titaniumDark}>
            <boxGeometry args={[1.11, 0.27, 0.045]} />
          </mesh>
        ))}

        <mesh position={[0, 0.86, 0.825]} material={mats.titaniumDark}>
          <boxGeometry args={[0.74, 0.24, 0.035]} />
        </mesh>
        <mesh position={[0, 0.86, 0.845]} material={mats.kaptonGold}>
          <boxGeometry args={[0.42, 0.16, 0.015]} />
        </mesh>

        {/* Forward Chassis Headlights (Illuminate during Phase 2 Power Activation) */}
        {[-0.3, 0.3].map((xPos, idx) => (
          <group key={`headlight-${idx}`} position={[xPos, 0.92, 0.845]}>
            <mesh material={mats.titaniumDark}>
              <boxGeometry args={[0.09, 0.045, 0.02]} />
            </mesh>
            <mesh
              position={[0, 0, 0.012]}
              material={lightsOn ? mats.cyanEmissive : mats.opticLens}
            >
              <boxGeometry args={[0.072, 0.028, 0.008]} />
            </mesh>
          </group>
        ))}

        {lightsOn && (
          <pointLight position={[0, 0.95, 1.25]} intensity={2.4} distance={5.5} color="#a5f3fc" />
        )}

        {[-0.54, 0.54].map((xPos, idx) => (
          <mesh
            key={idx}
            position={[xPos, 0.78, 0.05]}
            rotation={[0, 0, Math.PI / 2]}
            material={mats.titaniumDark}
          >
            <cylinderGeometry args={[0.075, 0.075, 0.06, 16]} />
          </mesh>
        ))}

        <mesh position={[0.34, 1.08, 0.54]} material={mats.titaniumDark}>
          <cylinderGeometry args={[0.1, 0.11, 0.02, 16]} />
        </mesh>
        <mesh position={[-0.32, 1.08, -0.46]} material={mats.titaniumDark}>
          <cylinderGeometry args={[0.09, 0.1, 0.02, 16]} />
        </mesh>
        <mesh
          position={[-0.14, 0.88, 0.84]}
          rotation={[Math.PI / 2, 0, 0]}
          material={mats.brushedAluminum}
        >
          <cylinderGeometry args={[0.085, 0.085, 0.03, 16]} />
        </mesh>

        {/* Core Flight Computer Beacon */}
        <mesh
          position={[0.36, 1.08, -0.68]}
          material={
            computerOnline
              ? mats.cyanEmissive
              : isTestingActive || lightsOn
                ? mats.amberEmissive
                : mats.titaniumDark
          }
        >
          <boxGeometry args={[0.065, 0.02, 0.065]} />
        </mesh>
      </group>

      {/* Selected Mount Position Highlight Beacon */}
      {showMountBeacon && (
        <MountHighlightBeacon
          position={selectedSpec.mountHighlightPos}
          isDragging={isDragging}
          isAligned={dropZoneAligned}
        />
      )}

      {/* INSTALLABLE SUBSYSTEM ASSEMBLIES */}
      <WheelsAssembly
        mode={getMode('wheels')}
        installProgress={installingComponentId === 'wheels' ? installProgress : 100}
        isTestingActive={isTestingActive}
        activationStage={activationStage}
        activeMechStepId={activeMechStepId}
        externalWheelSpeedRef={externalWheelSpeedRef}
      />
      <BatteryAssembly
        mode={getMode('battery')}
        installProgress={installingComponentId === 'battery' ? installProgress : 100}
        isTestingActive={isTestingActive || lightsOn}
      />
      <SolarPanelsAssembly
        mode={getMode('solarPanels')}
        installProgress={installingComponentId === 'solarPanels' ? installProgress : 100}
        activationStage={activationStage}
        activeMechStepId={activeMechStepId}
      />
      <NavCamerasAssembly
        mode={getMode('navCameras')}
        installProgress={installingComponentId === 'navCameras' ? installProgress : 100}
        isTestingActive={isTestingActive}
        activationStage={activationStage}
        activeMechStepId={activeMechStepId}
        lightsOn={lightsOn}
        externalScienceRef={externalScienceRef}
      />
      <CommAntennaAssembly
        mode={getMode('commAntenna')}
        installProgress={installingComponentId === 'commAntenna' ? installProgress : 100}
        isTestingActive={isTestingActive}
        activationStage={activationStage}
        activeMechStepId={activeMechStepId}
        externalScienceRef={externalScienceRef}
        externalAntennaTracking={externalAntennaTracking}
      />
      <RoboticArmAssembly
        mode={getMode('roboticArm')}
        installProgress={installingComponentId === 'roboticArm' ? installProgress : 100}
        isTestingActive={isTestingActive}
        activationStage={activationStage}
        activeMechStepId={activeMechStepId}
        externalArmActiveRef={externalArmActiveRef}
        externalScienceRef={externalScienceRef}
      />
      <ScienceInstrumentsAssembly
        mode={getMode('scienceInstruments')}
        installProgress={installingComponentId === 'scienceInstruments' ? installProgress : 100}
        isTestingActive={isTestingActive || lightsOn}
        externalScienceRef={externalScienceRef}
      />
    </group>
  );
};
