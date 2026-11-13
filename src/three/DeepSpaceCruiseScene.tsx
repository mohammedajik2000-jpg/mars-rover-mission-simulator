import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ActivationSequenceStage, ComponentId } from '../types/mission';
import { CRUISE_DURATION_SEC, CruiseAnimClock } from '../state/useDeepSpaceCruise';
import { getRoverMaterials } from './materials';
import { RoverModel } from './RoverModel';
import {
  createAtmosphereGlowMaterial,
  getEarthAlbedoTexture,
  getEarthBumpTexture,
  getEarthCloudTexture,
  getEarthNightTexture,
  getEarthRoughnessTexture,
  getGalaxySpriteTexture,
  getMarsAlbedoTexture,
  getMarsBumpTexture,
  getNebulaBackdropTexture,
  getStarSpriteTexture,
} from './planetaryTextures';

interface DeepSpaceCruiseSceneProps {
  installedComponents: Record<ComponentId, boolean>;
  cruiseAnimRef: React.MutableRefObject<CruiseAnimClock>;
  activationStage: ActivationSequenceStage;
  lightsOn: boolean;
  computerOnline: boolean;
}

const DEEP_STAR_COUNT = 3200;
const MID_STAR_COUNT = 1400;
const NEAR_STAR_COUNT = 450;
const STAR_Z_HALF = 145;
const ASTEROID_VARIANTS = 3;
const ASTEROIDS_PER_VARIANT = 65; // 195 total natural asteroids around Mars

// Matches Phase 4 directional sunlight — illuminates Earth's visible continents/oceans with a crisp day/night terminator
const SUN_DIR = new THREE.Vector3(-36, 20, -14).normalize();

// Module-scope reusable math vectors/objects (zero GC allocations inside useFrame)
const _camGoalPos = new THREE.Vector3(3.4, 1.5, 4.6);
const _camGoalLook = new THREE.Vector3(0, 0.25, -4);
const _camDeparturePos = new THREE.Vector3();
const _camDepartureLook = new THREE.Vector3();
const _camApproachPos = new THREE.Vector3();
const _camApproachLook = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();

function smoothstep(x: number, min: number, max: number): number {
  const t = Math.max(0, Math.min(1, (x - min) / (max - min)));
  return t * t * (3 - 2 * t);
}

