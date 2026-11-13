import * as THREE from 'three';

function createSolarGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#09152b';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle metallic grid cells
  const cols = 8;
  const rows = 16;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      const grad = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
      grad.addColorStop(0, '#0c2147');
      grad.addColorStop(0.5, '#123166');
      grad.addColorStop(1, '#091a38');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);

      // Fine silver collector bus lines
      ctx.strokeStyle = 'rgba(148, 197, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + cellW * 0.5, y + 2);
      ctx.lineTo(x + cellW * 0.5, y + cellH - 2);
      ctx.stroke();
    }
  }

  // Gold busbar borders
  ctx.strokeStyle = '#c89b3c';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 508);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createKaptonFoilTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c58b20';
  ctx.fillRect(0, 0, 256, 256);

  // Crinkled MLI thermal blanket facets
  for (let i = 0; i < 160; i++) {
    const x = (Math.sin(i * 12.9898) * 0.5 + 0.5) * 256;
    const y = (Math.cos(i * 78.233) * 0.5 + 0.5) * 256;
    const w = 14 + (i % 18);
    const h = 10 + ((i * 7) % 16);
    const shade = i % 3 === 0 ? '#eab338' : i % 3 === 1 ? '#a36e12' : '#d69d27';
    ctx.fillStyle = shade;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h * 0.3);
    ctx.lineTo(x + w * 0.6, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createTurntableTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const cx = 512;
  const cy = 512;

  ctx.fillStyle = '#090d14';
  ctx.fillRect(0, 0, 1024, 1024);

  // Radial gradient glow in center
  const rad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 490);
  rad.addColorStop(0, '#141c2b');
  rad.addColorStop(0.65, '#0c111a');
  rad.addColorStop(1, '#07090e');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Concentric calibration rings
  const rings = [140, 240, 340, 440, 485];
  rings.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = idx === 3 ? 'rgba(6, 182, 212, 0.35)' : 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = idx === 3 ? 2 : 1.5;
    ctx.stroke();
  });

  // Degree tick marks around outer ring
  for (let deg = 0; deg < 360; deg += 5) {
    const radAngle = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const isMid = deg % 15 === 0;
    const inner = isMajor ? 416 : isMid ? 426 : 432;
    const outer = 440;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(radAngle) * inner, cy + Math.sin(radAngle) * inner);
    ctx.lineTo(cx + Math.cos(radAngle) * outer, cy + Math.sin(radAngle) * outer);
    ctx.strokeStyle = isMajor ? 'rgba(6, 182, 212, 0.65)' : 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = isMajor ? 2.5 : 1.2;
    ctx.stroke();

    if (isMajor) {
      ctx.save();
      ctx.translate(cx + Math.cos(radAngle) * 392, cy + Math.sin(radAngle) * 392);
      ctx.rotate(radAngle + Math.PI / 2);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.font = '600 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${deg}°`, 0, 0);
      ctx.restore();
    }
  }

  // Orthogonal crosshair lines
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 440, cy);
  ctx.lineTo(cx + 440, cy);
  ctx.moveTo(cx, cy - 440);
  ctx.lineTo(cx, cy + 440);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export interface RoverMaterialLibrary {
  chassisWhite: THREE.MeshStandardMaterial;
  titaniumDark: THREE.MeshStandardMaterial;
  brushedAluminum: THREE.MeshPhysicalMaterial;
  kaptonGold: THREE.MeshStandardMaterial;
  carbonComposite: THREE.MeshStandardMaterial;
  solarCell: THREE.MeshPhysicalMaterial;
  wheelTread: THREE.MeshStandardMaterial;
  copperAccent: THREE.MeshStandardMaterial;
  opticLens: THREE.MeshPhysicalMaterial;
  cyanEmissive: THREE.MeshStandardMaterial;
  amberEmissive: THREE.MeshStandardMaterial;
  emeraldEmissive: THREE.MeshStandardMaterial;
  previewGhostSolid: THREE.MeshBasicMaterial;
  previewGhostWire: THREE.MeshBasicMaterial;
  turntableSurface: THREE.MeshStandardMaterial;
}

let cachedMaterials: RoverMaterialLibrary | null = null;

export function getRoverMaterials(): RoverMaterialLibrary {
  if (cachedMaterials) return cachedMaterials;

  const solarTex = createSolarGridTexture();
  const kaptonTex = createKaptonFoilTexture();
  const turntableTex = createTurntableTexture();

  cachedMaterials = {
    chassisWhite: new THREE.MeshStandardMaterial({
      color: 0xe6eaf0,
      roughness: 0.42,
      metalness: 0.18,
    }),
    titaniumDark: new THREE.MeshStandardMaterial({
      color: 0x262d38,
      roughness: 0.38,
      metalness: 0.85,
    }),
    brushedAluminum: new THREE.MeshPhysicalMaterial({
      color: 0xb4bec9,
      roughness: 0.24,
      metalness: 0.92,
      clearcoat: 0.2,
    }),
    kaptonGold: new THREE.MeshStandardMaterial({
      map: kaptonTex,
      color: 0xf6c244,
      roughness: 0.3,
      metalness: 0.88,
    }),
    carbonComposite: new THREE.MeshStandardMaterial({
      color: 0x161b22,
      roughness: 0.65,
      metalness: 0.25,
    }),
    solarCell: new THREE.MeshPhysicalMaterial({
      map: solarTex,
      roughness: 0.14,
      metalness: 0.45,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
    }),
    wheelTread: new THREE.MeshStandardMaterial({
      color: 0x1e242d,
      roughness: 0.72,
      metalness: 0.55,
    }),
    copperAccent: new THREE.MeshStandardMaterial({
      color: 0xd97736,
      roughness: 0.28,
      metalness: 0.88,
    }),
    opticLens: new THREE.MeshPhysicalMaterial({
      color: 0x0c3b5e,
      roughness: 0.06,
      metalness: 0.2,
      clearcoat: 1.0,
      ior: 1.7,
    }),
    cyanEmissive: new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.6,
      roughness: 0.3,
      metalness: 0.2,
    }),
    amberEmissive: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
      roughness: 0.3,
      metalness: 0.2,
    }),
    emeraldEmissive: new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.9,
      roughness: 0.25,
      metalness: 0.2,
    }),
    previewGhostSolid: new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
    previewGhostWire: new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    }),
    turntableSurface: new THREE.MeshStandardMaterial({
      map: turntableTex,
      roughness: 0.6,
      metalness: 0.35,
    }),
  };

  return cachedMaterials;
}
