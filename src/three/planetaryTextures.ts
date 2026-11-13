import * as THREE from 'three';

let cachedEarthAlbedo: THREE.CanvasTexture | null = null;
let cachedEarthRoughness: THREE.CanvasTexture | null = null;
let cachedEarthBump: THREE.CanvasTexture | null = null;
let cachedEarthNight: THREE.CanvasTexture | null = null;
let cachedEarthClouds: THREE.CanvasTexture | null = null;
let cachedMarsAlbedo: THREE.CanvasTexture | null = null;
let cachedMarsBump: THREE.CanvasTexture | null = null;
let cachedStarSprite: THREE.CanvasTexture | null = null;
let cachedGalaxySprite: THREE.CanvasTexture | null = null;
let cachedNebulaTex: THREE.CanvasTexture | null = null;

// Fast deterministic 3D lattice value noise for seamless spherical planets
function hash3(ix: number, iy: number, iz: number): number {
  let n = ix * 374761393 + iy * 668265263 + iz * 2147483647;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const fz = smooth(z - iz);

  const c000 = hash3(ix, iy, iz);
  const c100 = hash3(ix + 1, iy, iz);
  const c010 = hash3(ix, iy + 1, iz);
  const c110 = hash3(ix + 1, iy + 1, iz);
  const c001 = hash3(ix, iy, iz + 1);
  const c101 = hash3(ix + 1, iy, iz + 1);
  const c011 = hash3(ix, iy + 1, iz + 1);
  const c111 = hash3(ix + 1, iy + 1, iz + 1);

  const x00 = lerp(c000, c100, fx);
  const x10 = lerp(c010, c110, fx);
  const x01 = lerp(c001, c101, fx);
  const x11 = lerp(c011, c111, fx);

  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
}

function fbm3(x: number, y: number, z: number, octaves = 5): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * freq, y * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.04;
  }
  return sum / norm;
}

function ridgedFbm3(x: number, y: number, z: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = noise3(x * freq, y * freq, z * freq);
    const ridge = 1.0 - Math.abs(n * 2.0 - 1.0);
    sum += amp * ridge * ridge;
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm;
}

export function getStarSpriteTexture(): THREE.CanvasTexture {
  if (cachedStarSprite) return cachedStarSprite;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0.5, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.22, 'rgba(235, 246, 255, 0.85)');
  grad.addColorStop(0.55, 'rgba(186, 230, 253, 0.2)');
  grad.addColorStop(1, 'rgba(186, 230, 253, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedStarSprite = tex;
  return tex;
}