function createNightLightsMaterial(
  nightMap: THREE.Texture,
  sunDir: THREE.Vector3
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      nightMap: { value: nightMap },
      sunDir: { value: sunDir.clone().normalize() },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D nightMap;
      uniform vec3 sunDir;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      void main() {
        float nightMask = smoothstep(0.08, -0.22, dot(normalize(vWorldNormal), sunDir));
        vec3 lights = texture2D(nightMap, vUv).rgb;
        gl_FragColor = vec4(lights * 1.15, nightMask * 0.9);
      }
    `,
  });
}

function createAsteroidGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  for (let i = 0; i < pos.count; i++) {
    const x = arr[i * 3];
    const y = arr[i * 3 + 1];
    const z = arr[i * 3 + 2];
    const n1 = Math.sin(x * 3.1 + seed * 1.7) * Math.cos(y * 2.7 - seed) * 0.22;
    const n2 = Math.cos(z * 4.3 + x * 2.1 + seed * 2.3) * 0.14;
    const scale = 0.86 + n1 + n2;
    arr[i * 3] = x * scale * (1.0 + (seed === 1 ? 0.25 : 0));
    arr[i * 3 + 1] = y * scale * (seed === 2 ? 0.72 : 0.88);
    arr[i * 3 + 2] = z * scale;
  }
  geo.computeVertexNormals();
  return geo;
}

const DISTANT_GALAXIES: Array<{
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
  opacity: number;
}> = [
  { pos: [-118, 56, -155], rot: [0.35, 0.5, 0.7], scale: 26, opacity: 0.42 },
  { pos: [134, -44, -142], rot: [-0.25, -0.6, 1.1], scale: 21, opacity: 0.34 },
  { pos: [-95, -62, 138], rot: [0.4, 2.5, -0.4], scale: 23, opacity: 0.36 },
  { pos: [110, 68, 125], rot: [-0.3, -2.2, 0.5], scale: 18, opacity: 0.3 },
  { pos: [28, 124, -130], rot: [1.1, 0.2, 0.3], scale: 20, opacity: 0.28 },
];

export const DeepSpaceCruiseScene: React.FC<DeepSpaceCruiseSceneProps> = ({
  installedComponents,
  cruiseAnimRef,
  activationStage,
  lightsOn,
  computerOnline,
}) => {
  const { camera, scene } = useThree();
  const mats = useMemo(() => getRoverMaterials(), []);

  const spacecraftRef = useRef<THREE.Group>(null);
  const earthGroupRef = useRef<THREE.Group>(null);
  const earthGlobeRef = useRef<THREE.Mesh>(null);
  const earthNightRef = useRef<THREE.Mesh>(null);
  const earthCloudsRef = useRef<THREE.Mesh>(null);
  const marsGroupRef = useRef<THREE.Group>(null);
  const marsGlobeRef = useRef<THREE.Mesh>(null);
  const midStarsGeoRef = useRef<THREE.BufferGeometry>(null);
  const nearStarsGeoRef = useRef<THREE.BufferGeometry>(null);
  const asteroidMeshRefs = useRef<Array<THREE.InstancedMesh | null>>([null, null, null]);
  const camInitRef = useRef(false);

  const earthAlbedo = useMemo(() => getEarthAlbedoTexture(), []);
  const earthRoughness = useMemo(() => getEarthRoughnessTexture(), []);
  const earthBump = useMemo(() => getEarthBumpTexture(), []);
  const earthNight = useMemo(() => getEarthNightTexture(), []);
  const earthClouds = useMemo(() => getEarthCloudTexture(), []);
  const marsAlbedo = useMemo(() => getMarsAlbedoTexture(), []);
  const marsBump = useMemo(() => getMarsBumpTexture(), []);
  const nebulaTex = useMemo(() => getNebulaBackdropTexture(), []);
  const starSprite = useMemo(() => getStarSpriteTexture(), []);
  const galaxySprite = useMemo(() => getGalaxySpriteTexture(), []);

  const earthAtmoMat = useMemo(
    () => createAtmosphereGlowMaterial('#38bdf8', 0.78, SUN_DIR),
    []
  );
  const earthNightMat = useMemo(
    () => createNightLightsMaterial(earthNight, SUN_DIR),
    [earthNight]
  );
  const marsAtmoMat = useMemo(
    () => createAtmosphereGlowMaterial('#fb923c', 0.62, SUN_DIR),
    []
  );

  // Layer 1: Thousands of fixed background stars across full celestial sphere
  const deepStarData = useMemo(() => {
    const positions = new Float32Array(DEEP_STAR_COUNT * 3);
    const colors = new Float32Array(DEEP_STAR_COUNT * 3);
    for (let i = 0; i < DEEP_STAR_COUNT; i++) {
      const u = ((i * 0.61803398875) % 1) * 2 - 1;
      const theta = i * 2.3999632;
      const rXY = Math.sqrt(Math.max(0, 1 - u * u));
      const rad = 185 + ((i * 13.7) % 60);
      positions[i * 3] = rad * rXY * Math.cos(theta);
      positions[i * 3 + 1] = rad * u;
      positions[i * 3 + 2] = rad * rXY * Math.sin(theta);

      const spectral = i % 10;
      const lum = 0.45 + ((i * 31) % 100) / 170;
      if (spectral === 0 || spectral === 1) {
        // Blue-white O/B stars
        colors[i * 3] = 0.75 * lum;
        colors[i * 3 + 1] = 0.88 * lum;
        colors[i * 3 + 2] = 1.0 * lum;
      } else if (spectral === 8) {
        // Warm yellow G/K stars
        colors[i * 3] = 1.0 * lum;
        colors[i * 3 + 1] = 0.88 * lum;
        colors[i * 3 + 2] = 0.68 * lum;
      } else if (spectral === 9) {
        // Subtle pale orange K/M stars
        colors[i * 3] = 1.0 * lum;
        colors[i * 3 + 1] = 0.76 * lum;
        colors[i * 3 + 2] = 0.6 * lum;
      } else {
        colors[i * 3] = 0.94 * lum;
        colors[i * 3 + 1] = 0.96 * lum;
        colors[i * 3 + 2] = 1.0 * lum;
      }
    }
    return { positions, colors };
  }, []);

  // Layer 2 & 3: Mid-depth & near drifting parallax starfields
  const midStarData = useMemo(() => {
    const positions = new Float32Array(MID_STAR_COUNT * 3);
    const colors = new Float32Array(MID_STAR_COUNT * 3);
    const speeds = new Float32Array(MID_STAR_COUNT);

    for (let i = 0; i < MID_STAR_COUNT; i++) {
      const angle = (i * 2.3999632) % (Math.PI * 2);
      const radius = 16 + ((i * 41.7) % 148);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius * 0.82;
      positions[i * 3 + 2] = -STAR_Z_HALF + ((i * 19.3) % (STAR_Z_HALF * 2));
      speeds[i] = 1.3 + (i % 6) * 0.38;

      const lum = 0.65 + (i % 5) * 0.08;
      colors[i * 3] = 0.88 * lum;
      colors[i * 3 + 1] = 0.93 * lum;
      colors[i * 3 + 2] = 1.0 * lum;
    }
    return { positions, colors, speeds };
  }, []);

  const nearStarData = useMemo(() => {
    const positions = new Float32Array(NEAR_STAR_COUNT * 3);
    const colors = new Float32Array(NEAR_STAR_COUNT * 3);
    const speeds = new Float32Array(NEAR_STAR_COUNT);

    for (let i = 0; i < NEAR_STAR_COUNT; i++) {
      const angle = (i * 2.3999632 + 1.1) % (Math.PI * 2);
      const radius = 14 + ((i * 37.3) % 110);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius * 0.78;
      positions[i * 3 + 2] = -STAR_Z_HALF + ((i * 23.7) % (STAR_Z_HALF * 2));
      speeds[i] = 2.6 + (i % 5) * 0.55;

      const warm = i % 4 === 0;
      colors[i * 3] = warm ? 1.0 : 0.86;
      colors[i * 3 + 1] = warm ? 0.9 : 0.95;
      colors[i * 3 + 2] = warm ? 0.74 : 1.0;
    }
    return { positions, colors, speeds };
  }, []);

  // Natural Asteroid Field around Mars (3 distinct procedural rock geometries)
  const asteroidGeos = useMemo(
    () => [createAsteroidGeometry(0), createAsteroidGeometry(1), createAsteroidGeometry(2)],
    []
  );
  const asteroidMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.92,
        metalness: 0.14,
        flatShading: true,
      }),
    []
  );

  const asteroidOrbits = useMemo(() => {
    const variants: Array<
      Array<{
        orbitRadius: number;
        angle: number;
        heightOffset: number;
        orbitSpeed: number;
        scale: [number, number, number];
        rot: [number, number, number];
        spin: [number, number, number];
        color: THREE.Color;
      }>
    > = [[], [], []];

    const palette = ['#6b5a4e', '#524741', '#7d614b', '#47423e', '#826956'];

    for (let v = 0; v < ASTEROID_VARIANTS; v++) {
      for (let i = 0; i < ASTEROIDS_PER_VARIANT; i++) {
        const seed = v * 100 + i;
        const t1 = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
        const t2 = Math.abs(Math.sin(seed * 78.233 + 1.5) * 24634.6345) % 1;
        const t3 = Math.abs(Math.cos(seed * 39.425) * 19283.41) % 1;

        // Keep asteroids cleanly orbiting Mars beyond radius 21 (Mars radius is 14.5)
        const orbitRadius = 21.5 + Math.pow(t1, 0.85) * 38;
        const angle = t2 * Math.PI * 2;
        const heightOffset = (t3 - 0.5) * (10 + orbitRadius * 0.28);
        const baseScale = 0.14 + Math.pow(t3, 2.1) * 0.72;

        variants[v].push({
          orbitRadius,
          angle,
          heightOffset,
          orbitSpeed: (0.015 + (1 - t1) * 0.032) * (seed % 2 === 0 ? 1 : 0.8),
          scale: [
            baseScale * (0.8 + t1 * 0.5),
            baseScale * (0.7 + t2 * 0.45),
            baseScale * (0.85 + t3 * 0.5),
          ],
          rot: [t1 * Math.PI, t2 * Math.PI, t3 * Math.PI],
          spin: [(t1 - 0.5) * 0.45, (t2 - 0.5) * 0.45, (t3 - 0.5) * 0.35],
          color: new THREE.Color(palette[seed % palette.length]),
        });
      }
    }
    return variants;
  }, []);

  useLayoutEffect(() => {
    for (let v = 0; v < ASTEROID_VARIANTS; v++) {
      const mesh = asteroidMeshRefs.current[v];
      if (!mesh) continue;
      const list = asteroidOrbits[v];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        _dummyObj.position.set(
          Math.cos(item.angle) * item.orbitRadius,
          item.heightOffset,
          Math.sin(item.angle) * item.orbitRadius
        );
        _dummyObj.rotation.set(item.rot[0], item.rot[1], item.rot[2]);
        _dummyObj.scale.set(item.scale[0], item.scale[1], item.scale[2]);
        _dummyObj.updateMatrix();
        mesh.setMatrixAt(i, _dummyObj.matrix);
        mesh.setColorAt(i, item.color);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [asteroidOrbits]);

  const rcsGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#7dd3fc',
        transparent: true,
        opacity: 0.75,
        toneMapped: false,
      }),
    []
  );

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const now = performance.now();
    const clock = cruiseAnimRef.current;

    if (scene.fog && 'density' in scene.fog) {
      (scene.fog as THREE.FogExp2).density = 0;
    }

    if (!camInitRef.current) {
      camera.position.set(3.4, 1.5, 4.6);
      camera.lookAt(0, 0.25, -4);
      camInitRef.current = true;
    }

    let p = 0;
    if (clock.completed) {
      p = 1;
    } else if (clock.active) {
      const elapsedSec = Math.max(0, (now - clock.startMs) / 1000);
      p = Math.min(1, elapsedSec / CRUISE_DURATION_SEC);
    }

    const t = state.clock.elapsedTime;
    const cruiseFactor = clock.completed ? 0.22 : 1.0;

    // 1. Mid & near starfield smooth parallax drift (no artificial streak lines)
    if (midStarsGeoRef.current) {
      const posAttr = midStarsGeoRef.current.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < MID_STAR_COUNT; i++) {
        const zIdx = i * 3 + 2;
        arr[zIdx] += midStarData.speeds[i] * dt * cruiseFactor;
        if (arr[zIdx] > STAR_Z_HALF) arr[zIdx] -= STAR_Z_HALF * 2;
      }
      posAttr.needsUpdate = true;
    }
    if (nearStarsGeoRef.current) {
      const posAttr = nearStarsGeoRef.current.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < NEAR_STAR_COUNT; i++) {
        const zIdx = i * 3 + 2;
        arr[zIdx] += nearStarData.speeds[i] * dt * cruiseFactor;
        if (arr[zIdx] > STAR_Z_HALF) arr[zIdx] -= STAR_Z_HALF * 2;
      }
      posAttr.needsUpdate = true;
    }

    // 2. Realistic Earth receding behind the spacecraft (+Z) — sunlit hemisphere visible to camera
    if (earthGroupRef.current) {
      const earthZ = 24 + Math.pow(p, 1.25) * 95;
      const earthX = 11.5 + p * 10.5;
      const earthY = -1.2 - p * 2.8;
      earthGroupRef.current.position.set(earthX, earthY, earthZ);
    }
    if (earthGlobeRef.current) {
      earthGlobeRef.current.rotation.y += dt * 0.032;
      if (earthNightRef.current) {
        earthNightRef.current.rotation.y = earthGlobeRef.current.rotation.y;
      }
    }
    if (earthCloudsRef.current) {
      earthCloudsRef.current.rotation.y += dt * 0.044;
    }

    // 3. Realistic Mars + Asteroid Belt ahead growing larger into Mars approach (-Z)
    if (marsGroupRef.current) {
      const approachEase = smoothstep(p, 0.08, 1.0);
      const marsZ = -175 + approachEase * 147; // -175 -> -28 (keeps asteroid shell clear of rover)
      const marsX = -5.5 * (1 - smoothstep(p, 0.68, 1.0)) + 2.4 * smoothstep(p, 0.72, 1.0);
      const marsY = -2.2 * (1 - smoothstep(p, 0.75, 1.0));
      marsGroupRef.current.position.set(marsX, marsY, marsZ);
    }
    if (marsGlobeRef.current) {
      marsGlobeRef.current.rotation.y += dt * 0.026;
    }

    // Update orbital drift & gentle rock tumble for Mars asteroid belt (zero GC)
    for (let v = 0; v < ASTEROID_VARIANTS; v++) {
      const mesh = asteroidMeshRefs.current[v];
      if (!mesh) continue;
      const list = asteroidOrbits[v];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const ang = item.angle + t * item.orbitSpeed;
        _dummyObj.position.set(
          Math.cos(ang) * item.orbitRadius,
          item.heightOffset + Math.sin(ang * 2.0 + i) * 0.35,
          Math.sin(ang) * item.orbitRadius
        );
        _dummyObj.rotation.set(
          item.rot[0] + t * item.spin[0],
          item.rot[1] + t * item.spin[1],
          item.rot[2] + t * item.spin[2]
        );
        _dummyObj.scale.set(item.scale[0], item.scale[1], item.scale[2]);
        _dummyObj.updateMatrix();
        mesh.setMatrixAt(i, _dummyObj.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // 4. Spacecraft smooth forward attitude & gentle orbital drift (preserved)
    if (spacecraftRef.current) {
      spacecraftRef.current.position.y = Math.sin(t * 0.45) * 0.06;
      spacecraftRef.current.position.x = Math.cos(t * 0.32) * 0.04;
      spacecraftRef.current.rotation.z = Math.sin(t * 0.28) * 0.045;
      spacecraftRef.current.rotation.x = Math.cos(t * 0.22) * 0.025;
      spacecraftRef.current.rotation.y = Math.PI + Math.sin(t * 0.18) * 0.05;
    }

    // 5. Continuous smooth camera-follow choreography (preserved)
    const sweepBlend = smoothstep(p, 0.16, 0.46);
    const arrivalZoom = smoothstep(p, 0.74, 1.0);

    _camDeparturePos.set(
      -4.6 + Math.sin(t * 0.25) * 0.25,
      1.5 + Math.cos(t * 0.2) * 0.12,
      -4.4
    );
    _camDepartureLook.set(2.4, -0.2, 10.0);

    _camApproachPos.set(
      3.4 - arrivalZoom * 0.55 + Math.sin(t * 0.22) * 0.3,
      1.45 - arrivalZoom * 0.25 + Math.cos(t * 0.18) * 0.14,
      4.8 - arrivalZoom * 0.95
    );
    _camApproachLook.set(0.8 * arrivalZoom, -0.15, -18 - arrivalZoom * 8);

    _camGoalPos.lerpVectors(_camDeparturePos, _camApproachPos, sweepBlend);
    _camGoalLook.lerpVectors(_camDepartureLook, _camApproachLook, sweepBlend);

    camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 2.2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 2.2, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 2.2, dt);

    _camDepartureLook.copy(_camGoalLook);
    camera.lookAt(_camDepartureLook);
  });

  return (
    <group>
      {/* Distant Milky Way Galactic Dust Band & Nebula Sky Sphere */}
      <mesh>
        <sphereGeometry args={[280, 32, 24]} />
        <meshBasicMaterial
          map={nebulaTex}
          side={THREE.BackSide}
          transparent
          opacity={0.88}
          depthWrite={false}
        />
      </mesh>

      {/* Distant Spiral Galaxies Across Deep Space */}
      {DISTANT_GALAXIES.map((gal, idx) => (
        <mesh key={`gal-${idx}`} position={gal.pos} rotation={gal.rot}>
          <planeGeometry args={[gal.scale, gal.scale]} />
          <meshBasicMaterial
            map={galaxySprite}
            transparent
            opacity={gal.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Layer 1: 3,200 Crisp Distant Celestial Background Stars */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[deepStarData.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[deepStarData.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.95}
          map={starSprite}
          vertexColors
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Layer 2: 1,400 Mid-Depth Parallax Cruise Stars */}
      <points frustumCulled={false}>
        <bufferGeometry ref={midStarsGeoRef}>
          <bufferAttribute attach="attributes-position" args={[midStarData.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[midStarData.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.68}
          map={starSprite}
          vertexColors
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Layer 3: 450 Bright Foreground Navigation Stars */}
      <points frustumCulled={false}>
        <bufferGeometry ref={nearStarsGeoRef}>
          <bufferAttribute attach="attributes-position" args={[nearStarData.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[nearStarData.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.12}
          map={starSprite}
          vertexColors
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Realistic Earth Receding Behind Spacecraft (+Z) */}
      <group ref={earthGroupRef} position={[11.5, -1.2, 24]}>
        <mesh ref={earthGlobeRef} rotation={[0.18, 0.9, 0.22]}>
          <sphereGeometry args={[13.2, 64, 64]} />
          <meshStandardMaterial
            map={earthAlbedo}
            roughnessMap={earthRoughness}
            bumpMap={earthBump}
            bumpScale={0.09}
            roughness={0.95}
            metalness={0.02}
          />
        </mesh>
        {/* Night-Side Urban Lights Masked to Dark Hemisphere */}
        <mesh ref={earthNightRef} rotation={[0.18, 0.9, 0.22]} material={earthNightMat}>
          <sphereGeometry args={[13.23, 64, 64]} />
        </mesh>
        {/* Dynamic Swirling Cloud Formation Layer */}
        <mesh ref={earthCloudsRef} rotation={[0.18, 0.5, 0.22]}>
          <sphereGeometry args={[13.38, 64, 64]} />
          <meshStandardMaterial
            map={earthClouds}
            transparent
            opacity={0.9}
            roughness={0.94}
            depthWrite={false}
          />
        </mesh>
        {/* Sun-Lit Blue Rayleigh Atmospheric Rim */}
        <mesh material={earthAtmoMat}>
          <sphereGeometry args={[14.2, 48, 48]} />
        </mesh>
      </group>

      {/* Realistic Mars + Natural Orbital Asteroid Field Ahead (-Z) */}
      <group ref={marsGroupRef} position={[-5.5, -2.2, -175]}>
        <mesh ref={marsGlobeRef} rotation={[0.12, 1.4, 0.16]}>
          <sphereGeometry args={[14.5, 64, 64]} />
          <meshStandardMaterial
            map={marsAlbedo}
            bumpMap={marsBump}
            bumpScale={0.24}
            roughness={0.88}
            metalness={0.04}
          />
        </mesh>
        {/* Subtle Sun-Lit Martian Dust Atmospheric Rim */}
        <mesh material={marsAtmoMat}>
          <sphereGeometry args={[15.3, 48, 48]} />
        </mesh>

        {/* Natural Asteroid Field Orbiting Around Mars (Instanced, Zero Extra Draw Calls) */}
        {[0, 1, 2].map((v) => (
          <instancedMesh
            key={`ast-v-${v}`}
            ref={(el) => {
              asteroidMeshRefs.current[v] = el;
            }}
            args={[asteroidGeos[v], asteroidMat, ASTEROIDS_PER_VARIANT]}
            frustumCulled={false}
          />
        ))}
      </group>

      {/* ARES-IV Deep Space Cruise Spacecraft + User's Exact Assembled Rover (Preserved) */}
      <group ref={spacecraftRef} position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, -0.58, 0]} material={mats.kaptonGold}>
          <cylinderGeometry args={[1.48, 1.68, 0.44, 32]} />
        </mesh>
        <mesh position={[0, -0.82, 0]} material={mats.titaniumDark}>
          <cylinderGeometry args={[1.7, 1.72, 0.14, 32]} />
        </mesh>

        <mesh position={[0, -0.62, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.solarCell}>
          <ringGeometry args={[1.68, 2.15, 32]} />
        </mesh>
        <mesh position={[0, -0.64, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.brushedAluminum}>
          <torusGeometry args={[2.15, 0.035, 10, 32]} />
        </mesh>

        <mesh position={[0, -0.34, 0]} material={mats.carbonComposite}>
          <cylinderGeometry args={[1.18, 1.46, 0.22, 24]} />
        </mesh>

        <group position={[1.25, -0.42, 0]} rotation={[0.45, 0, -0.35]}>
          <mesh material={mats.chassisWhite}>
            <cylinderGeometry args={[0.32, 0.08, 0.12, 20]} />
          </mesh>
          <mesh position={[0, 0.18, 0]} material={mats.brushedAluminum}>
            <cylinderGeometry args={[0.015, 0.015, 0.28, 8]} />
          </mesh>
        </group>

        {[0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].map((ang, idx) => (
          <group
            key={idx}
            position={[Math.cos(ang) * 1.72, -0.76, Math.sin(ang) * 1.72]}
            rotation={[0, -ang, 0]}
          >
            <mesh material={mats.titaniumDark}>
              <boxGeometry args={[0.2, 0.18, 0.22]} />
            </mesh>
            <mesh position={[0.12, -0.04, 0]} rotation={[0, 0, -Math.PI / 2]} material={mats.brushedAluminum}>
              <cylinderGeometry args={[0.03, 0.048, 0.1, 10]} />
            </mesh>
            <mesh position={[0.18, -0.04, 0]} material={rcsGlowMat}>
              <sphereGeometry args={[0.035, 8, 8]} />
            </mesh>
          </group>
        ))}

        <group position={[0, -0.22, 0]} scale={0.58}>
          <RoverModel
            installedComponents={installedComponents}
            selectedComponentId="wheels"
            installingComponentId={null}
            installProgress={100}
            isTestingActive={false}
            activationStage={activationStage}
            activeMechStepId={null}
            lightsOn={lightsOn}
            computerOnline={computerOnline}
            isDragging={false}
            dropZoneAligned={false}
          />
        </group>
      </group>
    </group>
  );
};
