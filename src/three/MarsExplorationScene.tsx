import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ActivationSequenceStage, ComponentId, ExplorationActivityId, ScienceAnimState } from '../types/mission';
import {
  AutoDriveTarget,
  DriveControlsState,
  MARS_LANDER_POS,
  RoverSurfacePose,
  SOIL_SAMPLE_SITE,
  TARGET_ROCK_FORMATIONS,
} from '../state/useMarsExploration';
import { getRoverMaterials } from './materials';
import { RoverModel } from './RoverModel';

interface MarsExplorationSceneProps {
  installedComponents: Record<ComponentId, boolean>;
  activationStage: ActivationSequenceStage;
  lightsOn: boolean;
  computerOnline: boolean;
  driveInputRef: React.MutableRefObject<DriveControlsState>;
  roverPoseRef: React.MutableRefObject<RoverSurfacePose>;
  wheelSpeedRef: React.MutableRefObject<number>;
  armActiveRef: React.MutableRefObject<boolean>;
  zoomDeltaRef: React.MutableRefObject<number>;
  activeScienceScan: ExplorationActivityId | null;
  autoDriveTargetRef: React.MutableRefObject<AutoDriveTarget | null>;
  scienceAnimRef: React.MutableRefObject<ScienceAnimState>;
  nextWaypointPos: { x: number; z: number };
  isSoftwareGl: boolean;
}

const SCATTER_ROCK_COUNT = 180;
const WHEEL_DUST_COUNT = 54;
const MAX_DRIVE_RADIUS = 56;

// Module-scope reusable math vectors (zero GC allocations inside useFrame)
const _dummy = new THREE.Object3D();
const _prevRoverPos = new THREE.Vector3();
const _deltaMove = new THREE.Vector3();
const _camForward = new THREE.Vector3();

// Deterministic Jezero Crater terrain heightfield
export function getMarsTerrainHeight(x: number, z: number): number {
  const distFromPad = Math.hypot(x, z + 2.5);
  const padFlatten = THREE.MathUtils.smoothstep(distFromPad, 3.2, 11.5);

  const rolling =
    Math.sin(x * 0.085) * Math.cos(z * 0.075) * 0.72 +
    Math.sin(x * 0.19 + z * 0.14) * 0.24 +
    Math.cos(x * 0.045 - z * 0.05) * 0.95;

  // Shallow impact crater around (-22, -18)
  const craterDist = Math.hypot(x + 22, z + 18);
  const craterBowl =
    craterDist < 12
      ? -1.45 * Math.cos((craterDist / 12) * Math.PI * 0.5)
      : craterDist < 16.5
        ? Math.sin(((craterDist - 12) / 4.5) * Math.PI) * 0.65
        : 0;

  // Gentle rim rise in far field
  const r = Math.hypot(x, z);
  const rimLift = r > 42 ? Math.pow((r - 42) / 28, 1.45) * 2.8 : 0;

  return (rolling + craterBowl) * padFlatten + rimLift;
}

interface ObstacleCircle {
  x: number;
  z: number;
  r: number;
}

const LARGE_BOULDERS: Array<{ x: number; z: number; scale: number; rot: number }> = [
  { x: 15.5, z: -2.4, scale: 1.35, rot: 0.4 },
  { x: -14.2, z: -9.8, scale: 1.55, rot: 1.1 },
  { x: 5.8, z: 14.8, scale: 1.4, rot: 2.3 },
  { x: -7.5, z: -18.5, scale: 1.75, rot: 0.9 },
  { x: 21.0, z: 11.5, scale: 1.6, rot: 1.8 },
  { x: -23.5, z: -2.2, scale: 1.45, rot: 2.7 },
  { x: 18.2, z: -21.0, scale: 1.9, rot: 0.6 },
  { x: -16.8, z: 19.2, scale: 1.7, rot: 1.4 },
  { x: 28.5, z: -6.5, scale: 1.8, rot: 2.1 },
  { x: -28.0, z: 14.0, scale: 1.65, rot: 0.2 },
  { x: 2.5, z: -24.5, scale: 1.5, rot: 1.9 },
  { x: -3.5, z: 25.5, scale: 1.85, rot: 2.5 },
];

