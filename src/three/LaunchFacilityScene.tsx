import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ActivationSequenceStage, ComponentId } from '../types/mission';
import {
  LAUNCH_ASCENT_DURATION_SEC,
  LAUNCH_COUNTDOWN_SEC,
  LaunchAnimClock,
} from '../state/useRocketLaunch';
import { getRoverMaterials } from './materials';
import { RoverModel } from './RoverModel';
import {
  createAtmosphereGlowMaterial,
  getEarthAlbedoTexture,
  getEarthBumpTexture,
  getEarthCloudTexture,
  getEarthRoughnessTexture,
  getStarSpriteTexture,
} from './planetaryTextures';

interface LaunchFacilitySceneProps {
  installedComponents: Record<ComponentId, boolean>;
  launchAnimRef: React.MutableRefObject<LaunchAnimClock>;
  activationStage: ActivationSequenceStage;
  lightsOn: boolean;
  computerOnline: boolean;
}

const SMOKE_COUNT = 120;
const STAR_COUNT = 850;
const PHASE3_SUN_DIR = new THREE.Vector3(24, 38, 18).normalize();

// Module-scope reusable math vectors (zero GC allocations inside useFrame)
const _camDesiredPos = new THREE.Vector3(12.5, 6.2, 14.5);
const _camDesiredLook = new THREE.Vector3(0, 6.5, 0);
const _camAscentPos = new THREE.Vector3();
const _camAscentLook = new THREE.Vector3();
const _camOrbitPos = new THREE.Vector3();
const _camOrbitLook = new THREE.Vector3();
const _crowdDummy = new THREE.Object3D();

function createIndianFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 170;
  const ctx = canvas.getContext('2d')!;

  const bandH = 170 / 3;
  // Saffron
  ctx.fillStyle = '#FF9933';
  ctx.fillRect(0, 0, 256, bandH);
  // White
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, bandH, 256, bandH);
  // India Green
  ctx.fillStyle = '#138808';
  ctx.fillRect(0, bandH * 2, 256, bandH + 1);

  // Navy Blue 24-Spoke Ashoka Chakra
  const cx = 128;
  const cy = 85;
  const r = 21;
  ctx.strokeStyle = '#000080';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#000080';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 1.1;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSoftSmokeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  const puffs = [
    { x: 64, y: 64, r: 58, a: 0.48 },
    { x: 52, y: 58, r: 42, a: 0.32 },
    { x: 76, y: 68, r: 40, a: 0.3 },
    { x: 64, y: 50, r: 36, a: 0.25 },
  ];
  for (const p of puffs) {
    const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
    grad.addColorStop(0, `rgba(241, 245, 249, ${p.a})`);
    grad.addColorStop(0.45, `rgba(226, 232, 240, ${p.a * 0.55})`);
    grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createExhaustPlumeTexture(isVacuum = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 256, 0, 0);
  if (isVacuum) {
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.25, 'rgba(186, 230, 253, 0.68)');
    grad.addColorStop(0.65, 'rgba(99, 102, 241, 0.25)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  } else {
    grad.addColorStop(0, 'rgba(255, 255, 245, 0.98)');
    grad.addColorStop(0.22, 'rgba(253, 224, 71, 0.85)');
    grad.addColorStop(0.55, 'rgba(249, 115, 22, 0.45)');
    grad.addColorStop(0.85, 'rgba(234, 88, 12, 0.14)');
    grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCoreTankTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c86416';
  ctx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 16) {
    ctx.fillStyle = x % 32 === 0 ? 'rgba(255, 210, 160, 0.1)' : 'rgba(90, 35, 6, 0.14)';
    ctx.fillRect(x, 0, 6, 512);
  }
  for (const y of [72, 168, 264, 360, 444]) {
    ctx.fillStyle = 'rgba(70, 28, 5, 0.35)';
    ctx.fillRect(0, y, 512, 6);
    ctx.fillStyle = 'rgba(253, 186, 116, 0.18)';
    ctx.fillRect(0, y + 6, 512, 2);
  }
  ctx.fillStyle = '#3b2416';
  ctx.fillRect(0, 178, 512, 42);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function createWhiteHullTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e8edf4';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
  ctx.lineWidth = 2;
  for (let y = 64; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 40, 128, 48);
  ctx.fillRect(256, 40, 128, 48);
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(0, 396, 512, 14);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('ARES-IV', 180, 270);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export const LaunchFacilityScene: React.FC<LaunchFacilitySceneProps> = ({
  installedComponents,
  launchAnimRef,
  activationStage,
  lightsOn,
  computerOnline,
}) => {
  const mats = useMemo(() => getRoverMaterials(), []);
  const { scene, camera } = useThree();

  const rocketRootRef = useRef<THREE.Group>(null);
  const firstStageRef = useRef<THREE.Group>(null);
  const upperStageRef = useRef<THREE.Group>(null);
  const fairingLeftRef = useRef<THREE.Group>(null);
  const fairingRightRef = useRef<THREE.Group>(null);
  const spacecraftRef = useRef<THREE.Group>(null);
  const umbilicalArmRef = useRef<THREE.Group>(null);
  const exhaustGroupRef = useRef<THREE.Group>(null);
  const upperExhaustGroupRef = useRef<THREE.Group>(null);
  const smokePointsRef = useRef<THREE.Points>(null);
  const starFieldGroupRef = useRef<THREE.Group>(null);
  const earthSphereRef = useRef<THREE.Group>(null);
  const earthCloudsRef = useRef<THREE.Mesh>(null);
  const crowdBodyRef = useRef<THREE.InstancedMesh>(null);
  const crowdHeadRef = useRef<THREE.InstancedMesh>(null);
  const crowdArmRef = useRef<THREE.InstancedMesh>(null);
  const flagRefs = useRef<Array<THREE.Mesh | null>>([]);

  // Persistent smooth look-at vector so camera transitions never jump
  const smoothLookRef = useRef(new THREE.Vector3(0, 6.5, 0));

  const skyColor = useMemo(() => new THREE.Color('#2d6da8'), []);
  const earthDaySky = useMemo(() => new THREE.Color('#2d6da8'), []);
  const stratoSky = useMemo(() => new THREE.Color('#0c1936'), []);
  const spaceSky = useMemo(() => new THREE.Color('#020409'), []);

  // Cached procedural textures
  const smokeTex = useMemo(() => createSoftSmokeTexture(), []);
  const starTex = useMemo(() => getStarSpriteTexture(), []);
  const mainPlumeTex = useMemo(() => createExhaustPlumeTexture(false), []);
  const vacPlumeTex = useMemo(() => createExhaustPlumeTexture(true), []);
  const coreTex = useMemo(() => createCoreTankTexture(), []);
  const whiteHullTex = useMemo(() => createWhiteHullTexture(), []);
  const earthAlbedoTex = useMemo(() => getEarthAlbedoTexture(), []);
  const earthRoughnessTex = useMemo(() => getEarthRoughnessTexture(), []);
  const earthBumpTex = useMemo(() => getEarthBumpTexture(), []);
  const earthCloudTex = useMemo(() => getEarthCloudTexture(), []);
  const indianFlagTex = useMemo(() => createIndianFlagTexture(), []);

  // Smoke particle buffer geometry (reused in place)
  const smokeGeo = useMemo(() => {
    const positions = new Float32Array(SMOKE_COUNT * 3);
    for (let i = 0; i < SMOKE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = Math.random() * 1.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  // Multi-size/color 3D Starfield geometry
  const { starGeo, starMat } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const c = new THREE.Color();
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 120 + Math.random() * 45;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const tint = Math.random();
      if (tint < 0.25) c.set('#bae6fd');
      else if (tint < 0.45) c.set('#fef3c7');
      else c.set('#ffffff');
      const brightness = 0.55 + Math.random() * 0.45;
      colors[i * 3] = c.r * brightness;
      colors[i * 3 + 1] = c.g * brightness;
      colors[i * 3 + 2] = c.b * brightness;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      map: starTex,
      size: 1.55,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { starGeo: geo, starMat: mat };
  }, [starTex]);

  // Materials
  const rocketPaintWhite = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: whiteHullTex,
        roughness: 0.34,
        metalness: 0.22,
      }),
    [whiteHullTex]
  );

  const rocketOrangeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: coreTex,
        roughness: 0.54,
        metalness: 0.14,
      }),
    [coreTex]
  );

  const fairingGlassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.24,
        roughness: 0.14,
        metalness: 0.12,
        depthWrite: false,
      }),
    []
  );

  const mainPlumeOuterMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: mainPlumeTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [mainPlumeTex]
  );

  const mainPlumeCoreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xfffbeb,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const vacPlumeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: vacPlumeTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [vacPlumeTex]
  );

  const facilityBuildingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.78,
        metalness: 0.18,
      }),
    []
  );

  const standConcreteMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.85,
        metalness: 0.08,
      }),
    []
  );

  const indianFlagMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: indianFlagTex,
        roughness: 0.65,
        side: THREE.DoubleSide,
      }),
    [indianFlagTex]
  );

  const crowdBodyGeo = useMemo(() => new THREE.CylinderGeometry(0.14, 0.17, 0.56, 8), []);
  const crowdHeadGeo = useMemo(() => new THREE.SphereGeometry(0.115, 8, 8), []);
  const crowdArmGeo = useMemo(() => new THREE.CylinderGeometry(0.04, 0.045, 0.34, 6), []);
  const crowdBodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.06 }),
    []
  );
  const crowdHeadMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#d69e76', roughness: 0.72 }),
    []
  );
  const crowdArmMat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.74, metalness: 0.04 }),
    []
  );
  const stadiumDeckMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.86, metalness: 0.1 }),
    []
  );
  const stadiumSeatMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.7, metalness: 0.08 }),
    []
  );

  // Curved cricket-stadium-style grandstands framing the launch viewing perimeter
  const stadiumStands = useMemo(() => {
    const sections = [
      { id: 'east-pavilion', thetaStart: -1.16, thetaEnd: -0.18, bays: 11, tiers: 7, innerR: 20.5 },
      { id: 'southeast-stand', thetaStart: 0.04, thetaEnd: 0.62, bays: 7, tiers: 7, innerR: 22.8 },
      { id: 'west-bowl', thetaStart: 1.72, thetaEnd: 2.86, bays: 12, tiers: 7, innerR: 19.8 },
    ];
    return sections.map((sec) => {
      const bayList: Array<{
        angle: number;
        arcWidth: number;
        midR: number;
        tierWidthAt: (tier: number) => number;
      }> = [];
      const totalArc = sec.thetaEnd - sec.thetaStart;
      const step = totalArc / sec.bays;
      for (let b = 0; b < sec.bays; b++) {
        const angle = sec.thetaStart + (b + 0.5) * step;
        bayList.push({
          angle,
          arcWidth: step,
          midR: sec.innerR + (sec.tiers - 1) * 0.45,
          tierWidthAt: (tier: number) => (sec.innerR + tier * 0.92) * step * 1.04,
        });
      }
      return { ...sec, baysData: bayList };
    });
  }, []);

  const crowdEntries = useMemo(() => {
    const entries: Array<{
      x: number;
      y: number;
      z: number;
      rotY: number;
      phase: number;
      standing: boolean;
      raisedArm: boolean;
      armSide: number;
      color: THREE.Color;
    }> = [];
    const palette = [
      '#f97316',
      '#f8fafc',
      '#16a34a',
      '#0284c7',
      '#e2e8f0',
      '#eab308',
      '#ef4444',
      '#38bdf8',
      '#1d4ed8',
    ];

    let idx = 0;
    for (const sec of stadiumStands) {
      for (const bay of sec.baysData) {
        for (let tier = 0; tier < sec.tiers; tier++) {
          const r = sec.innerR + tier * 0.92;
          const arcSpan = sec.baysData[0].arcWidth * 0.84;
          const seatsInBay = tier >= 4 ? 4 : 3;
          for (let s = 0; s < seatsInBay; s++) {
            // Skip occasional aisle column for realistic stadium seating blocks
            if (seatsInBay === 4 && s === 0 && (tier % 2 === 1 && bay.angle > 0 && idx % 5 === 0)) continue;
            const frac = s / (seatsInBay - 1) - 0.5;
            const theta = bay.angle + frac * arcSpan + ((tier % 2) - 0.5) * 0.012;
            const wx = Math.cos(theta) * r;
            const wz = Math.sin(theta) * r;
            const standing = (idx * 7 + tier) % 3 === 0;
            const raisedArm = (idx * 11 + tier) % 4 === 0;
            const baseY = 0.62 + tier * 0.48 + (standing ? 0.16 : 0);
            const faceRocketRotY = Math.atan2(-wx, -wz);
            entries.push({
              x: wx,
              y: baseY,
              z: wz,
              rotY: faceRocketRotY,
              phase: idx * 0.61,
              standing,
              raisedArm,
              armSide: idx % 2 === 0 ? 1 : -1,
              color: new THREE.Color(palette[(idx * 3 + tier) % palette.length]),
            });
            idx++;
          }
        }
      }
    }
    return entries;
  }, [stadiumStands]);

  React.useLayoutEffect(() => {
    if (!crowdBodyRef.current || !crowdHeadRef.current || !crowdArmRef.current) return;
    for (let i = 0; i < crowdEntries.length; i++) {
      const c = crowdEntries[i];
      _crowdDummy.position.set(c.x, c.y, c.z);
      _crowdDummy.rotation.set(0, c.rotY, 0);
      _crowdDummy.scale.set(1, c.standing ? 1.08 : 0.88, 1);
      _crowdDummy.updateMatrix();
      crowdBodyRef.current.setMatrixAt(i, _crowdDummy.matrix);
      crowdBodyRef.current.setColorAt(i, c.color);

      _crowdDummy.position.set(c.x, c.y + (c.standing ? 0.43 : 0.36), c.z);
      _crowdDummy.rotation.set(0, c.rotY, 0);
      _crowdDummy.scale.set(1, 1, 1);
      _crowdDummy.updateMatrix();
      crowdHeadRef.current.setMatrixAt(i, _crowdDummy.matrix);

      // Raised cheering arm or resting arm pose
      const rightX = Math.cos(c.rotY) * 0.2 * c.armSide;
      const rightZ = -Math.sin(c.rotY) * 0.2 * c.armSide;
      _crowdDummy.position.set(
        c.x + rightX,
        c.y + (c.raisedArm ? 0.34 : 0.05),
        c.z + rightZ
      );
      _crowdDummy.rotation.set(c.raisedArm ? -0.45 : 0.15, c.rotY, c.raisedArm ? -0.35 * c.armSide : 0.1 * c.armSide);
      _crowdDummy.scale.set(1, 1, 1);
      _crowdDummy.updateMatrix();
      crowdArmRef.current.setMatrixAt(i, _crowdDummy.matrix);
      crowdArmRef.current.setColorAt(i, c.color);
    }
    crowdBodyRef.current.instanceMatrix.needsUpdate = true;
    if (crowdBodyRef.current.instanceColor) crowdBodyRef.current.instanceColor.needsUpdate = true;
    crowdHeadRef.current.instanceMatrix.needsUpdate = true;
    crowdArmRef.current.instanceMatrix.needsUpdate = true;
    if (crowdArmRef.current.instanceColor) crowdArmRef.current.instanceColor.needsUpdate = true;
  }, [crowdEntries]);

  const earthAtmosphereMat = useMemo(
    () => createAtmosphereGlowMaterial('#38bdf8', 0.82, PHASE3_SUN_DIR),
    []
  );

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const clockState = launchAnimRef.current;

    // Derive continuous sub-millisecond progress directly inside Three.js loop
    let tMinus = -LAUNCH_COUNTDOWN_SEC;
    let p = 0;
    if (clockState.completed) {
      tMinus = LAUNCH_ASCENT_DURATION_SEC;
      p = 1;
    } else if (clockState.active) {
      const elapsedSec = (performance.now() - clockState.startMs) / 1000;
      tMinus = elapsedSec - LAUNCH_COUNTDOWN_SEC;
      if (tMinus > 0) {
        p = Math.min(1, tMinus / LAUNCH_ASCENT_DURATION_SEC);
      }
    }

    const isIgnition = clockState.active && tMinus >= -2.2 && tMinus < 0;
    const isLiftoff = p > 0 && p < 0.36;
    const isStageSep = p >= 0.36;
    const isFairingOpen = p >= 0.56;
    const isSpacecraftSep = p >= 0.76;
    const isOrbitSuccess = p >= 1;

    // 1. Sky color & fog transition from Earth Launchpad -> Stratosphere -> Deep Space
    if (p < 0.32) {
      skyColor.copy(earthDaySky).lerp(stratoSky, p / 0.32);
    } else {
      skyColor.copy(stratoSky).lerp(spaceSky, Math.min(1, (p - 0.32) / 0.3));
    }
    scene.background = skyColor;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(skyColor);
      scene.fog.density =
        p >= 0.42 ? 0 : THREE.MathUtils.lerp(0.0065, 0, Math.min(1, p / 0.42));
    }

    // 2. Smooth S-curve ascent trajectory (accelerates from pad, eases softly into orbit)
    const easedP =
      p < 0.72
        ? Math.pow(p / 0.72, 1.85) * 0.72
        : 0.72 + (1 - Math.pow(1 - (p - 0.72) / 0.28, 2.15)) * 0.28;
    const rocketY = easedP * 185;
    const padShake = isIgnition || (isLiftoff && p < 0.1) ? Math.sin(t * 52) * 0.028 : 0;

    if (rocketRootRef.current) {
      rocketRootRef.current.position.set(padShake, rocketY, padShake * 0.6);
    }

    // Center starfield around current rocket altitude
    if (starFieldGroupRef.current) {
      starFieldGroupRef.current.position.set(0, rocketY, 0);
      const starFade = THREE.MathUtils.clamp((p - 0.22) / 0.28, 0, 1);
      starMat.opacity = starFade;
      starFieldGroupRef.current.visible = starFade > 0.01;
    }

    // 3. Umbilical tower swing arm smooth retraction
    if (umbilicalArmRef.current) {
      const targetArmRot = isIgnition || p > 0 ? -Math.PI * 0.44 : 0;
      umbilicalArmRef.current.rotation.y = THREE.MathUtils.damp(
        umbilicalArmRef.current.rotation.y,
        targetArmRot,
        4.5,
        dt
      );
    }

    // 4. Main booster volumetric exhaust plume
    if (exhaustGroupRef.current) {
      const showMainFlame = (isIgnition || p > 0) && !isStageSep;
      exhaustGroupRef.current.visible = showMainFlame;
      if (showMainFlame) {
        const flicker = 0.92 + Math.sin(t * 46) * 0.1 + Math.cos(t * 73) * 0.05;
        const lenScale = isIgnition ? 0.58 : 1.18;
        exhaustGroupRef.current.scale.set(
          0.95 + Math.sin(t * 38) * 0.06,
          flicker * lenScale,
          0.95 + Math.cos(t * 38) * 0.06
        );
      }
    }

    // 5. First stage separation smooth drop-away
    if (firstStageRef.current) {
      const targetDrop = isStageSep ? -20 : 0;
      firstStageRef.current.position.y = THREE.MathUtils.damp(
        firstStageRef.current.position.y,
        targetDrop,
        2.0,
        dt
      );
      firstStageRef.current.rotation.z = THREE.MathUtils.damp(
        firstStageRef.current.rotation.z,
        isStageSep ? 0.14 : 0,
        1.5,
        dt
      );
      firstStageRef.current.visible = firstStageRef.current.position.y > -18.5;
    }

    // Upper stage vacuum engine burn during stageSep & fairingSep
    if (upperExhaustGroupRef.current) {
      const upperBurn = isStageSep && !isSpacecraftSep;
      upperExhaustGroupRef.current.visible = upperBurn;
      if (upperBurn) {
        const pulse = 0.92 + Math.sin(t * 34) * 0.1;
        upperExhaustGroupRef.current.scale.set(1, pulse, 1);
      }
    }

    // 6. Clamshell payload fairing jettison
    if (fairingLeftRef.current && fairingRightRef.current) {
      const targetX = isFairingOpen ? -4.5 : 0;
      const targetRot = isFairingOpen ? 0.48 : 0;
      fairingLeftRef.current.position.x = THREE.MathUtils.damp(
        fairingLeftRef.current.position.x,
        targetX,
        2.6,
        dt
      );
      fairingLeftRef.current.rotation.z = THREE.MathUtils.damp(
        fairingLeftRef.current.rotation.z,
        targetRot,
        2.6,
        dt
      );
      fairingRightRef.current.position.x = THREE.MathUtils.damp(
        fairingRightRef.current.position.x,
        -targetX,
        2.6,
        dt
      );
      fairingRightRef.current.rotation.z = THREE.MathUtils.damp(
        fairingRightRef.current.rotation.z,
        -targetRot,
        2.6,
        dt
      );
      const visibleFairing = Math.abs(fairingLeftRef.current.position.x) < 4.1;
      fairingLeftRef.current.visible = visibleFairing;
      fairingRightRef.current.visible = visibleFairing;
    }

    // 7. Continuous smooth spacecraft + rover separation (zero stutter)
    if (spacecraftRef.current) {
      const sepCurve = THREE.MathUtils.smoothstep(p, 0.76, 0.97);
      const targetSepY = isSpacecraftSep ? 1.85 + sepCurve * 3.4 : 1.85;
      spacecraftRef.current.position.y = THREE.MathUtils.damp(
        spacecraftRef.current.position.y,
        targetSepY,
        4.2,
        dt
      );
      const targetRotY = isOrbitSuccess ? spacecraftRef.current.rotation.y + dt * 0.22 : 0;
      if (isOrbitSuccess) {
        spacecraftRef.current.rotation.y = targetRotY;
      } else {
        spacecraftRef.current.rotation.y = THREE.MathUtils.damp(
          spacecraftRef.current.rotation.y,
          0,
          4,
          dt
        );
      }
    }

    // 8. Detailed 3D Earth globe + rotating clouds in orbit (clearly lit & positioned below horizon)
    if (earthSphereRef.current) {
      earthSphereRef.current.visible = p > 0.3;
      earthSphereRef.current.position.set(6, rocketY - 52.5, -28);
      earthSphereRef.current.rotation.y = 0.85 + t * 0.014;
    }
    if (earthCloudsRef.current) {
      earthCloudsRef.current.rotation.y = t * 0.019;
    }

    // 8b. Subtle spectator cheering animation & Indian flag breeze near pad (only when near pad)
    if (p < 0.28) {
      const cheerAmp = isIgnition || isLiftoff ? 0.085 : 0.022;
      const cheerSpeed = isIgnition || isLiftoff ? 7.8 : 2.3;
      if (crowdBodyRef.current && crowdHeadRef.current && crowdArmRef.current) {
        for (let i = 0; i < crowdEntries.length; i++) {
          const c = crowdEntries[i];
          const wave = Math.sin(t * cheerSpeed + c.phase);
          const hop = (c.standing || isIgnition || isLiftoff ? Math.abs(wave) : 0.2 * Math.abs(wave)) * cheerAmp;
          _crowdDummy.position.set(c.x, c.y + hop, c.z);
          _crowdDummy.rotation.set(0, c.rotY, Math.sin(t * 2.5 + c.phase) * 0.045);
          _crowdDummy.scale.set(1, c.standing ? 1.08 : 0.88, 1);
          _crowdDummy.updateMatrix();
          crowdBodyRef.current.setMatrixAt(i, _crowdDummy.matrix);

          _crowdDummy.position.set(c.x, c.y + (c.standing ? 0.43 : 0.36) + hop, c.z);
          _crowdDummy.rotation.set(0, c.rotY, 0);
          _crowdDummy.scale.set(1, 1, 1);
          _crowdDummy.updateMatrix();
          crowdHeadRef.current.setMatrixAt(i, _crowdDummy.matrix);

          const rightX = Math.cos(c.rotY) * 0.2 * c.armSide;
          const rightZ = -Math.sin(c.rotY) * 0.2 * c.armSide;
          const armBoost = isIgnition || isLiftoff || c.raisedArm ? 1 : 0;
          _crowdDummy.position.set(
            c.x + rightX,
            c.y + (armBoost ? 0.34 : 0.05) + hop,
            c.z + rightZ
          );
          _crowdDummy.rotation.set(
            armBoost ? -0.45 - Math.sin(t * 6.5 + c.phase) * 0.22 : 0.15,
            c.rotY,
            armBoost ? -0.35 * c.armSide : 0.1 * c.armSide
          );
          _crowdDummy.scale.set(1, 1, 1);
          _crowdDummy.updateMatrix();
          crowdArmRef.current.setMatrixAt(i, _crowdDummy.matrix);
        }
        crowdBodyRef.current.instanceMatrix.needsUpdate = true;
        crowdHeadRef.current.instanceMatrix.needsUpdate = true;
        crowdArmRef.current.instanceMatrix.needsUpdate = true;
      }
      for (let f = 0; f < flagRefs.current.length; f++) {
        const flag = flagRefs.current[f];
        if (flag) {
          flag.rotation.y = Math.sin(t * 3.2 + f * 0.9) * 0.18;
        }
      }
    }

    // 9. Soft radial volumetric pad exhaust smoke billow
    if (smokePointsRef.current) {
      const showSmoke = isIgnition || (isLiftoff && p < 0.25);
      smokePointsRef.current.visible = showSmoke;
      if (showSmoke) {
        const pos = smokePointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < SMOKE_COUNT; i++) {
          const ang = i * 0.62 + (i % 3) * 0.25;
          const speed = 1.6 + (i % 6) * 0.42;
          const life = (t * speed * 0.35 + i * 0.09) % 1;
          const rad = 0.8 + life * 8.2;
          const sy = 0.35 + life * 2.9 + Math.sin(t * 2 + i) * 0.18;
          pos.setXYZ(i, Math.cos(ang) * rad, sy, Math.sin(ang) * rad);
        }
        pos.needsUpdate = true;
      }
    }

    // 10. Continuous, blended camera tracking (zero abrupt snaps across stages)
    const padToAscentBlend = THREE.MathUtils.smoothstep(p, 0.0, 0.08);
    const orbitBlend = THREE.MathUtils.smoothstep(p, 0.73, 0.9);

    // Pad + Ascent target
    _camAscentPos.set(
      THREE.MathUtils.lerp(12.5, 10.8, padToAscentBlend),
      THREE.MathUtils.lerp(6.2, rocketY + 8.0, padToAscentBlend),
      THREE.MathUtils.lerp(14.5, 13.8, padToAscentBlend)
    );
    _camAscentLook.set(0, THREE.MathUtils.lerp(6.5, rocketY + 9.2, padToAscentBlend), 0);

    // Orbital spacecraft separation showcase target
    const orbitAngle = t * 0.28;
    const scCenterY = rocketY + 12.6;
    _camOrbitPos.set(
      Math.cos(orbitAngle) * 6.8,
      scCenterY + 1.8,
      Math.sin(orbitAngle) * 6.8
    );
    _camOrbitLook.set(0, scCenterY, 0);

    _camDesiredPos.lerpVectors(_camAscentPos, _camOrbitPos, orbitBlend);
    _camDesiredLook.lerpVectors(_camAscentLook, _camOrbitLook, orbitBlend);

    camera.position.x = THREE.MathUtils.damp(camera.position.x, _camDesiredPos.x, 4.5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _camDesiredPos.y, 4.5, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _camDesiredPos.z, 4.5, dt);

    smoothLookRef.current.x = THREE.MathUtils.damp(smoothLookRef.current.x, _camDesiredLook.x, 5.0, dt);
    smoothLookRef.current.y = THREE.MathUtils.damp(smoothLookRef.current.y, _camDesiredLook.y, 5.0, dt);
    smoothLookRef.current.z = THREE.MathUtils.damp(smoothLookRef.current.z, _camDesiredLook.z, 5.0, dt);
    camera.lookAt(smoothLookRef.current);
  });

  return (
    <group>
      {/* DEEP SPACE STARFIELD */}
      <group ref={starFieldGroupRef} visible={false}>
        <points geometry={starGeo} material={starMat} frustumCulled={false} />
      </group>

      {/* EARTH LAUNCH FACILITY COMPLEX 41 */}
      <group>
        {/* Coastal Spaceport Terrain */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[260, 260]} />
          <meshStandardMaterial color="#243528" roughness={0.92} metalness={0.04} />
        </mesh>

        {/* Spaceport Service Road & Perimeter Asphalt */}
        <mesh position={[0, -0.02, -14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[7, 68]} />
          <meshStandardMaterial color="#1e293b" roughness={0.88} />
        </mesh>

        {/* Concrete Launch Apron */}
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <cylinderGeometry args={[12, 13.8, 0.28, 32]} />
          <meshStandardMaterial color="#475569" roughness={0.85} metalness={0.12} />
        </mesh>

        {/* Raised Launch Mount, Flame Trench & Deflector Wedge */}
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow material={mats.titaniumDark}>
          <boxGeometry args={[4.8, 1.1, 4.8]} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[2.4, 0.92, 6.8]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
        {/* Hold-Down Clamps */}
        {[-1.55, 1.55].map((xPos, idx) => (
          <mesh key={idx} position={[xPos, 1.28, 0]} material={mats.brushedAluminum}>
            <boxGeometry args={[0.38, 0.35, 0.5]} />
          </mesh>
        ))}

        {/* Steel Umbilical Service & Control Tower */}
        <group position={[-4.2, 0, -1.6]}>
          <mesh position={[0, 6.8, 0]} castShadow material={mats.titaniumDark}>
            <boxGeometry args={[1.65, 13.6, 1.65]} />
          </mesh>
          {[2.2, 5.4, 8.6, 11.8].map((yPos, idx) => (
            <mesh key={idx} position={[0, yPos, 0]}>
              <boxGeometry args={[1.72, 0.9, 1.72]} />
              <meshStandardMaterial color={idx % 2 === 0 ? '#dc2626' : '#f1f5f9'} roughness={0.5} />
            </mesh>
          ))}
          {/* Lightning Mast */}
          <mesh position={[0, 14.8, 0]} material={mats.brushedAluminum}>
            <cylinderGeometry args={[0.04, 0.09, 2.4, 8]} />
          </mesh>
          <mesh position={[0, 16.05, 0]} material={mats.amberEmissive}>
            <sphereGeometry args={[0.12, 10, 10]} />
          </mesh>
          {/* Animated Swing-Away Umbilical Arm */}
          <group position={[0.7, 9.2, 0.8]} ref={umbilicalArmRef}>
            <mesh position={[1.7, 0, 0.4]} rotation={[0, -0.22, 0]} material={mats.brushedAluminum}>
              <boxGeometry args={[3.4, 0.28, 0.32]} />
            </mesh>
          </group>
        </group>

        {/* Secondary Lightning Protection Towers */}
        {[
          [8.2, 0, -7.8],
          [-8.2, 0, 6.8],
          [8.2, 0, 6.8],
        ].map((pos, idx) => (
          <group key={`ltower-${idx}`} position={pos as [number, number, number]}>
            <mesh position={[0, 6.5, 0]} material={mats.titaniumDark}>
              <cylinderGeometry args={[0.18, 0.38, 13, 8]} />
            </mesh>
            <mesh position={[0, 13.3, 0]} material={mats.amberEmissive}>
              <sphereGeometry args={[0.14, 8, 8]} />
            </mesh>
          </group>
        ))}

        {/* Cryogenic Propellant Farm (LOX & LH2 Spheres + Feed Pipes) */}
        {[
          [-16, 2.2, -9.5],
          [-21.5, 2.2, -9.5],
        ].map((pos, idx) => (
          <group key={`tank-${idx}`} position={pos as [number, number, number]}>
            <mesh material={mats.chassisWhite} castShadow>
              <sphereGeometry args={[2.1, 20, 16]} />
            </mesh>
            <mesh position={[0, -1.6, 0]} material={mats.titaniumDark}>
              <cylinderGeometry args={[1.6, 1.9, 1.2, 12]} />
            </mesh>
          </group>
        ))}
        <mesh position={[-10.5, 0.42, -5.5]} rotation={[0, -0.35, 0]} material={mats.brushedAluminum}>
          <boxGeometry args={[14, 0.24, 0.3]} />
        </mesh>

        {/* Distant Vehicle Assembly Building (VAB) & Launch Control Center */}
        <group position={[22, 0, -34]}>
          <mesh position={[0, 9.5, 0]} material={facilityBuildingMat} castShadow>
            <boxGeometry args={[18, 19, 14]} />
          </mesh>
          {/* High-Bay Hangar Doors */}
          <mesh position={[0, 7, 7.05]} material={mats.titaniumDark}>
            <boxGeometry args={[7.2, 14, 0.15]} />
          </mesh>
          <mesh position={[0, 16.5, 7.05]} material={mats.cyanEmissive}>
            <boxGeometry args={[14, 0.45, 0.15]} />
          </mesh>
        </group>

        {/* Range Telemetry Radar Station */}
        <group position={[-24, 0, -24]}>
          <mesh position={[0, 2.2, 0]} material={facilityBuildingMat}>
            <boxGeometry args={[7.5, 4.4, 6.5]} />
          </mesh>
          <mesh position={[0, 5.4, 0]} material={mats.chassisWhite}>
            <sphereGeometry args={[2.1, 18, 14]} />
          </mesh>
        </group>

        {/* Satish Dhawan Style Mission Control Center & Press Observation Building */}
        <group position={[31, 0, -10]} rotation={[0, -1.25, 0]}>
          <mesh position={[0, 2.8, 0]} material={facilityBuildingMat} castShadow receiveShadow>
            <boxGeometry args={[12.5, 5.6, 7.5]} />
          </mesh>
          {/* Panoramic Tinted Glass Observation Gallery */}
          <mesh position={[0, 3.8, 3.8]} material={fairingGlassMat}>
            <boxGeometry args={[11.2, 1.8, 0.14]} />
          </mesh>
          <mesh position={[0, 5.75, 0]} material={mats.chassisWhite}>
            <boxGeometry args={[12.9, 0.3, 7.9]} />
          </mesh>
          <mesh position={[0, 6.15, 0]} material={mats.cyanEmissive}>
            <boxGeometry args={[9.5, 0.12, 0.14]} />
          </mesh>
        </group>

        {/* Stadium-Scale Curved Spectator Stands Surrounding Launch Perimeter */}
        {stadiumStands.map((sec) => (
          <group key={sec.id}>
            {sec.baysData.map((bay, bIdx) => {
              const faceRotY = Math.atan2(-Math.cos(bay.angle), -Math.sin(bay.angle));
              const cosA = Math.cos(bay.angle);
              const sinA = Math.sin(bay.angle);
              const roofR = sec.innerR + sec.tiers * 0.92 - 1.1;
              return (
                <group key={`${sec.id}-bay-${bIdx}`}>
                  {/* 7 Stepped Concrete Risers + Blue Stadium Seating Decks */}
                  {Array.from({ length: sec.tiers }, (_, tier) => {
                    const r = sec.innerR + tier * 0.92;
                    const bayW = bay.tierWidthAt(tier);
                    return (
                      <group
                        key={tier}
                        position={[cosA * r, 0.24 + tier * 0.48, sinA * r]}
                        rotation={[0, faceRotY, 0]}
                      >
                        <mesh material={standConcreteMat} castShadow receiveShadow>
                          <boxGeometry args={[bayW, 0.48, 0.94]} />
                        </mesh>
                        <mesh position={[0, 0.26, -0.05]} material={stadiumSeatMat}>
                          <boxGeometry args={[bayW * 0.96, 0.06, 0.62]} />
                        </mesh>
                      </group>
                    );
                  })}

                  {/* Sweeping Stadium Canopy Roof + Rear Structural Columns */}
                  <group
                    position={[cosA * roofR, 4.95, sinA * roofR]}
                    rotation={[0, faceRotY, 0]}
                  >
                    <mesh rotation={[-0.14, 0, 0]} material={mats.chassisWhite} castShadow>
                      <boxGeometry args={[bay.tierWidthAt(sec.tiers - 1) * 1.03, 0.16, 4.9]} />
                    </mesh>
                    <mesh position={[0, 0.11, -2.3]} material={mats.cyanEmissive}>
                      <boxGeometry args={[bay.tierWidthAt(sec.tiers - 1) * 0.98, 0.06, 0.1]} />
                    </mesh>
                  </group>

                  {bIdx % 3 === 0 && (
                    <mesh
                      position={[
                        cosA * (sec.innerR + sec.tiers * 0.92 + 0.35),
                        2.55,
                        sinA * (sec.innerR + sec.tiers * 0.92 + 0.35),
                      ]}
                      material={stadiumDeckMat}
                    >
                      <cylinderGeometry args={[0.14, 0.18, 5.1, 8]} />
                    </mesh>
                  )}

                  {/* Front Spectator Viewing Barrier */}
                  <mesh
                    position={[cosA * (sec.innerR - 0.62), 0.55, sinA * (sec.innerR - 0.62)]}
                    rotation={[0, faceRotY, 0]}
                    material={mats.brushedAluminum}
                  >
                    <boxGeometry args={[bay.tierWidthAt(0), 0.72, 0.08]} />
                  </mesh>
                </group>
              );
            })}
          </group>
        ))}

        {/* Instanced Animated Spectators (~620 Organized Stadium Audience Members) */}
        <instancedMesh
          ref={crowdBodyRef}
          args={[crowdBodyGeo, crowdBodyMat, crowdEntries.length]}
          castShadow
        />
        <instancedMesh
          ref={crowdHeadRef}
          args={[crowdHeadGeo, crowdHeadMat, crowdEntries.length]}
        />
        <instancedMesh
          ref={crowdArmRef}
          args={[crowdArmGeo, crowdArmMat, crowdEntries.length]}
        />

        {/* Indian National Flags Surrounding Stadium Rim & Viewing Platforms */}
        {[
          [17.5, 0, -10.5],
          [19.2, 0, -4.5],
          [21.2, 0, 2.2],
          [18.8, 0, 11.4],
          [13.4, 0, 13.8],
          [-6.2, 0, 16.5],
          [-12.2, 0, 15.8],
          [-17.4, 0, 10.6],
          [-19.2, 0, 3.6],
          [-14.2, 0, -12.6],
        ].map((fPos, fIdx) => (
          <group key={`ind-flag-${fIdx}`} position={fPos as [number, number, number]}>
            <mesh position={[0, 3.6, 0]} material={mats.brushedAluminum} castShadow>
              <cylinderGeometry args={[0.045, 0.068, 7.2, 10]} />
            </mesh>
            <mesh position={[0, 7.26, 0]} material={mats.amberEmissive}>
              <sphereGeometry args={[0.09, 8, 8]} />
            </mesh>
            <mesh
              ref={(el) => {
                flagRefs.current[fIdx] = el;
              }}
              position={[0.88, 6.45, 0]}
              material={indianFlagMat}
              castShadow
            >
              <planeGeometry args={[1.76, 1.16, 4, 2]} />
            </mesh>
          </group>
        ))}

        {/* Launch Apron Perimeter Floodlight Towers */}
        {[
          [12.8, 0, 12.8],
          [-12.8, 0, 12.8],
          [13.5, 0, -11.5],
        ].map((lPos, lIdx) => (
          <group key={`flood-${lIdx}`} position={lPos as [number, number, number]}>
            <mesh position={[0, 4.2, 0]} material={mats.titaniumDark}>
              <cylinderGeometry args={[0.09, 0.16, 8.4, 8]} />
            </mesh>
            <mesh position={[0, 8.45, 0]} material={mats.chassisWhite}>
              <boxGeometry args={[1.2, 0.42, 0.35]} />
            </mesh>
            <mesh position={[0, 8.45, 0.19]} material={mats.amberEmissive}>
              <boxGeometry args={[1.05, 0.28, 0.04]} />
            </mesh>
          </group>
        ))}

        {/* Soft Gaussian Volumetric Pad Exhaust Smoke */}
        <points ref={smokePointsRef} geometry={smokeGeo} visible={false}>
          <pointsMaterial
            map={smokeTex}
            color="#f1f5f9"
            size={3.6}
            transparent
            opacity={0.62}
            depthWrite={false}
            alphaTest={0.005}
          />
        </points>
      </group>

      {/* DETAILED 3D CURVED EARTH GLOBE FROM ORBIT */}
      <group ref={earthSphereRef} visible={false} rotation={[0.18, 0, 0.14]}>
        <mesh>
          <sphereGeometry args={[52, 64, 48]} />
          <meshStandardMaterial
            map={earthAlbedoTex}
            roughnessMap={earthRoughnessTex}
            bumpMap={earthBumpTex}
            bumpScale={0.14}
            roughness={0.95}
            metalness={0.02}
          />
        </mesh>
        <mesh ref={earthCloudsRef}>
          <sphereGeometry args={[52.35, 56, 40]} />
          <meshStandardMaterial
            map={earthCloudTex}
            transparent
            opacity={0.86}
            depthWrite={false}
            roughness={0.94}
          />
        </mesh>
        <mesh material={earthAtmosphereMat}>
          <sphereGeometry args={[54.2, 56, 40]} />
        </mesh>
      </group>

      {/* HEAVY-LIFT MARS LAUNCH VEHICLE */}
      <group ref={rocketRootRef}>
        {/* FIRST STAGE BOOSTER + 2 SOLID ROCKET BOOSTERS */}
        <group ref={firstStageRef}>
          <mesh position={[0, 5.0, 0]} castShadow material={rocketOrangeMat}>
            <cylinderGeometry args={[0.92, 0.92, 7.6, 32]} />
          </mesh>
          <mesh position={[0, 4.9, 0.96]} material={mats.brushedAluminum}>
            <cylinderGeometry args={[0.075, 0.075, 6.8, 12]} />
          </mesh>
          <mesh position={[0, 8.72, 0]} material={mats.titaniumDark}>
            <cylinderGeometry args={[0.95, 0.95, 0.36, 32]} />
          </mesh>
          <mesh position={[0, 1.35, 0]} material={mats.titaniumDark}>
            <cylinderGeometry args={[0.94, 1.08, 0.72, 32]} />
          </mesh>
          {[
            [0, 0.84, 0.38],
            [-0.34, 0.84, -0.22],
            [0.34, 0.84, -0.22],
          ].map((pos, idx) => (
            <group key={`eng-${idx}`} position={pos as [number, number, number]}>
              <mesh material={mats.titaniumDark}>
                <cylinderGeometry args={[0.2, 0.34, 0.56, 18]} />
              </mesh>
              <mesh position={[0, -0.22, 0]} material={mats.amberEmissive}>
                <cylinderGeometry args={[0.18, 0.25, 0.12, 16]} />
              </mesh>
            </group>
          ))}

          {[-1.32, 1.32].map((xPos, idx) => (
            <group key={idx} position={[xPos, 4.1, 0]}>
              <mesh castShadow material={rocketPaintWhite}>
                <cylinderGeometry args={[0.37, 0.37, 6.2, 24]} />
              </mesh>
              <mesh position={[0, 3.48, 0]} material={rocketPaintWhite}>
                <coneGeometry args={[0.37, 0.82, 24]} />
              </mesh>
              <mesh position={[0, 3.85, 0]} material={mats.titaniumDark}>
                <coneGeometry args={[0.09, 0.22, 14]} />
              </mesh>
              <mesh position={[xPos > 0 ? -0.38 : 0.38, 2.5, 0]} material={mats.titaniumDark}>
                <boxGeometry args={[0.4, 0.14, 0.16]} />
              </mesh>
              <mesh position={[xPos > 0 ? -0.38 : 0.38, -2.5, 0]} material={mats.titaniumDark}>
                <boxGeometry args={[0.4, 0.14, 0.16]} />
              </mesh>
              <mesh position={[0, -3.28, 0]} material={mats.titaniumDark}>
                <cylinderGeometry args={[0.22, 0.35, 0.5, 18]} />
              </mesh>
            </group>
          ))}

          <group ref={exhaustGroupRef} position={[0, 0.4, 0]} visible={false}>
            <mesh position={[0, -2.4, 0]} rotation={[Math.PI, 0, 0]} material={mainPlumeOuterMat}>
              <coneGeometry args={[1.45, 5.2, 24, 1, true]} />
            </mesh>
            <mesh position={[0, -1.65, 0]} rotation={[Math.PI, 0, 0]} material={mainPlumeCoreMat}>
              <coneGeometry args={[0.68, 3.2, 18]} />
            </mesh>
            <pointLight position={[0, -1.2, 0]} intensity={5.5} distance={22} color="#fb923c" />
          </group>
        </group>

        {/* UPPER STAGE + PAYLOAD FAIRING + USER'S ASSEMBLED ROVER */}
        <group ref={upperStageRef} position={[0, 8.8, 0]}>
          <mesh position={[0, 0.9, 0]} material={rocketPaintWhite}>
            <cylinderGeometry args={[0.91, 0.93, 1.8, 32]} />
          </mesh>
          {[-0.93, 0.93].map((xPos, idx) => (
            <mesh key={`rcs-${idx}`} position={[xPos, 1.45, 0]} material={mats.titaniumDark}>
              <boxGeometry args={[0.12, 0.22, 0.16]} />
            </mesh>
          ))}
          <mesh position={[0, -0.22, 0]} material={mats.titaniumDark}>
            <cylinderGeometry args={[0.26, 0.46, 0.56, 20]} />
          </mesh>
          <group ref={upperExhaustGroupRef} position={[0, -0.5, 0]} visible={false}>
            <mesh position={[0, -1.25, 0]} rotation={[Math.PI, 0, 0]} material={vacPlumeMat}>
              <coneGeometry args={[0.78, 2.6, 20, 1, true]} />
            </mesh>
            <mesh position={[0, -0.75, 0]} rotation={[Math.PI, 0, 0]} material={mainPlumeCoreMat}>
              <coneGeometry args={[0.32, 1.4, 14]} />
            </mesh>
          </group>

          {/* SPACECRAFT CRUISE ADAPTER + ASSEMBLED ARES-IV ROVER */}
          <group ref={spacecraftRef} position={[0, 1.85, 0]}>
            <mesh position={[0, 0.14, 0]} material={mats.kaptonGold}>
              <cylinderGeometry args={[0.85, 0.88, 0.28, 28]} />
            </mesh>
            <mesh position={[0, 0.32, 0]} material={mats.titaniumDark}>
              <cylinderGeometry args={[0.78, 0.85, 0.1, 28]} />
            </mesh>
            <group position={[0, 0.38, 0]} scale={0.56}>
              <RoverModel
                installedComponents={installedComponents}
                selectedComponentId="wheels"
                installingComponentId={null}
                installProgress={100}
                isTestingActive={false}
                activationStage={activationStage}
                lightsOn={lightsOn}
                computerOnline={computerOnline}
              />
            </group>
          </group>

          {/* CLAMSHELL PAYLOAD FAIRING */}
          <group position={[0, 1.8, 0]}>
            <group ref={fairingLeftRef}>
              <mesh position={[-0.02, 1.15, 0]} material={fairingGlassMat}>
                <cylinderGeometry args={[1.04, 0.94, 2.3, 28, 1, false, Math.PI * 0.5, Math.PI]} />
              </mesh>
              <mesh position={[-0.02, 2.75, 0]} material={rocketPaintWhite}>
                <coneGeometry args={[1.04, 1.15, 28, 1, false, Math.PI * 0.5, Math.PI]} />
              </mesh>
            </group>
            <group ref={fairingRightRef}>
              <mesh position={[0.02, 1.15, 0]} material={fairingGlassMat}>
                <cylinderGeometry
                  args={[1.04, 0.94, 2.3, 28, 1, false, -Math.PI * 0.5, Math.PI]}
                />
              </mesh>
              <mesh position={[0.02, 2.75, 0]} material={rocketPaintWhite}>
                <coneGeometry args={[1.04, 1.15, 28, 1, false, -Math.PI * 0.5, Math.PI]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
