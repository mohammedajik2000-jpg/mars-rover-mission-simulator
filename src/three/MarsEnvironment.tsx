import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getRoverMaterials } from './materials';

/**
 * Deterministic Martian terrain elevation outside the central 2.75m engineering pad.
 * Flat (y = -0.04) inside the central pad so the rover chassis & wheels stay flush at y = 0.
 */
export function marsHeightAt(x: number, z: number): number {
  const r = Math.sqrt(x * x + z * z);
  if (r < 2.85) return -0.045;

  const blend = Math.min(1, (r - 2.85) / 5.5);
  const dunes =
    Math.sin(x * 0.19 + z * 0.11) * 0.42 +
    Math.cos(z * 0.23 - x * 0.08) * 0.35 +
    Math.sin(x * 0.55 + z * 0.45) * 0.12;

  // Gentle crater rim rise further out
  const rim = Math.max(0, (r - 16) * 0.16) + Math.sin(Math.atan2(z, x) * 5) * Math.max(0, (r - 18) * 0.08);
  return -0.045 + blend * (dunes + rim * 0.45);
}

function createMartianRegolithTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7c3721';
  ctx.fillRect(0, 0, 512, 512);

  // Wind-rippled Martian sand bands
  for (let y = 0; y < 512; y += 4) {
    const wave = Math.sin(y * 0.09) * 14;
    ctx.fillStyle = y % 8 === 0 ? 'rgba(155, 76, 44, 0.22)' : 'rgba(68, 26, 15, 0.2)';
    ctx.fillRect(0, y + (wave % 4), 512, 3);
  }

  // Mineral grit & basalt speckles
  for (let i = 0; i < 2400; i++) {
    const rx = (Math.sin(i * 91.7) * 0.5 + 0.5) * 512;
    const ry = (Math.cos(i * 37.3) * 0.5 + 0.5) * 512;
    const sz = 1 + (i % 3);
    ctx.fillStyle =
      i % 4 === 0
        ? 'rgba(198, 108, 66, 0.32)'
        : i % 4 === 1
          ? 'rgba(54, 21, 14, 0.35)'
          : 'rgba(130, 62, 36, 0.28)';
    ctx.fillRect(rx, ry, sz, sz);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = 8;
  return tex;
}