const COLLISION_OBSTACLES: ObstacleCircle[] = [
  { x: MARS_LANDER_POS[0], z: MARS_LANDER_POS[1], r: 2.55 },
  ...TARGET_ROCK_FORMATIONS.map((f) => ({ x: f.x, z: f.z, r: 2.1 })),
  ...LARGE_BOULDERS.map((b) => ({ x: b.x, z: b.z, r: 0.72 * b.scale + 0.85 })),
];

function createMarsSurfaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#a34a25';
  ctx.fillRect(0, 0, 512, 512);

  // Wind-rippled Martian dune streaks
  for (let y = 0; y < 512; y += 10) {
    const alpha = 0.08 + ((y * 7) % 10) * 0.012;
    ctx.fillStyle = y % 20 === 0 ? `rgba(218, 128, 74, ${alpha})` : `rgba(68, 25, 13, ${alpha})`;
    ctx.fillRect(0, y, 512, 5);
  }

  for (let i = 0; i < 280; i++) {
    const x = ((Math.sin(i * 19.31) * 0.5 + 0.5) * 512) % 512;
    const y = ((Math.cos(i * 43.17) * 0.5 + 0.5) * 512) % 512;
    const rx = 10 + (i % 34);
    const ry = 4 + (i % 12);
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(62, 22, 12, 0.25)'
        : i % 3 === 1
          ? 'rgba(212, 120, 68, 0.24)'
          : 'rgba(138, 60, 28, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.24, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let p = 0; p < 2200; p++) {
    const px = (Math.sin(p * 12.9898) * 0.5 + 0.5) * 512;
    const py = (Math.cos(p * 78.233) * 0.5 + 0.5) * 512;
    ctx.fillStyle = p % 2 === 0 ? 'rgba(54, 20, 10, 0.36)' : 'rgba(235, 152, 98, 0.28)';
    ctx.fillRect(px, py, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  tex.anisotropy = 8;
  return tex;
}

function createDustSprite(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(48, 48, 2, 48, 48, 46);
  grad.addColorStop(0, 'rgba(222, 130, 78, 0.5)');
  grad.addColorStop(0.55, 'rgba(182, 90, 48, 0.22)');
  grad.addColorStop(1, 'rgba(154, 72, 34, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 96, 96);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const MarsExplorationScene: React.FC<MarsExplorationSceneProps> = ({
  installedComponents,
  activationStage,
  lightsOn,
  computerOnline,
  driveInputRef,
  roverPoseRef,
  wheelSpeedRef,
  armActiveRef,
  zoomDeltaRef,
  activeScienceScan,
  autoDriveTargetRef,
  scienceAnimRef,
  nextWaypointPos,
  isSoftwareGl,
}) => {
  const { camera } = useThree();
  const mats = useMemo(() => getRoverMaterials(), []);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const roverGroupRef = useRef<THREE.Group>(null);
  const waypointGuideRef = useRef<THREE.Group>(null);
  const drillSparkRef = useRef<THREE.Mesh>(null);
  const soilScoopCloudRef = useRef<THREE.Mesh>(null);
  const scatterRockRef = useRef<THREE.InstancedMesh>(null);
  const dustPointsRef = useRef<THREE.Points>(null);
  const beaconRingRefs = useRef<Array<THREE.Mesh | null>>([]);
  const camInitRef = useRef(false);

  const surfaceTex = useMemo(() => createMarsSurfaceTexture(), []);
  const dustSprite = useMemo(() => createDustSprite(), []);

  // Build vertex-displaced Martian terrain geometry with natural altitude coloring
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(180, 180, 96, 96);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const cLow = new THREE.Color('#6b2d16');
    const cMid = new THREE.Color('#a64d27');
    const cHigh = new THREE.Color('#d27b4b');
    const cTmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getMarsTerrainHeight(x, z);
      pos.setY(i, y);

      const hNorm = THREE.MathUtils.clamp((y + 1.4) / 3.4, 0, 1);
      if (hNorm < 0.45) {
        cTmp.copy(cLow).lerp(cMid, hNorm / 0.45);
      } else {
        cTmp.copy(cMid).lerp(cHigh, (hNorm - 0.45) / 0.55);
      }
      colors[i * 3] = cTmp.r;
      colors[i * 3 + 1] = cTmp.g;
      colors[i * 3 + 2] = cTmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  const rockGeo = useMemo(() => {
    const geo = new THREE.DodecahedronGeometry(0.45, 0);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const sx = 0.8 + Math.abs(Math.sin(i * 2.9)) * 0.48;
      const sy = 0.52 + Math.abs(Math.cos(i * 3.3)) * 0.36;
      arr[i * 3] *= sx;
      arr[i * 3 + 1] *= sy;
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const scatterRockMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6b331b',
        roughness: 0.92,
        metalness: 0.06,
        flatShading: true,
      }),
    []
  );

  const dustGeo = useMemo(() => {
    const positions = new Float32Array(WHEEL_DUST_COUNT * 3);
    for (let i = 0; i < WHEEL_DUST_COUNT; i++) {
      positions[i * 3 + 1] = -20;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const dustMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: dustSprite,
        size: 0.95,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    [dustSprite]
  );

  useLayoutEffect(() => {
    if (!scatterRockRef.current) return;
    let placed = 0;
    for (let i = 0; i < SCATTER_ROCK_COUNT * 2 && placed < SCATTER_ROCK_COUNT; i++) {
      const ang = (i * 2.39996) % (Math.PI * 2);
      const dist = 4.2 + ((i * 19) % 100) * 0.56;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      // Keep starting pad & rover rollout area unobstructed
      if (Math.hypot(x, z) < 3.6 || Math.hypot(x - MARS_LANDER_POS[0], z - MARS_LANDER_POS[1]) < 3.8) {
        continue;
      }
      const scale = 0.22 + ((i * 37) % 100) / 145;
      const y = getMarsTerrainHeight(x, z) + scale * 0.14;
      _dummy.position.set(x, y, z);
      _dummy.rotation.set(i * 0.5, i * 1.3, i * 0.25);
      _dummy.scale.set(scale * 1.25, scale * 0.72, scale);
      _dummy.updateMatrix();
      scatterRockRef.current.setMatrixAt(placed, _dummy.matrix);
      placed++;
    }
    scatterRockRef.current.count = placed;
    scatterRockRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  // Keyboard WASD / Arrow drive support + Spacebar emergency stop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const code = e.code;
      if (
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space'
      ) {
        e.preventDefault();
      }
      if (code === 'KeyW' || code === 'ArrowUp') driveInputRef.current.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') driveInputRef.current.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') driveInputRef.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') driveInputRef.current.right = true;
      if (code === 'Space') {
        driveInputRef.current.forward = false;
        driveInputRef.current.backward = false;
        driveInputRef.current.left = false;
        driveInputRef.current.right = false;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') driveInputRef.current.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') driveInputRef.current.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') driveInputRef.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') driveInputRef.current.right = false;
    };

    const onBlur = () => {
      driveInputRef.current.forward = false;
      driveInputRef.current.backward = false;
      driveInputRef.current.left = false;
      driveInputRef.current.right = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [driveInputRef]);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const pose = roverPoseRef.current;
    const input = driveInputRef.current;

    if (!camInitRef.current) {
      const startY = getMarsTerrainHeight(pose.x, pose.z);
      camera.position.set(pose.x + 3.8, startY + 2.5, pose.z + 4.4);
      if (controlsRef.current) {
        controlsRef.current.target.set(pose.x, startY + 0.72, pose.z);
        controlsRef.current.update();
      }
      camInitRef.current = true;
    }

    // 1. Rover Velocity & Steering Physics (Manual override cancels auto-navigation)
    const manualActive = input.forward || input.backward || input.left || input.right;
    if (manualActive && autoDriveTargetRef.current) {
      autoDriveTargetRef.current = null;
    }

    const autoTarget = autoDriveTargetRef.current;
    if (autoTarget) {
      const dx = autoTarget.x - pose.x;
      const dz = autoTarget.z - pose.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= autoTarget.stopRadius) {
        pose.speedMS = 0;
        const arrivedFn = autoTarget.onArrived;
        autoDriveTargetRef.current = null;
        arrivedFn();
      } else {
        const desiredYaw = Math.atan2(dx, dz);
        const yawErr = Math.atan2(Math.sin(desiredYaw - pose.yaw), Math.cos(desiredYaw - pose.yaw));
        pose.yaw += THREE.MathUtils.clamp(yawErr * 2.8, -1.5, 1.5) * dt;
        const speedTarget = Math.abs(yawErr) > 0.75 ? 1.15 : 3.2;
        pose.speedMS = THREE.MathUtils.damp(pose.speedMS, speedTarget, 5.2, dt);
      }
    } else {
      const targetVel = input.forward ? 3.2 : input.backward ? -2.0 : 0;
      pose.speedMS = THREE.MathUtils.damp(
        pose.speedMS,
        targetVel,
        input.forward || input.backward ? 4.8 : 7.5,
        dt
      );

      const turnDir = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      if (turnDir !== 0) {
        const reverseInvert = pose.speedMS < -0.15 ? -1 : 1;
        pose.yaw += turnDir * reverseInvert * 1.25 * dt;
      }
    }

    _prevRoverPos.set(pose.x, getMarsTerrainHeight(pose.x, pose.z), pose.z);

    let collided = false;
    if (Math.abs(pose.speedMS) > 0.01) {
      const stepDist = pose.speedMS * dt;
      let nextX = pose.x + Math.sin(pose.yaw) * stepDist;
      let nextZ = pose.z + Math.cos(pose.yaw) * stepDist;

      // Perimeter safety fence
      const rad = Math.hypot(nextX, nextZ);
      if (rad > MAX_DRIVE_RADIUS) {
        const s = MAX_DRIVE_RADIUS / rad;
        nextX *= s;
        nextZ *= s;
        collided = true;
      }

      // Obstacle circle push-out (lander, rock formations, large boulders)
      const roverRadius = 0.92;
      for (let i = 0; i < COLLISION_OBSTACLES.length; i++) {
        const ob = COLLISION_OBSTACLES[i];
        const dx = nextX - ob.x;
        const dz = nextZ - ob.z;
        const dist = Math.hypot(dx, dz);
        const minDist = ob.r + roverRadius;
        if (dist < minDist) {
          const safeDist = Math.max(dist, 0.001);
          nextX = ob.x + (dx / safeDist) * minDist;
          nextZ = ob.z + (dz / safeDist) * minDist;
          collided = true;
        }
      }

      const moved = Math.hypot(nextX - pose.x, nextZ - pose.z);
      pose.x = nextX;
      pose.z = nextZ;
      pose.distanceM += moved;
    }
    pose.collision = collided;

    // 2. Terrain Elevation & Pitch/Roll Alignment
    const groundY = getMarsTerrainHeight(pose.x, pose.z);
    const fx = Math.sin(pose.yaw);
    const fz = Math.cos(pose.yaw);
    const rx = Math.cos(pose.yaw);
    const rz = -Math.sin(pose.yaw);

    const hFront = getMarsTerrainHeight(pose.x + fx * 0.55, pose.z + fz * 0.55);
    const hBack = getMarsTerrainHeight(pose.x - fx * 0.55, pose.z - fz * 0.55);
    const hRight = getMarsTerrainHeight(pose.x + rx * 0.45, pose.z + rz * 0.45);
    const hLeft = getMarsTerrainHeight(pose.x - rx * 0.45, pose.z - rz * 0.45);

    const pitch = Math.atan2(hBack - hFront, 1.1);
    const roll = Math.atan2(hRight - hLeft, 0.9);

    if (roverGroupRef.current) {
      roverGroupRef.current.position.set(pose.x, groundY + 0.02, pose.z);
      roverGroupRef.current.rotation.order = 'YXZ';
      roverGroupRef.current.rotation.y = pose.yaw;
      roverGroupRef.current.rotation.x = THREE.MathUtils.damp(roverGroupRef.current.rotation.x, pitch, 8, dt);
      roverGroupRef.current.rotation.z = THREE.MathUtils.damp(roverGroupRef.current.rotation.z, roll, 8, dt);
    }

    // 3. Synchronize all 6 rover wheels to forward/reverse linear motion
    wheelSpeedRef.current = Math.abs(pose.speedMS) > 0.02 ? pose.speedMS * 3.1 : 0;

    // 4. Wheel Dust Wake Particles when driving on Martian regolith
    if (dustPointsRef.current) {
      const moving = Math.abs(pose.speedMS) > 0.25;
      dustPointsRef.current.visible = moving;
      if (moving) {
        const arr = dustPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < WHEEL_DUST_COUNT; i++) {
          const life = (t * 1.9 + i * 0.14) % 1;
          const side = (i % 2 === 0 ? 1 : -1) * 0.62;
          const back = -0.65 - life * 1.65 * Math.sign(pose.speedMS || 1);
          const px = pose.x + fx * back + rx * side + Math.sin(i * 4.1) * 0.14;
          const pz = pose.z + fz * back + rz * side + Math.cos(i * 3.7) * 0.14;
          const py = getMarsTerrainHeight(px, pz) + 0.12 + life * 0.55;
          arr.setXYZ(i, px, py, pz);
        }
        arr.needsUpdate = true;
      }
    }

    // 5. Target Rock Beacon Pulse & 3D Directional Waypoint Marker
    for (let i = 0; i < beaconRingRefs.current.length; i++) {
      const ring = beaconRingRefs.current[i];
      if (ring) {
        const s = 1 + Math.sin(t * 2.6 + i * 1.2) * 0.08;
        ring.scale.set(s, s, 1);
      }
    }

    if (waypointGuideRef.current) {
      const wx = nextWaypointPos.x - pose.x;
      const wz = nextWaypointPos.z - pose.z;
      const dist = Math.hypot(wx, wz);
      waypointGuideRef.current.visible = dist > 2.2;
      if (dist > 2.2) {
        const dirYaw = Math.atan2(wx, wz);
        const guideX = pose.x + (wx / dist) * 1.62;
        const guideZ = pose.z + (wz / dist) * 1.62;
        const guideY = getMarsTerrainHeight(guideX, guideZ) + 0.14 + Math.sin(t * 3.5) * 0.03;
        waypointGuideRef.current.position.set(guideX, guideY, guideZ);
        waypointGuideRef.current.rotation.set(0, dirYaw, 0);
      }
    }

    // Distinct rock drill laser/sparks vs soil scooping trench cloud
    const sci = scienceAnimRef.current;
    if (drillSparkRef.current) {
      const drilling = sci.activity === 'rockSample' && sci.progress >= 0.22 && sci.progress <= 0.58;
      drillSparkRef.current.visible = drilling;
      if (drilling) {
        const pulse = 0.7 + Math.abs(Math.sin(t * 28)) * 0.85;
        drillSparkRef.current.scale.setScalar(pulse);
      }
    }
    if (soilScoopCloudRef.current) {
      const scooping = sci.activity === 'soilComposition' && sci.progress >= 0.2 && sci.progress <= 0.58;
      soilScoopCloudRef.current.visible = scooping;
      if (scooping) {
        soilScoopCloudRef.current.position.x = Math.sin(t * 4.2) * 0.34;
        soilScoopCloudRef.current.scale.setScalar(0.85 + Math.abs(Math.cos(t * 8)) * 0.45);
      }
    }

    // 6. Camera Follow Delta + External HUD Zoom Support
    if (controlsRef.current) {
      _deltaMove.set(pose.x - _prevRoverPos.x, groundY - _prevRoverPos.y, pose.z - _prevRoverPos.z);
      controlsRef.current.target.add(_deltaMove);
      camera.position.add(_deltaMove);

      if (Math.abs(zoomDeltaRef.current) > 0.001) {
        _camForward.subVectors(camera.position, controlsRef.current.target);
        const curDist = _camForward.length();
        const nextDist = THREE.MathUtils.clamp(curDist + zoomDeltaRef.current, 2.8, 18.0);
        _camForward.normalize().multiplyScalar(nextDist);
        camera.position.copy(controlsRef.current.target).add(_camForward);
        zoomDeltaRef.current = 0;
      }

      controlsRef.current.update();
    }
  });

  const landerGroundY = getMarsTerrainHeight(MARS_LANDER_POS[0], MARS_LANDER_POS[1]);

  return (
    <group>
      {/* DETAILED VERTEX-DISPLACED JEZERO CRATER TERRAIN */}
      <mesh geometry={terrainGeo} receiveShadow>
        <meshStandardMaterial
          map={surfaceTex}
          vertexColors
          roughness={0.94}
          metalness={0.03}
        />
      </mesh>

      {/* DISTANT MARTIAN CRATER RIM MOUNTAINS & MESAS */}
      {Array.from({ length: 24 }, (_, idx) => {
        const ang = (idx / 24) * Math.PI * 2;
        const r = 72 + (idx % 3) * 8;
        const h = 8 + (idx % 4) * 3.8;
        const w = 22 + (idx % 3) * 7;
        return (
          <mesh
            key={`rim-${idx}`}
            position={[Math.cos(ang) * r, h * 0.4 + 0.5, Math.sin(ang) * r]}
            rotation={[0, -ang + idx * 0.2, 0]}
          >
            <coneGeometry args={[w * 0.55, h, 6]} />
            <meshStandardMaterial color={idx % 2 === 0 ? '#7c381c' : '#642c17'} roughness={0.96} flatShading />
          </mesh>
        );
      })}

      {/* ARES-IV LANDING PLATFORM & DEPLOYMENT RAMP AT LANDING ZONE */}
      <group position={[MARS_LANDER_POS[0], landerGroundY, MARS_LANDER_POS[1]]}>
        <mesh position={[0, 0.24, 0]} material={mats.kaptonGold} castShadow receiveShadow>
          <cylinderGeometry args={[1.45, 1.62, 0.36, 24]} />
        </mesh>
        <mesh position={[0, 0.44, 0]} material={mats.titaniumDark} receiveShadow>
          <cylinderGeometry args={[1.48, 1.48, 0.08, 24]} />
        </mesh>
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
        {/* Ramp Hinged Down Toward Starting Rover */}
        <group position={[0, 0.44, 1.38]} rotation={[0.34, 0, 0]}>
          <mesh position={[0, 0, 0.85]} material={mats.brushedAluminum} castShadow receiveShadow>
            <boxGeometry args={[1.38, 0.07, 1.72]} />
          </mesh>
        </group>
      </group>

      {/* TARGET LAYERED ROCK FORMATIONS WITH SURVEY BEACON MARKERS */}
      {TARGET_ROCK_FORMATIONS.map((form, fIdx) => {
        const fy = getMarsTerrainHeight(form.x, form.z);
        return (
          <group key={form.id} position={[form.x, fy, form.z]}>
            {/* Multi-tiered Stratified Basalt Outcrop */}
            <mesh position={[0, 0.45, 0]} rotation={[0.08, fIdx * 0.9, 0]} castShadow receiveShadow>
              <dodecahedronGeometry args={[1.15, 0]} />
              <meshStandardMaterial color="#582817" roughness={0.93} flatShading />
            </mesh>
            <mesh position={[0.72, 0.3, 0.45]} rotation={[0.2, 0.6, 0.1]} castShadow receiveShadow>
              <dodecahedronGeometry args={[0.72, 0]} />
              <meshStandardMaterial color="#71321c" roughness={0.91} flatShading />
            </mesh>
            <mesh position={[-0.68, 0.36, -0.4]} rotation={[-0.1, 1.2, 0.15]} castShadow receiveShadow>
              <dodecahedronGeometry args={[0.8, 0]} />
              <meshStandardMaterial color="#4a2013" roughness={0.94} flatShading />
            </mesh>

            {/* Glowing Holographic Survey Perimeter Ring */}
            <mesh
              ref={(el) => {
                beaconRingRefs.current[fIdx] = el;
              }}
              position={[0, 0.06, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[2.1, 2.32, 36]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.68} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 1.9, 0]} material={mats.cyanEmissive}>
              <octahedronGeometry args={[0.14, 0]} />
            </mesh>
          </group>
        );
      })}

      {/* LARGE COLLISION BOULDERS */}
      {LARGE_BOULDERS.map((b, idx) => {
        const by = getMarsTerrainHeight(b.x, b.z);
        return (
          <mesh
            key={`boulder-${idx}`}
            position={[b.x, by + 0.35 * b.scale, b.z]}
            rotation={[0.2, b.rot, 0.1]}
            scale={[b.scale, b.scale * 0.72, b.scale * 0.9]}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[0.68, 0]} />
            <meshStandardMaterial color="#5c2b19" roughness={0.93} flatShading />
          </mesh>
        );
      })}

      {/* SCATTERED SURFACE COBBLES & ROCKS */}
      <instancedMesh
        ref={scatterRockRef}
        args={[rockGeo, scatterRockMat, SCATTER_ROCK_COUNT]}
        castShadow
        receiveShadow
      />

      {/* JEZERO REGOLITH BASIN SOIL SAMPLE SITE */}
      <group
        position={[
          SOIL_SAMPLE_SITE.x,
          getMarsTerrainHeight(SOIL_SAMPLE_SITE.x, SOIL_SAMPLE_SITE.z),
          SOIL_SAMPLE_SITE.z,
        ]}
      >
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.35, 24]} />
          <meshStandardMaterial color="#873b1d" roughness={0.96} />
        </mesh>
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.45, 1.65, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.72} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.35, 0]} material={mats.amberEmissive}>
          <octahedronGeometry args={[0.12, 0]} />
        </mesh>
      </group>

      {/* REAL-TIME 3D DIRECTIONAL WAYPOINT ARROW POINTING TOWARD NEXT OBJECTIVE */}
      <group ref={waypointGuideRef} visible={false}>
        <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} material={mats.cyanEmissive}>
          <coneGeometry args={[0.13, 0.32, 4]} />
        </mesh>
        <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]} material={mats.cyanEmissive}>
          <cylinderGeometry args={[0.03, 0.03, 0.18, 8]} />
        </mesh>
      </group>

      {/* USER'S ASSEMBLED ARES-IV ROVER ON MARS */}
      <group ref={roverGroupRef} scale={0.72}>
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
          externalArmActiveRef={armActiveRef}
          externalScienceRef={scienceAnimRef}
        />

        {/* Percussive Rock Drill Contact Spark / Laser Point */}
        <mesh ref={drillSparkRef} position={[-0.14, 0.18, 1.58]} visible={false}>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.82} />
        </mesh>

        {/* Lateral Regolith Trenching Dust Puff */}
        <mesh ref={soilScoopCloudRef} position={[0, 0.14, 1.52]} visible={false}>
          <sphereGeometry args={[0.24, 10, 10]} />
          <meshStandardMaterial color="#c26338" transparent opacity={0.55} roughness={0.95} />
        </mesh>
      </group>

      {/* MARTIAN WHEEL DUST WAKE PARTICLES */}
      <points ref={dustPointsRef} geometry={dustGeo} material={dustMat} visible={false} frustumCulled={false} />

      {/* FREE CAMERA ORBIT & ZOOM AROUND ROVER */}
      <OrbitControls
        ref={controlsRef}
        enableDamping={!isSoftwareGl}
        dampingFactor={0.07}
        enablePan={false}
        minDistance={2.8}
        maxDistance={18.0}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI * 0.455}
      />
    </group>
  );
};