export function getGalaxySpriteTexture(): THREE.CanvasTexture {
  if (cachedGalaxySprite) return cachedGalaxySprite;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  // Soft elliptical galactic core glow
  const core = ctx.createRadialGradient(128, 128, 2, 128, 128, 118);
  core.addColorStop(0, 'rgba(255, 245, 224, 0.85)');
  core.addColorStop(0.14, 'rgba(224, 231, 255, 0.45)');
  core.addColorStop(0.45, 'rgba(129, 140, 248, 0.14)');
  core.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, 256, 256);

  // Faint spiral arms
  for (let arm = 0; arm < 2; arm++) {
    const baseAngle = arm * Math.PI;
    for (let s = 0; s < 55; s++) {
      const t = s / 55;
      const angle = baseAngle + t * 2.9;
      const rad = 10 + t * 92;
      const x = 128 + Math.cos(angle) * rad;
      const y = 128 + Math.sin(angle) * rad * 0.56;
      const size = (1 - t * 0.6) * 14;
      const g = ctx.createRadialGradient(x, y, 0.5, x, y, size);
      g.addColorStop(0, `rgba(186, 230, 253, ${0.14 * (1 - t)})`);
      g.addColorStop(1, 'rgba(186, 230, 253, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedGalaxySprite = tex;
  return tex;
}

function buildEarthMaps(): void {
  if (cachedEarthAlbedo) return;
  const W = 768;
  const H = 384;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = W;
  albedoCanvas.height = H;
  const albedoCtx = albedoCanvas.getContext('2d')!;
  const albedoImg = albedoCtx.createImageData(W, H);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = W;
  roughCanvas.height = H;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughImg = roughCtx.createImageData(W, H);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  const bumpImg = bumpCtx.createImageData(W, H);

  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = W;
  nightCanvas.height = H;
  const nightCtx = nightCanvas.getContext('2d')!;
  const nightImg = nightCtx.createImageData(W, H);

  const aData = albedoImg.data;
  const rData = roughImg.data;
  const bData = bumpImg.data;
  const nData = nightImg.data;

  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    const phi = v * Math.PI; // 0 (north pole) -> PI (south pole)
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const absLat = Math.abs(cosPhi); // 0 equator -> 1 poles

    for (let x = 0; x < W; x++) {
      const u = x / W;
      const theta = u * Math.PI * 2;
      const nx = sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);

      // Domain-warped continental elevation with crisp coastline contrast
      const wx = fbm3(nx * 2.1 + 3.1, ny * 2.1 - 1.4, nz * 2.1 + 0.7, 3) - 0.5;
      const wy = fbm3(nx * 2.1 - 2.3, ny * 2.1 + 4.2, nz * 2.1 - 1.9, 3) - 0.5;
      const elevFbm = fbm3(
        (nx + wx * 0.52) * 2.15 + 1.8,
        (ny + wy * 0.52) * 2.15 + 0.6,
        (nz + wx * 0.42) * 2.15 - 2.1,
        5
      );
      const elevRaw = clamp01(0.5 + (elevFbm - 0.495) * 1.85);
      const ridge = ridgedFbm3(nx * 5.2 + 4.4, ny * 5.2 - 3.1, nz * 5.2 + 1.2, 4);
      const moisture = fbm3(nx * 3.4 - 5.2, ny * 3.4 + 2.8, nz * 3.4 + 6.1, 4);
      const detail = noise3(nx * 18.0, ny * 18.0, nz * 18.0);

      const seaLevel = 0.47;
      const polarLimit = 0.87 - detail * 0.06 + (elevRaw - 0.5) * 0.08;

      const idx = (y * W + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let rough = 215;
      let bump = 128;
      let nr = 0;
      let ng = 0;
      let nb = 0;

      if (absLat > polarLimit) {
        // Polar ice caps
        r = 236 + detail * 18;
        g = 244 + detail * 11;
        b = 252 + detail * 3;
        rough = 148;
        bump = 152 + detail * 35;
      } else if (elevRaw < seaLevel) {
        // Varied deep sapphire to sunlit cerulean/turquoise coastal shelves
        const depth = clamp01((seaLevel - elevRaw) / 0.24);
        const shelf = Math.pow(1 - depth, 2.1);
        const currentShift = (moisture - 0.5) * 16;
        r = lerp(24, 58, shelf) + detail * 8;
        g = lerp(96, 174, shelf) + detail * 12 + currentShift * 0.5;
        b = lerp(186, 226, shelf) + detail * 14 + currentShift * 0.4;
        rough = 156 + detail * 22;
        bump = 116;
      } else {
        // Vibrant green forests, savannas, and golden-brown deserts & mountain ranges
        const alt = clamp01((elevRaw - seaLevel) / 0.36) + ridge * 0.22;
        const desertBelt = Math.exp(-Math.pow((absLat - 0.32) / 0.24, 2));
        const aridity = clamp01(desertBelt * (1.1 - moisture * 1.2) + (0.48 - moisture) * 0.55);

        const forestR = lerp(48, 124, aridity) + detail * 18;
        const forestG = lerp(144, 152, aridity) + detail * 20;
        const forestB = lerp(62, 68, aridity) + detail * 10;

        const desertR = lerp(188, 224, detail);
        const desertG = lerp(152, 186, detail);
        const desertB = lerp(92, 122, detail);

        const desertMix = smooth(clamp01((aridity - 0.28) / 0.4));
        r = lerp(forestR, desertR, desertMix);
        g = lerp(forestG, desertG, desertMix);
        b = lerp(forestB, desertB, desertMix);

        // Mountain ridges & alpine snow caps
        const mtnMix = smooth(clamp01((alt - 0.48) / 0.34));
        r = lerp(r, 138 + detail * 28, mtnMix);
        g = lerp(g, 118 + detail * 26, mtnMix);
        b = lerp(b, 98 + detail * 22, mtnMix);

        if (alt > 0.78) {
          const snow = smooth(clamp01((alt - 0.78) / 0.16));
          r = lerp(r, 240, snow);
          g = lerp(g, 244, snow);
          b = lerp(b, 250, snow);
        }

        rough = 218 + detail * 24;
        bump = Math.min(255, Math.round(132 + alt * 115));

        if (absLat < 0.74 && alt < 0.32) {
          const cityCluster = noise3(nx * 28 + 9.2, ny * 28 - 4.1, nz * 28 + 3.7);
          const cityPin = noise3(nx * 85 - 2.1, ny * 85 + 7.4, nz * 85 - 5.3);
          if (cityCluster > 0.65 && cityPin > 0.64) {
            const intensity = clamp01((cityCluster - 0.65) * 4.5) * clamp01((cityPin - 0.64) * 4.2);
            nr = Math.round(255 * intensity);
            ng = Math.round(196 * intensity);
            nb = Math.round(115 * intensity);
          }
        }
      }

      aData[idx] = Math.min(255, Math.max(0, Math.round(r)));
      aData[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      aData[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      aData[idx + 3] = 255;

      rData[idx] = rough;
      rData[idx + 1] = rough;
      rData[idx + 2] = rough;
      rData[idx + 3] = 255;

      bData[idx] = bump;
      bData[idx + 1] = bump;
      bData[idx + 2] = bump;
      bData[idx + 3] = 255;

      nData[idx] = nr;
      nData[idx + 1] = ng;
      nData[idx + 2] = nb;
      nData[idx + 3] = 255;
    }
  }

  albedoCtx.putImageData(albedoImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);
  nightCtx.putImageData(nightImg, 0, 0);

  cachedEarthAlbedo = new THREE.CanvasTexture(albedoCanvas);
  cachedEarthAlbedo.colorSpace = THREE.SRGBColorSpace;
  cachedEarthAlbedo.anisotropy = 8;

  cachedEarthRoughness = new THREE.CanvasTexture(roughCanvas);
  cachedEarthRoughness.anisotropy = 4;

  cachedEarthBump = new THREE.CanvasTexture(bumpCanvas);
  cachedEarthBump.anisotropy = 4;

  cachedEarthNight = new THREE.CanvasTexture(nightCanvas);
  cachedEarthNight.colorSpace = THREE.SRGBColorSpace;
}

export function getEarthAlbedoTexture(): THREE.CanvasTexture {
  buildEarthMaps();
  return cachedEarthAlbedo!;
}

export function getEarthRoughnessTexture(): THREE.CanvasTexture {
  buildEarthMaps();
  return cachedEarthRoughness!;
}

export function getEarthBumpTexture(): THREE.CanvasTexture {
  buildEarthMaps();
  return cachedEarthBump!;
}

export function getEarthNightTexture(): THREE.CanvasTexture {
  buildEarthMaps();
  return cachedEarthNight!;
}

export function getEarthCloudTexture(): THREE.CanvasTexture {
  if (cachedEarthClouds) return cachedEarthClouds;
  const W = 768;
  const H = 384;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const data = img.data;

  for (let y = 0; y < H; y++) {
    const phi = (y / (H - 1)) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < W; x++) {
      const theta = (x / W) * Math.PI * 2;
      const nx = sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);

      // Swirling mid-latitude cyclone curl + crisp white atmospheric cloud belts
      const swirl = fbm3(nx * 2.6 + 8.1, ny * 2.6 - 3.3, nz * 2.6 + 2.2, 3) - 0.5;
      const cNoise = fbm3(
        (nx + swirl * 0.75) * 3.9,
        ny * 5.8 + swirl * 0.45,
        (nz - swirl * 0.75) * 3.9,
        5
      );
      const fine = noise3(nx * 15, ny * 17, nz * 15);
      const cloud = smooth(clamp01((cNoise * 0.8 + fine * 0.2 - 0.47) / 0.22));

      const idx = (y * W + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(cloud * 238);
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  cachedEarthClouds = tex;
  return tex;
}

function buildMarsMaps(): void {
  if (cachedMarsAlbedo) return;
  const W = 768;
  const H = 384;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = W;
  albedoCanvas.height = H;
  const albedoCtx = albedoCanvas.getContext('2d')!;
  const albedoImg = albedoCtx.createImageData(W, H);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  const bumpImg = bumpCtx.createImageData(W, H);

  const aData = albedoImg.data;
  const bData = bumpImg.data;

  // Pre-seed realistic crater centers on unit sphere for crisp raised rims & bowls
  const craters: Array<{ x: number; y: number; z: number; rad: number }> = [];
  for (let i = 0; i < 160; i++) {
    const u = hash3(i, 13, 7);
    const v = hash3(i, 29, 41);
    const th = u * Math.PI * 2;
    const cz = v * 2 - 1;
    const sr = Math.sqrt(Math.max(0, 1 - cz * cz));
    craters.push({
      x: sr * Math.cos(th),
      y: cz,
      z: sr * Math.sin(th),
      rad: 0.025 + Math.pow(hash3(i, 53, 97), 2.4) * 0.11,
    });
  }

  for (let y = 0; y < H; y++) {
    const phi = (y / (H - 1)) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const absLat = Math.abs(cosPhi);

    for (let x = 0; x < W; x++) {
      const theta = (x / W) * Math.PI * 2;
      const nx = sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);

      const mariaNoise = fbm3(nx * 2.2 + 5.1, ny * 2.2 - 2.7, nz * 2.2 + 1.4, 5);
      const ridges = ridgedFbm3(nx * 6.5 - 1.2, ny * 6.5 + 3.4, nz * 6.5 - 4.1, 4);
      const micro = noise3(nx * 24, ny * 24, nz * 24);

      // Valles Marineris equatorial rift scar (around theta ~ 2.4..3.5, ny ~ -0.08)
      const canyonLatDist = Math.abs(ny + 0.08 + Math.sin(theta * 3.0) * 0.03);
      const canyonLonMask = smooth(1 - clamp01(Math.abs(theta - 2.95) / 0.85));
      const canyonDepth = canyonLonMask * Math.exp(-Math.pow(canyonLatDist / 0.028, 2));

      // Crater bowl & rim contribution
      let craterOffset = 0;
      for (let c = 0; c < craters.length; c++) {
        const cr = craters[c];
        const dx = nx - cr.x;
        const dy = ny - cr.y;
        const dz = nz - cr.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const maxR = cr.rad * 1.35;
        if (distSq < maxR * maxR) {
          const d = Math.sqrt(distSq) / cr.rad;
          if (d < 0.82) {
            craterOffset -= (1 - (d / 0.82) * (d / 0.82)) * 0.24;
          } else {
            const rimT = (d - 0.82) / 0.53;
            craterOffset += Math.sin((1 - rimT) * Math.PI) * 0.13;
          }
        }
      }

      // Color mixing: dusty iron-oxide highlands vs dark basaltic Syrtis regions
      const darkRegion = smooth(clamp01((0.52 - mariaNoise) / 0.22));
      let r = lerp(204, 108, darkRegion) + ridges * 28 + micro * 16 - canyonDepth * 55;
      let g = lerp(104, 50, darkRegion) + ridges * 14 + micro * 10 - canyonDepth * 35;
      let b = lerp(56, 32, darkRegion) + ridges * 8 + micro * 6 - canyonDepth * 20;

      // Bright dusty orange-ochre basins
      const dustMix = smooth(clamp01((mariaNoise - 0.56) / 0.2));
      r = lerp(r, 224 + micro * 14, dustMix * 0.55);
      g = lerp(g, 134 + micro * 12, dustMix * 0.55);
      b = lerp(b, 78 + micro * 8, dustMix * 0.55);

      // Crater shadows & rim highlights
      r += craterOffset * 70;
      g += craterOffset * 42;
      b += craterOffset * 26;

      // Natural irregular polar CO2 ice caps
      const polarThreshold = 0.91 - micro * 0.04 + (mariaNoise - 0.5) * 0.04;
      if (absLat > polarThreshold) {
        const ice = smooth(clamp01((absLat - polarThreshold) / 0.04));
        r = lerp(r, 238, ice);
        g = lerp(g, 226, ice);
        b = lerp(b, 214, ice);
      }

      const heightVal = clamp01(
        0.5 + (mariaNoise - 0.5) * 0.45 + ridges * 0.3 + craterOffset * 0.5 - canyonDepth * 0.45
      );
      const bumpByte = Math.round(heightVal * 255);

      const idx = (y * W + x) * 4;
      aData[idx] = Math.min(255, Math.max(0, Math.round(r)));
      aData[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      aData[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      aData[idx + 3] = 255;

      bData[idx] = bumpByte;
      bData[idx + 1] = bumpByte;
      bData[idx + 2] = bumpByte;
      bData[idx + 3] = 255;
    }
  }

  albedoCtx.putImageData(albedoImg, 0, 0);
  bumpCtx.putImageData(bumpImg, 0, 0);

  cachedMarsAlbedo = new THREE.CanvasTexture(albedoCanvas);
  cachedMarsAlbedo.colorSpace = THREE.SRGBColorSpace;
  cachedMarsAlbedo.anisotropy = 8;

  cachedMarsBump = new THREE.CanvasTexture(bumpCanvas);
  cachedMarsBump.anisotropy = 4;
}

export function getMarsAlbedoTexture(): THREE.CanvasTexture {
  buildMarsMaps();
  return cachedMarsAlbedo!;
}

export function getMarsBumpTexture(): THREE.CanvasTexture {
  buildMarsMaps();
  return cachedMarsBump!;
}

export function getNebulaBackdropTexture(): THREE.CanvasTexture {
  if (cachedNebulaTex) return cachedNebulaTex;
  const W = 1024;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#02040a';
  ctx.fillRect(0, 0, W, H);

  // Tilted Milky Way galactic dust band
  ctx.save();
  ctx.translate(W * 0.5, H * 0.5);
  ctx.rotate(-0.26);
  const bandGrad = ctx.createLinearGradient(0, -145, 0, 145);
  bandGrad.addColorStop(0, 'rgba(2, 4, 10, 0)');
  bandGrad.addColorStop(0.28, 'rgba(23, 37, 84, 0.18)');
  bandGrad.addColorStop(0.5, 'rgba(56, 86, 148, 0.24)');
  bandGrad.addColorStop(0.72, 'rgba(30, 41, 82, 0.16)');
  bandGrad.addColorStop(1, 'rgba(2, 4, 10, 0)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(-700, -150, 1400, 300);
  ctx.restore();

  // Subtle multi-tone cosmic nebula clouds
  const clouds = [
    { x: 180, y: 205, r: 210, c: 'rgba(30, 58, 138, 0.18)' },
    { x: 430, y: 255, r: 240, c: 'rgba(56, 189, 248, 0.11)' },
    { x: 640, y: 225, r: 220, c: 'rgba(139, 92, 246, 0.09)' },
    { x: 790, y: 240, r: 230, c: 'rgba(154, 52, 18, 0.14)' },
    { x: 910, y: 285, r: 190, c: 'rgba(30, 64, 175, 0.15)' },
  ];
  for (const cl of clouds) {
    const g = ctx.createRadialGradient(cl.x, cl.y, 10, cl.x, cl.y, cl.r);
    g.addColorStop(0, cl.c);
    g.addColorStop(1, 'rgba(2, 4, 10, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dark galactic dust lanes & faint unresolved background pinpoint stars
  for (let i = 0; i < 1400; i++) {
    const sx = ((Math.sin(i * 19.37) * 0.5 + 0.5) * W) % W;
    const sy = (Math.cos(i * 47.13) * 0.5 + 0.5) * H;
    const alpha = 0.12 + (i % 7) * 0.08;
    ctx.fillStyle = `rgba(226, 232, 240, ${alpha.toFixed(2)})`;
    ctx.fillRect(sx, sy, i % 5 === 0 ? 1.5 : 1, i % 5 === 0 ? 1.5 : 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedNebulaTex = tex;
  return tex;
}

export function createAtmosphereGlowMaterial(
  hexColor: string,
  opacityScale = 0.72,
  sunDirection?: THREE.Vector3
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      glowColor: { value: new THREE.Color(hexColor) },
      opacityScale: { value: opacityScale },
      sunDir: {
        value: sunDirection
          ? sunDirection.clone().normalize()
          : new THREE.Vector3(0.75, 0.35, 0.55).normalize(),
      },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldNormal;
      varying vec3 vViewPos;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewPos = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float opacityScale;
      uniform vec3 sunDir;
      varying vec3 vNormal;
      varying vec3 vWorldNormal;
      varying vec3 vViewPos;
      void main() {
        vec3 viewDir = normalize(vViewPos);
        float rim = pow(clamp(0.76 + dot(vNormal, viewDir), 0.0, 1.0), 3.4);
        float sunLit = smoothstep(-0.35, 0.55, dot(normalize(vWorldNormal), sunDir));
        float intensity = rim * opacityScale * (0.18 + 0.82 * sunLit);
        gl_FragColor = vec4(glowColor, intensity);
      }
    `,
  });
}