export const MarsEnvironment: React.FC<{ lightsOn?: boolean }> = ({ lightsOn = false }) => {
  const mats = useMemo(() => getRoverMaterials(), []);
  const bouldersRef = useRef<THREE.InstancedMesh>(null);
  const dustRef = useRef<THREE.Points>(null);

  // Procedural Martian terrain mesh
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(110, 110, 96, 96);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, marsHeightAt(x, z));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, []);

  const regolithMat = useMemo(() => {
    const map = createMartianRegolithTexture();
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.92,
      metalness: 0.04,
    });
  }, []);

  // Atmospheric Martian Sky Dome Shader
  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uHorizonColor: { value: new THREE.Color('#b85c3a') },
          uMidSkyColor: { value: new THREE.Color('#5a2924') },
          uZenithColor: { value: new THREE.Color('#0c101d') },
        },
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          varying vec3 vWorldPos;
          uniform vec3 uHorizonColor;
          uniform vec3 uMidSkyColor;
          uniform vec3 uZenithColor;
          void main() {
            float h = clamp(normalize(vWorldPos).y, 0.0, 1.0);
            vec3 col = mix(uHorizonColor, uMidSkyColor, smoothstep(0.0, 0.24, h));
            col = mix(col, uZenithColor, smoothstep(0.18, 0.75, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    []
  );

  // Distant Mountain Mesas (ring of 22 sculpted peaks)
  const mountainData = useMemo(() => {
    return Array.from({ length: 22 }, (_, i) => {
      const ang = (i / 22) * Math.PI * 2 + (i % 2) * 0.09;
      const dist = 36 + (i % 4) * 5;
      const height = 6 + (i % 5) * 2.8;
      const radius = 5.5 + (i % 3) * 2.5;
      return {
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        height,
        radius,
        rotY: ang * 1.7,
      };
    });
  }, []);

  const mountainMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x6e3120,
        roughness: 0.95,
        metalness: 0.05,
        flatShading: true,
      }),
    []
  );

  // Instanced Martian Boulders (70 rocks scattered outside the landing pad)
  const boulderCount = 70;
  const boulderGeo = useMemo(() => new THREE.DodecahedronGeometry(0.45, 1), []);
  const boulderMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.88,
        metalness: 0.08,
        flatShading: true,
      }),
    []
  );

  useEffect(() => {
    const mesh = bouldersRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    for (let i = 0; i < boulderCount; i++) {
      const angle = i * 2.39996; // golden angle
      const dist = 4.2 + (i % 19) * 1.15;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = marsHeightAt(x, z);
      const sx = 0.45 + ((i * 7) % 11) * 0.14;
      const sy = 0.35 + ((i * 5) % 9) * 0.11;
      const sz = 0.45 + ((i * 3) % 13) * 0.12;

      dummy.position.set(x, y + sy * 0.22, z);
      dummy.rotation.set((i % 5) * 0.4, angle, (i % 3) * 0.3);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Subtle iron-oxide / basalt color variation
      const shade = i % 3 === 0 ? '#7a3b27' : i % 3 === 1 ? '#542a1e' : '#964b31';
      tint.set(shade);
      mesh.setColorAt(i, tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  // Airborne Martian Dust Particles
  const dustCount = 260;
  const { dustGeo, dustBasePositions } = useMemo(() => {
    const positions = new Float32Array(dustCount * 3);
    const base = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 1.5 + Math.random() * 18;
      const a = Math.random() * Math.PI * 2;
      const x = Math.cos(a) * r;
      const y = 0.15 + Math.random() * 4.8;
      const z = Math.sin(a) * r;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      base[i * 3] = x;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { dustGeo: geo, dustBasePositions: base };
  }, []);

  useFrame((state) => {
    const pts = dustRef.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dustCount; i++) {
      const bx = dustBasePositions[i * 3];
      const by = dustBasePositions[i * 3 + 1];
      const bz = dustBasePositions[i * 3 + 2];
      // Gentle Martian breeze drift along +X/+Z with subtle vertical swirl
      const driftX = ((bx + t * (0.28 + (i % 5) * 0.04) + 18) % 36) - 18;
      const driftY = by + Math.sin(t * 0.7 + i) * 0.14;
      const driftZ = bz + Math.cos(t * 0.4 + i * 0.5) * 0.25;
      posAttr.setXYZ(i, driftX, driftY, driftZ);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* Martian Atmospheric Sky Dome */}
      <mesh material={skyMat}>
        <sphereGeometry args={[72, 32, 24]} />
      </mesh>

      {/* Martian Regolith Terrain */}
      <mesh geometry={terrainGeo} material={regolithMat} receiveShadow />

      {/* Distant Martian Ridge / Mesa Formations */}
      {mountainData.map((m, idx) => (
        <mesh
          key={idx}
          position={[m.x, m.height * 0.35 - 0.5, m.z]}
          rotation={[0, m.rotY, 0]}
          material={mountainMat}
        >
          <coneGeometry args={[m.radius, m.height, 7]} />
        </mesh>
      ))}

      {/* Instanced Basalt & Iron-Oxide Boulders */}
      <instancedMesh
        ref={bouldersRef}
        args={[boulderGeo, boulderMat, boulderCount]}
        castShadow
        receiveShadow
      />

      {/* Central Martian Landing & Engineering Calibration Pad */}
      <mesh position={[0, -0.02, 0]} receiveShadow material={mats.turntableSurface}>
        <cylinderGeometry args={[2.55, 2.75, 0.04, 64]} />
      </mesh>
      <mesh position={[0, -0.015, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.titaniumDark}>
        <torusGeometry args={[2.56, 0.05, 12, 64]} />
      </mesh>
      <mesh
        position={[0, 0.003, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={lightsOn ? mats.amberEmissive : mats.cyanEmissive}
      >
        <ringGeometry args={[2.24, 2.26, 64]} />
      </mesh>

      {/* Airborne Martian Dust Particles */}
      <points ref={dustRef} geometry={dustGeo}>
        <pointsMaterial
          color="#e59a72"
          size={0.055}
          sizeAttenuation
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </points>
    </group>
  );
};
