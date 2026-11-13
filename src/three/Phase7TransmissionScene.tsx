import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ActivationSequenceStage, ComponentId, TransmissionStage } from '../types/mission';
import { RoverModel } from './RoverModel';
import { getMarsTerrainHeight } from './MarsExplorationScene';
import {
  createAtmosphereGlowMaterial,
  getEarthAlbedoTexture,
  getEarthCloudTexture,
} from './planetaryTextures';

interface Phase7TransmissionSceneProps {
  installedComponents: Record<ComponentId, boolean>;
  activationStage: ActivationSequenceStage;
  lightsOn: boolean;
  computerOnline: boolean;
  transmissionStage: TransmissionStage;
  isSoftwareGl: boolean;
}

const EARTH_SKY_POS = new THREE.Vector3(-18, 16, -48);
const DISH_WORLD_POS = new THREE.Vector3(-0.24, 1.05, -0.34);
const PACKET_COUNT = 8;

const _packetPos = new THREE.Vector3();

export const Phase7TransmissionScene: React.FC<Phase7TransmissionSceneProps> = ({
  installedComponents,
  activationStage,
  lightsOn,
  computerOnline,
  transmissionStage,
  isSoftwareGl,
}) => {
  const earthGroupRef = useRef<THREE.Group>(null);
  const earthCloudRef = useRef<THREE.Mesh>(null);
  const packetRefs = useRef<Array<THREE.Mesh | null>>([]);
  const beamRef = useRef<THREE.Mesh>(null);

  const earthAlbedo = useMemo(() => getEarthAlbedoTexture(), []);
  const earthClouds = useMemo(() => getEarthCloudTexture(), []);
  const earthAtmosMat = useMemo(() => createAtmosphereGlowMaterial('#38bdf8', 0.55), []);

  // Build Martian ground terrain
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(140, 140, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const cLow = new THREE.Color('#6b2d16');
    const cHigh = new THREE.Color('#c86f40');
    const cTmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getMarsTerrainHeight(x, z);
      pos.setY(i, y);
      const hNorm = THREE.MathUtils.clamp((y + 1.2) / 3.2, 0, 1);
      cTmp.copy(cLow).lerp(cHigh, hNorm);
      colors[i * 3] = cTmp.r;
      colors[i * 3 + 1] = cTmp.g;
      colors[i * 3 + 2] = cTmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Precompute Deep-Space Beam Cylinder Orientation from Dish to Earth
  const beamTransform = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(EARTH_SKY_POS, DISH_WORLD_POS);
    const length = dir.length();
    const mid = new THREE.Vector3().addVectors(DISH_WORLD_POS, EARTH_SKY_POS).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return { length, mid, quat };
  }, []);

  const isBeamActive = transmissionStage !== 'idle';

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (earthGroupRef.current) {
      earthGroupRef.current.rotation.y += delta * 0.06;
    }
    if (earthCloudRef.current) {
      earthCloudRef.current.rotation.y += delta * 0.085;
    }

    if (beamRef.current) {
      beamRef.current.visible = isBeamActive;
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = transmissionStage === 'complete' ? 0.28 : 0.34 + Math.sin(t * 6) * 0.08;
    }

    for (let i = 0; i < PACKET_COUNT; i++) {
      const m = packetRefs.current[i];
      if (!m) continue;
      m.visible = isBeamActive;
      if (isBeamActive) {
        const speed = transmissionStage === 'complete' ? 0.25 : 0.62;
        const frac = (t * speed + i / PACKET_COUNT) % 1;
        _packetPos.lerpVectors(DISH_WORLD_POS, EARTH_SKY_POS, frac);
        m.position.copy(_packetPos);
        const s = 0.7 + frac * 1.8;
        m.scale.setScalar(s);
      }
    }
  });

  const groundY = getMarsTerrainHeight(0, 0);

  return (
    <group>
      {/* JEZERO CRATER SURFACE */}
      <mesh geometry={terrainGeo} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.04} />
      </mesh>

      {/* DISTANT MARTIAN CRATER RIM MOUNTAINS */}
      {Array.from({ length: 18 }, (_, idx) => {
        const ang = (idx / 18) * Math.PI * 2;
        const r = 64 + (idx % 3) * 6;
        const h = 7 + (idx % 4) * 3.2;
        const w = 18 + (idx % 3) * 6;
        return (
          <mesh
            key={`p7-rim-${idx}`}
            position={[Math.cos(ang) * r, h * 0.38, Math.sin(ang) * r]}
            rotation={[0, -ang, 0]}
          >
            <coneGeometry args={[w * 0.52, h, 6]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#743219' : '#5d2715'} roughness={0.96} flatShading />
          </mesh>
        );
      })}

      {/* USER'S ARES-IV ROVER TRANSMITTING TO EARTH */}
      <group position={[0, groundY + 0.02, 0]} rotation={[0, 0.42, 0]} scale={0.78}>
        <RoverModel
          installedComponents={installedComponents}
          selectedComponentId="commAntenna"
          installingComponentId={null}
          installProgress={100}
          isTestingActive={false}
          activationStage={activationStage}
          activeMechStepId={null}
          lightsOn={lightsOn}
          computerOnline={computerOnline}
          externalAntennaTracking={isBeamActive}
        />
      </group>

      {/* SUNLIT EARTH VISIBLE IN MARTIAN SKY */}
      <group position={[EARTH_SKY_POS.x, EARTH_SKY_POS.y, EARTH_SKY_POS.z]}>
        <pointLight position={[-12, 8, 12]} intensity={1.2} color="#e0f2fe" />
        <group ref={earthGroupRef} rotation={[0.18, -1.2, 0.14]}>
          <mesh>
            <sphereGeometry args={[3.4, 48, 48]} />
            <meshStandardMaterial map={earthAlbedo} roughness={0.55} metalness={0.05} />
          </mesh>
          <mesh ref={earthCloudRef}>
            <sphereGeometry args={[3.46, 48, 48]} />
            <meshStandardMaterial map={earthClouds} transparent opacity={0.85} depthWrite={false} roughness={0.9} />
          </mesh>
        </group>
        <mesh scale={1.1} material={earthAtmosMat}>
          <sphereGeometry args={[3.4, 40, 40]} />
        </mesh>
      </group>

      {/* MARS-TO-EARTH DEEP SPACE RF CARRIER BEAM */}
      <mesh
        ref={beamRef}
        position={beamTransform.mid}
        quaternion={beamTransform.quat}
        visible={isBeamActive}
      >
        <cylinderGeometry args={[0.04, 0.24, beamTransform.length, 14, 1, true]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.36} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* TRAVELING TELEMETRY DATA PACKETS STREAMING TOWARD EARTH */}
      {Array.from({ length: PACKET_COUNT }, (_, idx) => (
        <mesh
          key={`pkt-${idx}`}
          ref={(el) => {
            packetRefs.current[idx] = el;
          }}
          visible={isBeamActive}
        >
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshBasicMaterial color={idx % 2 === 0 ? '#67e8f9' : '#34d399'} />
        </mesh>
      ))}

      <OrbitControls
        enableDamping={!isSoftwareGl}
        dampingFactor={0.06}
        enablePan={false}
        minDistance={2.8}
        maxDistance={15}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.46}
        target={[0, groundY + 1.0, 0]}
      />
    </group>
  );
};
