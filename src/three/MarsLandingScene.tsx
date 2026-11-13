import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ActivationSequenceStage, ComponentId } from '../types/mission';
import { EDL_DURATION_SEC, EdlAnimClock } from '../state/useMarsLanding';
import { getRoverMaterials } from './materials';
import { RoverModel } from './RoverModel';
import {
  createAtmosphereGlowMaterial,
  getMarsAlbedoTexture,
  getMarsBumpTexture,
  getStarSpriteTexture,
} from './planetaryTextures';

interface MarsLandingSceneProps {
  installedComponents: Record<ComponentId, boolean>;
  edlAnimRef: React.MutableRefObject<EdlAnimClock>;
  activationStage: ActivationSequenceStage;
  lightsOn: boolean;
  computerOnline: boolean;
}

const DUST_COUNT = 96;
const ROCK_COUNT = 110;
const STAR_COUNT = 1200;

const MARS_SUN_DIR = new THREE.Vector3(-42, 26, 18).normalize();

// Module-scope reusable objects (zero GC inside useFrame)
const _camGoalPos = new THREE.Vector3(6.5, 4.2, 8.2);
const _camGoalLook = new THREE.Vector3(0, 1.5, 0);
const _camDescPos = new THREE.Vector3();
const _camDescLook = new THREE.Vector3();
const _camRollPos = new THREE.Vector3();
const _camRollLook = new THREE.Vector3();
const _rockDummy = new THREE.Object3D();

function smoothstep(x: number, min: number, max: number): number {
  const t = Math.max(0, Math.min(1, (x - min) / (max - min)));
  return t * t * (3 - 2 * t);
}

function createMarsRegolithTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9c4824';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle wind-swept sand dunes & darker basaltic gravel patches
  for (let i = 0; i < 220; i++) {
    const x = ((Math.sin(i * 19.31) * 0.5 + 0.5) * 512) % 512;
    const y = ((Math.cos(i * 43.17) * 0.5 + 0.5) * 512) % 512;
    const rx = 14 + (i % 38);
    const ry = 5 + (i % 14);
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(72, 28, 15, 0.25)'
        : i % 3 === 1
          ? 'rgba(205, 112, 62, 0.22)'
          : 'rgba(130, 56, 26, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine regolith grit & small pebble shadows
  for (let p = 0; p < 1600; p++) {
    const px = (Math.sin(p * 12.9898) * 0.5 + 0.5) * 512;
    const py = (Math.cos(p * 78.233) * 0.5 + 0.5) * 512;
    ctx.fillStyle = p % 2 === 0 ? 'rgba(58, 22, 12, 0.35)' : 'rgba(232, 148, 96, 0.25)';
    ctx.fillRect(px, py, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.anisotropy = 8;
  return tex;
}

function createParachuteCanopyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const stripes = 16;
  const sw = 512 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ea580c' : '#f8fafc';
    ctx.fillRect(i * sw, 0, sw + 1, 256);
  }
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 172, 512, 14);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function createMarsDustSprite(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
  grad.addColorStop(0, 'rgba(218, 124, 72, 0.55)');
  grad.addColorStop(0.5, 'rgba(182, 92, 48, 0.25)');
  grad.addColorStop(1, 'rgba(154, 72, 34, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const MarsLandingScene: React.FC<MarsLandingSceneProps> = ({
  installedComponents,
  edlAnimRef,
  activationStage,
  lightsOn,
  computerOnline,
}) => {
  const { camera, scene } = useThree();
  const mats = useMemo(() => getRoverMaterials(), []);

  const landerRigRef = useRef<THREE.Group>(null);
  const heatshieldRef = useRef<THREE.Group>(null);
  const plasmaGlowRef = useRef<THREE.Mesh>(null);
  const parachuteGroupRef = useRef<THREE.Group>(null);
  const retroExhaustRef = useRef<THREE.Group>(null);
  const rampRef = useRef<THREE.Group>(null);
  const deployedRoverRef = useRef<THREE.Group>(null);
  const marsApproachGlobeRef = useRef<THREE.Group>(null);
  const marsTerrainGroupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);
  const dustPointsRef = useRef<THREE.Points>(null);
  const rockMeshRef = useRef<THREE.InstancedMesh>(null);
  const wheelSpeedRef = useRef(0);
  const camInitRef = useRef(false);

  const skyColor = useMemo(() => new THREE.Color('#020409'), []);
  const spaceColor = useMemo(() => new THREE.Color('#020409'), []);
  const upperAtmoColor = useMemo(() => new THREE.Color('#5a2618'), []);
  const marsDaySky = useMemo(() => new THREE.Color('#c26b44'), []);

  const marsAlbedo = useMemo(() => getMarsAlbedoTexture(), []);
  const marsBump = useMemo(() => getMarsBumpTexture(), []);
  const marsAtmoMat = useMemo(
    () => createAtmosphereGlowMaterial('#fb923c', 0.72, MARS_SUN_DIR),
    []
  );
  const starSprite = useMemo(() => getStarSpriteTexture(), []);
  const regolithTex = useMemo(() => createMarsRegolithTexture(), []);
  const parachuteTex = useMemo(() => createParachuteCanopyTexture(), []);
  const dustTex = useMemo(() => createMarsDustSprite(), []);

  const plasmaMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fb923c',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const retroFlameMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fde68a',
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const starGeo = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = ((i * 0.61803398875) % 1) * 2 - 1;
      const th = i * 2.3999632;
      const sr = Math.sqrt(Math.max(0, 1 - u * u));
      const r = 175 + (i % 45);
      pos[i * 3] = r * sr * Math.cos(th);
      pos[i * 3 + 1] = Math.abs(r * u) + 12;
      pos[i * 3 + 2] = r * sr * Math.sin(th);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  const starMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: starSprite,
        color: '#e2e8f0',
        size: 1.05,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [starSprite]
  );

  const dustGeo = useMemo(() => {
    const pos = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = -10;
      pos[i * 3 + 2] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  const dustMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: dustTex,
        size: 2.2,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [dustTex]
  );

  const rockGeo = useMemo(() => {
    const geo = new THREE.DodecahedronGeometry(0.45, 0);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const sx = 0.8 + Math.abs(Math.sin(i * 3.1)) * 0.45;
      const sy = 0.55 + Math.abs(Math.cos(i * 2.7)) * 0.38;
      arr[i * 3] *= sx;
      arr[i * 3 + 1] *= sy;
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const rockMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5a2b18',
        roughness: 0.92,
        metalness: 0.05,
        flatShading: true,
      }),
    []
  );

  useLayoutEffect(() => {
    if (!rockMeshRef.current) return;
    for (let i = 0; i < ROCK_COUNT; i++) {
      const ang = (i / ROCK_COUNT) * Math.PI * 2 + (i % 5) * 0.19;
      // Keep a wide clear landing & rover rollout corridor around [0..5, 0, 0..7]
      const dist = 5.5 + Math.pow((i * 17) % 100 / 100, 0.75) * 44;
      const scale = 0.35 + ((i * 29) % 100) / 85;
      _rockDummy.position.set(Math.cos(ang) * dist, scale * 0.16, Math.sin(ang) * dist);
      _rockDummy.rotation.set(i * 0.4, i * 1.1, i * 0.3);
      _rockDummy.scale.set(scale * 1.2, scale * 0.75, scale);
      _rockDummy.updateMatrix();
      rockMeshRef.current.setMatrixAt(i, _rockDummy.matrix);
    }
    rockMeshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const now = performance.now();
    const clock = edlAnimRef.current;
    const t = state.clock.elapsedTime;

    if (!camInitRef.current) {
      camera.position.set(5.2, 46, 8.2);
      camera.lookAt(0, 40, -12);
      camInitRef.current = true;
    }

    let p = 0;
    if (clock.completed) {
      p = 1;
    } else if (clock.active) {
      const elapsedSec = Math.max(0, (now - clock.startMs) / 1000);
      p = Math.min(1, elapsedSec / EDL_DURATION_SEC);
    }

    // 1. Sky & atmospheric fog smooth transition (Space -> Upper Martian Sky -> Jezero Day Sky)
    if (p < 0.16) {
      skyColor.copy(spaceColor);
    } else if (p < 0.42) {
      skyColor.copy(spaceColor).lerp(upperAtmoColor, (p - 0.16) / 0.26);
    } else if (p < 0.65) {
      skyColor.copy(upperAtmoColor).lerp(marsDaySky, (p - 0.42) / 0.23);
    } else {
      skyColor.copy(marsDaySky);
    }
    scene.background = skyColor;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(skyColor);
      scene.fog.density = smoothstep(p, 0.28, 0.62) * 0.0085;
    }

    // Fade stars out smoothly as Martian atmosphere brightens
    if (starsRef.current) {
      const starOpacity = 1.0 - smoothstep(p, 0.24, 0.52);
      starMat.opacity = starOpacity * 0.92;
      starsRef.current.visible = starOpacity > 0.02;
    }

    // 2. Smooth Globe-to-Surface Visual Reveal (terrain always mounted so zero mid-flight GPU stall)
    if (marsApproachGlobeRef.current) {
      marsApproachGlobeRef.current.visible = p < 0.52;
      const zoomIn = smoothstep(p, 0.0, 0.34);
      const sinkOut = smoothstep(p, 0.28, 0.5);
      marsApproachGlobeRef.current.position.set(
        0,
        -22 + zoomIn * 11 - sinkOut * 38,
        -46 + zoomIn * 22
      );
      marsApproachGlobeRef.current.rotation.y = 1.2 + t * 0.02;
    }

    if (marsTerrainGroupRef.current) {
      const terrainRise = smoothstep(p, 0.18, 0.44);
      marsTerrainGroupRef.current.position.y = -34 * (1 - terrainRise);
    }

    // 3. Smooth Spacecraft / Lander Altitude Descent Profile (y: 44 -> 0)
    let landerY = 0;
    if (p < 0.16) {
      landerY = 44 - (p / 0.16) * 10; // 44 -> 34
    } else if (p < 0.38) {
      landerY = 34 - ((p - 0.16) / 0.22) * 18; // 34 -> 16
    } else if (p < 0.68) {
      const d = (p - 0.38) / 0.3;
      const easedD = 1 - Math.pow(1 - d, 1.35);
      landerY = 16 * (1 - easedD); // 16 -> 0 smooth touchdown
    } else {
      landerY = 0;
    }

    if (landerRigRef.current) {
      const swayAmp = p >= 0.38 && p < 0.68 ? (1 - (p - 0.38) / 0.3) * 0.09 : 0;
      landerRigRef.current.position.set(
        Math.sin(t * 2.1) * swayAmp * 2.0,
        landerY,
        Math.cos(t * 1.7) * swayAmp * 2.0
      );
      landerRigRef.current.rotation.z = Math.sin(t * 2.1) * swayAmp;
      landerRigRef.current.rotation.x = Math.cos(t * 1.7) * swayAmp * 0.7;
    }

    // 4. Atmospheric Entry Plasma Glow (p: 0.15 -> 0.40)
    if (plasmaGlowRef.current) {
      const plasmaPeak =
        p >= 0.15 && p <= 0.41 ? Math.sin(smoothstep(p, 0.15, 0.41) * Math.PI) : 0;
      plasmaMat.opacity = plasmaPeak * (0.76 + Math.sin(t * 32) * 0.12);
      plasmaGlowRef.current.visible = plasmaPeak > 0.02;
    }

    // 5. Heatshield Separation (detaches cleanly at p = 0.42)
    if (heatshieldRef.current) {
      const dropAmt = p >= 0.42 ? smoothstep(p, 0.42, 0.56) : 0;
      heatshieldRef.current.position.y = -0.35 - dropAmt * 18;
      heatshieldRef.current.rotation.z = dropAmt * 0.35;
      heatshieldRef.current.visible = p < 0.55;
    }

    // 6. Supersonic Parachute Deployment (0.38 -> 0.71, then detaches aside after touchdown)
    if (parachuteGroupRef.current) {
      const deployScale = p >= 0.38 ? smoothstep(p, 0.38, 0.44) : 0;
      const driftAway = p >= 0.68 ? smoothstep(p, 0.68, 0.8) : 0;
      parachuteGroupRef.current.visible = deployScale > 0.02 && driftAway < 0.99;
      parachuteGroupRef.current.scale.setScalar(Math.max(0.01, deployScale));
      parachuteGroupRef.current.position.set(-driftAway * 12, 2.2 + driftAway * 2.5, -driftAway * 8);
      parachuteGroupRef.current.rotation.z = driftAway * 0.55;
    }

    // 7. Powered Descent Retro-Thrusters (p: 0.56 -> 0.69)
    if (retroExhaustRef.current) {
      const burn = p >= 0.55 && p < 0.69;
      retroExhaustRef.current.visible = burn;
      if (burn) {
        const s = 0.85 + Math.sin(t * 42) * 0.18;
        retroExhaustRef.current.scale.set(1, s, 1);
      }
    }

    // 8. Subtle Touchdown Regolith Dust Plume (p: 0.65 -> 0.84)
    if (dustPointsRef.current) {
      const dustActive = p >= 0.65 && p <= 0.84;
      dustPointsRef.current.visible = dustActive;
      if (dustActive) {
        const dp = (p - 0.65) / 0.19;
        dustMat.opacity = Math.sin(dp * Math.PI) * 0.52;
        const pos = dustPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < DUST_COUNT; i++) {
          const ang = (i / DUST_COUNT) * Math.PI * 2 + (i % 5) * 0.15;
          const speed = 1.4 + (i % 6) * 0.45;
          const rad = 1.1 + dp * speed * 3.8;
          const py = 0.15 + Math.sin(dp * Math.PI) * (0.45 + (i % 4) * 0.22);
          pos.setXYZ(i, Math.cos(ang) * rad, py, Math.sin(ang) * rad);
        }
        pos.needsUpdate = true;
      }
    }

    // 9. Deployment Ramp & Smooth Rover Drive-Off onto Mars (p: 0.76 -> 1.00)
    if (rampRef.current) {
      const rampOpen = smoothstep(p, 0.75, 0.82);
      rampRef.current.rotation.x = rampOpen * 0.34; // Hinges down to ground
    }

    if (deployedRoverRef.current) {
      const driveT = smoothstep(p, 0.81, 0.97);
      const roverZ = driveT * 3.85;
      // Smoothly follow ramp slope then settle flat on Mars terrain at y = 0
      const rampDescent = smoothstep(driveT, 0.18, 0.68);
      const roverY = 0.46 * (1 - rampDescent);
      const slopePitch =
        driveT > 0.08 && driveT < 0.74
          ? Math.sin(((driveT - 0.08) / 0.66) * Math.PI) * 0.16
          : 0;
      deployedRoverRef.current.position.set(0, roverY, roverZ);
      deployedRoverRef.current.rotation.set(slopePitch, 0, 0);

      // Synchronize all 6 rover wheels to ramp rollout velocity and stop cleanly at touchdown
      if (!clock.completed && clock.active && p > 0.81 && p < 0.97) {
        const u = Math.max(0, Math.min(1, (p - 0.81) / 0.16));
        const speedBell = 6 * u * (1 - u);
        wheelSpeedRef.current = speedBell * 4.8;
      } else {
        wheelSpeedRef.current = 0;
      }
    }

    // 10. Continuous Blended Camera Choreography (zero snap at touchdown)
    const descBlend = smoothstep(p, 0.12, 0.45);
    const lookSweepZ = -6 * (1 - smoothstep(p, 0.16, 0.36));
    _camDescPos.set(
      THREE.MathUtils.lerp(5.2, 6.2, descBlend) + Math.sin(t * 0.28) * 0.3,
      landerY + THREE.MathUtils.lerp(2.4, 3.1, descBlend),
      THREE.MathUtils.lerp(7.8, 9.4, descBlend)
    );
    _camDescLook.set(0, Math.max(0.8, landerY + 0.6), lookSweepZ);

    const deployOrbit = smoothstep(p, 0.76, 1.0);
    const roverFocusZ = smoothstep(p, 0.81, 0.97) * 3.4;
    const orbitAng = deployOrbit * 0.55 + (clock.completed ? Math.sin(t * 0.18) * 0.32 : 0);
    _camRollPos.set(
      Math.sin(orbitAng + 0.72) * 6.4,
      2.35 + (1 - deployOrbit) * 0.9,
      roverFocusZ + Math.cos(orbitAng + 0.72) * 6.4
    );
    _camRollLook.set(0, 0.85, roverFocusZ);

    const camStageBlend = smoothstep(p, 0.56, 0.78);
    _camGoalPos.lerpVectors(_camDescPos, _camRollPos, camStageBlend);
    _camGoalLook.lerpVectors(_camDescLook, _camRollLook, camStageBlend);

    camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 3.6, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 3.6, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 3.6, dt);

    // Damped lookAt target via reusable vector
    _rockDummy.position.lerp(_camGoalLook, Math.min(1, dt * 4.5));
    camera.lookAt(_rockDummy.position);
  });

  return (
    <group>
      {/* STARFIELD FOR UPPER ORBIT / APPROACH */}
      <points ref={starsRef} geometry={starGeo} material={starMat} frustumCulled={false} />

      {/* ORBITAL MARS GLOBE DURING APPROACH */}
      <group ref={marsApproachGlobeRef} position={[0, -22, -46]}>
        <mesh rotation={[0.14, 1.3, 0.1]}>
          <sphereGeometry args={[28, 64, 48]} />
          <meshStandardMaterial
            map={marsAlbedo}
            bumpMap={marsBump}
            bumpScale={0.28}
            roughness={0.86}
            metalness={0.04}
          />
        </mesh>
        <mesh material={marsAtmoMat}>
          <sphereGeometry args={[29.2, 48, 48]} />
        </mesh>
      </group>

      {/* JEZERO CRATER MARTIAN SURFACE ENVIRONMENT (pre-mounted below horizon for zero stutter) */}
      <group ref={marsTerrainGroupRef} position={[0, -34, 0]}>
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[120, 64]} />
          <meshStandardMaterial map={regolithTex} roughness={0.94} metalness={0.03} />
        </mesh>

        {/* Distant Layered Crater Rim Mountains */}
        {Array.from({ length: 18 }, (_, idx) => {
          const ang = (idx / 18) * Math.PI * 2;
          const r = 74 + (idx % 3) * 8;
          const h = 7 + (idx % 4) * 3.5;
          const w = 24 + (idx % 3) * 6;
          return (
            <mesh
              key={`ridge-${idx}`}
              position={[Math.cos(ang) * r, h * 0.42 - 0.5, Math.sin(ang) * r]}
              rotation={[0, -ang, 0]}
            >
              <coneGeometry args={[w * 0.5, h, 6]} />
              <meshStandardMaterial color="#7b381c" roughness={0.96} flatShading />
            </mesh>
          );
        })}

        {/* Instanced Martian Surface Rocks & Boulders */}
        <instancedMesh
          ref={rockMeshRef}
          args={[rockGeo, rockMat, ROCK_COUNT]}
          castShadow
          receiveShadow
        />
      </group>

      {/* MARS LANDER + PARACHUTE + HEATSHIELD + ASSEMBLED ROVER */}
      <group ref={landerRigRef} position={[0, 44, 0]}>
        {/* Landing Platform Deck & 4 Footpads */}
        <mesh position={[0, 0.24, 0]} material={mats.kaptonGold} castShadow receiveShadow>
          <cylinderGeometry args={[1.45, 1.62, 0.36, 24]} />
        </mesh>
        <mesh position={[0, 0.44, 0]} material={mats.titaniumDark} receiveShadow>
          <cylinderGeometry args={[1.48, 1.48, 0.08, 24]} />
        </mesh>

        {/* 4 Landing Struts & Circular Footpads */}
        {[0.78, 2.35, 3.92, 5.49].map((ang, idx) => (
          <group key={`leg-${idx}`} rotation={[0, ang, 0]}>
            <mesh position={[1.65, 0.16, 0]} rotation={[0, 0, 0.45]} material={mats.brushedAluminum}>
              <cylinderGeometry args={[0.05, 0.06, 0.72, 8]} />
            </mesh>
            <mesh position={[1.82, 0.03, 0]} material={mats.titaniumDark} receiveShadow>
              <cylinderGeometry args={[0.26, 0.32, 0.08, 12]} />
            </mesh>
          </group>
        ))}

        {/* Hinged Front Rover Deployment Ramp */}
        <group ref={rampRef} position={[0, 0.44, 1.38]}>
          <mesh position={[0, 0, 0.85]} material={mats.brushedAluminum} castShadow receiveShadow>
            <boxGeometry args={[1.38, 0.07, 1.72]} />
          </mesh>
          <mesh position={[-0.66, 0.06, 0.85]} material={mats.amberEmissive}>
            <boxGeometry args={[0.04, 0.05, 1.68]} />
          </mesh>
          <mesh position={[0.66, 0.06, 0.85]} material={mats.amberEmissive}>
            <boxGeometry args={[0.04, 0.05, 1.68]} />
          </mesh>
        </group>

        {/* Powered Descent Retro-Thrusters (4 Corners) */}
        <group ref={retroExhaustRef} visible={false}>
          {[0.78, 2.35, 3.92, 5.49].map((ang, idx) => (
            <mesh
              key={`ret-${idx}`}
              position={[Math.cos(ang) * 1.38, -0.52, Math.sin(ang) * 1.38]}
              rotation={[Math.PI, 0, 0]}
              material={retroFlameMat}
            >
              <coneGeometry args={[0.22, 1.15, 12]} />
            </mesh>
          ))}
        </group>

        {/* Blunt Entry Heatshield + Atmospheric Entry Plasma Sheath */}
        <group ref={heatshieldRef} position={[0, -0.35, 0]}>
          <mesh material={mats.carbonComposite}>
            <cylinderGeometry args={[1.95, 0.72, 0.65, 28]} />
          </mesh>
          <mesh ref={plasmaGlowRef} position={[0, -0.18, 0]} material={plasmaMat}>
            <cylinderGeometry args={[2.22, 0.85, 0.95, 28, 1, true]} />
          </mesh>
        </group>

        {/* Supersonic Orange/White Mars Parachute & Suspension Risers */}
        <group ref={parachuteGroupRef} position={[0, 2.2, 0]} visible={false}>
          {/* Canopy Dome */}
          <mesh position={[0, 3.8, 0]}>
            <sphereGeometry args={[2.55, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            <meshStandardMaterial map={parachuteTex} roughness={0.78} side={THREE.DoubleSide} />
          </mesh>
          {/* Suspension Lines */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const ang = (i / 8) * Math.PI * 2;
            return (
              <mesh
                key={`riser-${i}`}
                position={[Math.cos(ang) * 1.15, 1.9, Math.sin(ang) * 1.15]}
                rotation={[Math.sin(ang) * -0.45, 0, Math.cos(ang) * 0.45]}
                material={mats.brushedAluminum}
              >
                <cylinderGeometry args={[0.012, 0.012, 4.1, 6]} />
              </mesh>
            );
          })}
        </group>

        {/* User's Exact Assembled ARES-IV Rover (Drives off ramp onto Mars!) */}
        <group ref={deployedRoverRef} position={[0, 0.46, 0]} scale={0.62}>
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
            externalWheelSpeedRef={wheelSpeedRef}
          />
        </group>
      </group>

      {/* Subtle Touchdown Dust Particle Plume */}
      <points ref={dustPointsRef} geometry={dustGeo} material={dustMat} visible={false} />
    </group>
  );
};
