import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CapturedMarsPhoto,
  ExplorationActivityId,
  ExplorationActivityResult,
  ExplorationObjectiveItem,
  ScienceAnimState,
} from '../types/mission';

export interface DriveControlsState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export interface RoverSurfacePose {
  x: number;
  z: number;
  yaw: number;
  speedMS: number;
  distanceM: number;
  collision: boolean;
}

export interface AutoDriveTarget {
  x: number;
  z: number;
  stopRadius: number;
  label: string;
  onArrived: () => void;
}

export interface MinimapWaypoint {
  id: string;
  shortCode: string;
  label: string;
  x: number;
  z: number;
  kind: 'lander' | 'rock' | 'soil';
  completed: boolean;
}

export interface MinimapTelemetry {
  roverX: number;
  roverZ: number;
  roverYaw: number;
  headingDeg: number;
  waypoints: MinimapWaypoint[];
  nextWaypoint: {
    id: string;
    shortCode: string;
    label: string;
    x: number;
    z: number;
    distM: number;
    bearingDeg: number;
  };
}

export const MARS_LANDER_POS: [number, number] = [0, -6.2];

export const TARGET_ROCK_FORMATIONS: Array<{
  id: string;
  shortCode: string;
  name: string;
  x: number;
  z: number;
}> = [
  { id: 'jezero-basalt', shortCode: 'R1', name: 'Jezero Layered Basalt Outcrop', x: 9.2, z: -8.6 },
  { id: 'olivine-ridge', shortCode: 'R2', name: 'Olivine Carbonate Ridge', x: -11.4, z: 7.4 },
];

export const SOIL_SAMPLE_SITE = {
  id: 'regolith-trench',
  shortCode: 'S',
  name: 'Jezero Regolith Basin',
  x: -5.8,
  z: -3.2,
};

const ACTIVITY_DEFS: Record<
  ExplorationActivityId,
  { title: string; reading: string; detail: string; durationMs: number; usesArm: boolean }
> = {
  rockSample: {
    title: 'Rock Sample Analysis',
    reading: 'SiO₂ 46.8% · MgO 11.4% · Hematite Veins',
    detail:
      'Percussive core drill extracted 60 mm volcanic olivine-basalt core with aqueous carbonate veining.',
    durationMs: 4200,
    usesArm: true,
  },
  soilComposition: {
    title: 'Soil Composition Analysis',
    reading: 'Fe₂O₃ 18.6% · Sulfates 6.2% · Clay 14.1%',
    detail:
      'Lateral regolith trench scoop confirmed oxidized iron dust, magnesium sulfates, and hydrated clays.',
    durationMs: 4000,
    usesArm: true,
  },
  surfaceTemp: {
    title: 'Surface Temperature Measurement',
    reading: '-58.4 °C Ground · 6.4 mbar CO₂',
    detail:
      'MEDA telescopic thermal probe recorded -58.4 °C regolith skin temp and -64.2 °C ambient air.',
    durationMs: 2100,
    usesArm: false,
  },
  cameraObs: {
    title: 'Camera Observation',
    reading: 'Mastcam-Z Stereo Capture · 18.4 MP',
    detail:
      'Acquired calibrated high-dynamic-range Mastcam photograph and archived frame to telemetry memory.',
    durationMs: 2000,
    usesArm: false,
  },
  roboticArm: {
    title: 'Robotic Arm Interaction',
    reading: '5-DOF Turret Torque Nominal (42 N·m)',
    detail:
      'Articulated shoulder, elbow & rotary abrasion turret calibrated across forward sample workspace.',
    durationMs: 2400,
    usesArm: true,
  },
  commCheck: {
    title: 'Communication Signal Check',
    reading: '-91 dBm · 2.4 Mbps MRO & DSN Lock',
    detail:
      'High-Gain parabolic dish slewed skyward and verified clean Mars Reconnaissance Orbiter & Earth DSN link.',
    durationMs: 2200,
    usesArm: false,
  },
};

function computeNearestRock(x: number, z: number) {
  let bestDist = Infinity;
  let best = TARGET_ROCK_FORMATIONS[0];
  for (const f of TARGET_ROCK_FORMATIONS) {
    const d = Math.hypot(x - f.x, z - f.z);
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return { dist: bestDist, target: best };
}

function yawToCompassDeg(yawRad: number): number {
  // +Z is 180 deg (South), -Z is 0 deg (North), +X is 90 deg (East)
  const raw = (Math.atan2(Math.sin(yawRad), -Math.cos(yawRad)) * 180) / Math.PI;
  return (Math.round(raw) + 360) % 360;
}

function captureMarsFrameDataUrl(
  webglCanvas: HTMLCanvasElement | null,
  bearingDeg: number,
  subject: string,
  solTimeSec: number
): string {
  const w = 480;
  const h = 270;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;

  let drewWebGl = false;
  if (webglCanvas && webglCanvas.width > 0 && webglCanvas.height > 0) {
    try {
      ctx.drawImage(webglCanvas, 0, 0, w, h);
      const px = ctx.getImageData(w >> 1, h >> 1, 1, 1).data;
      if (px[0] + px[1] + px[2] > 0) {
        drewWebGl = true;
      }
    } catch {
      drewWebGl = false;
    }
  }

  if (!drewWebGl) {
    // High-contrast fallback Martian horizon panorama
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.56);
    sky.addColorStop(0, '#4f2414');
    sky.addColorStop(0.55, '#9d4a26');
    sky.addColorStop(1, '#d98451');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.58);

    ctx.fillStyle = '#7b3419';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.54);
    ctx.lineTo(95, h * 0.39);
    ctx.lineTo(185, h * 0.48);
    ctx.lineTo(295, h * 0.35);
    ctx.lineTo(395, h * 0.46);
    ctx.lineTo(w, h * 0.41);
    ctx.lineTo(w, h * 0.6);
    ctx.lineTo(0, h * 0.6);
    ctx.closePath();
    ctx.fill();

    const ground = ctx.createLinearGradient(0, h * 0.54, 0, h);
    ground.addColorStop(0, '#b9592f');
    ground.addColorStop(1, '#612713');
    ctx.fillStyle = ground;
    ctx.fillRect(0, h * 0.54, w, h * 0.46);
  }

  // Mastcam-Z camera reticle & telemetry watermark bar
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.beginPath();
  ctx.moveTo(w / 2 - 14, h / 2);
  ctx.lineTo(w / 2 + 14, h / 2);
  ctx.moveTo(w / 2, h / 2 - 14);
  ctx.lineTo(w / 2, h / 2 + 14);
  ctx.stroke();

  ctx.fillStyle = 'rgba(7, 10, 16, 0.78)';
  ctx.fillRect(10, h - 34, w - 20, 24);
  ctx.fillStyle = '#67e8f9';
  ctx.font = '600 10px monospace';
  ctx.fillText(
    `MASTCAM-Z · BRG ${String(bearingDeg).padStart(3, '0')}° · T+${Math.round(solTimeSec)}s`,
    18,
    h - 18
  );
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'right';
  ctx.fillText(subject.slice(0, 28), w - 18, h - 18);

  return out.toDataURL('image/jpeg', 0.86);
}

function getSubstageLabel(activity: ExplorationActivityId, p: number, targetName: string): string {
  if (activity === 'rockSample') {
    if (p < 0.08) return `Stabilizing suspension at ${targetName}...`;
    if (p < 0.22) return 'Lowering 5-DOF robotic arm toward rock target...';
    if (p < 0.58) return 'Percussive rotary drilling rock core...';
    if (p < 0.84) return 'Collecting core pod & lifting to deck analyzer...';
    return 'Stowing robotic arm & logging PIXL mineral assay...';
  }
  if (activity === 'soilComposition') {
    if (p < 0.08) return `Stabilizing rover over ${targetName}...`;
    if (p < 0.2) return 'Lowering sampling turret into Martian regolith...';
    if (p < 0.58) return 'Scraping & scooping surface soil trench...';
    if (p < 0.84) return 'Transferring soil capsule into onboard lab funnel...';
    return 'Returning robotic arm & processing APXS spectra...';
  }
  if (activity === 'cameraObs') {
    if (p < 0.42) return `Rotating Mastcam-Z toward ${targetName}...`;
    if (p < 0.64) return 'Focusing telephoto optics...';
    if (p < 0.82) return 'Shutter snap & HDR optical flash capture!';
    return 'Archiving Mastcam photograph to telemetry buffer...';
  }
  if (activity === 'surfaceTemp') {
    return p < 0.5
      ? 'Deploying MEDA telescopic thermal sensor mast...'
      : 'Sampling regolith & atmospheric thermal gradient...';
  }
  if (activity === 'commCheck') {
    return p < 0.5
      ? 'Slewing High-Gain Dish toward Earth & MRO orbiter...'
      : 'Transmitting X-band RF ping & verifying carrier lock...';
  }
  return 'Calibrating 5-DOF robotic arm joints & abrasion turret...';
}

export function useMarsExploration(isExplorationActive: boolean) {
  const driveInputRef = useRef<DriveControlsState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const roverPoseRef = useRef<RoverSurfacePose>({
    x: 0,
    z: 0,
    yaw: 0.25,
    speedMS: 0,
    distanceM: 0,
    collision: false,
  });

  const wheelSpeedRef = useRef<number>(0);
  const armActiveRef = useRef<boolean>(false);
  const zoomDeltaRef = useRef<number>(0);
  const cameraFlashRef = useRef<number>(0);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const autoDriveTargetRef = useRef<AutoDriveTarget | null>(null);

  const scienceAnimRef = useRef<ScienceAnimState>({
    activity: null,
    progress: 0,
    substage: '',
    targetYawOffset: 0,
    sampleCollectedVisible: false,
    cameraFlashIntensity: 0,
  });

  const [explorationStarted, setExplorationStarted] = useState(false);
  const [batteryPct, setBatteryPct] = useState(96.4);
  const [speedMS, setSpeedMS] = useState(0);
  const [distanceTravelledM, setDistanceTravelledM] = useState(0);
  const [missionTimeSec, setMissionTimeSec] = useState(0);
  const [surfaceTempC, setSurfaceTempC] = useState(-61.2);
  const [commStatus, setCommStatus] = useState('MRO UHF NOMINAL');
  const [roverHealthPct, setRoverHealthPct] = useState(99.2);
  const [collisionAlert, setCollisionAlert] = useState(false);
  const [targetRockDistanceM, setTargetRockDistanceM] = useState(() => computeNearestRock(0, 0).dist);
  const [nearestRockName, setNearestRockName] = useState(TARGET_ROCK_FORMATIONS[0].name);

  const [activeScienceScan, setActiveScienceScan] = useState<ExplorationActivityId | null>(null);
  const [scienceSubstage, setScienceSubstage] = useState<string | null>(null);
  const [scienceProgressPct, setScienceProgressPct] = useState<number>(0);
  const [scienceNotice, setScienceNotice] = useState<string | null>(null);
  const [completedActivities, setCompletedActivities] = useState<ExplorationActivityId[]>([]);
  const [activityResults, setActivityResults] = useState<
    Partial<Record<ExplorationActivityId, ExplorationActivityResult>>
  >({});

  const [reachedRockFormation, setReachedRockFormation] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedMarsPhoto[]>([]);

  const [minimapTelemetry, setMinimapTelemetry] = useState<MinimapTelemetry>(() => {
    const r0 = TARGET_ROCK_FORMATIONS[0];
    return {
      roverX: 0,
      roverZ: 0,
      roverYaw: 0.25,
      headingDeg: yawToCompassDeg(0.25),
      waypoints: [
        { id: 'lander', shortCode: 'L', label: 'Ares Lander', x: MARS_LANDER_POS[0], z: MARS_LANDER_POS[1], kind: 'lander', completed: true },
        ...TARGET_ROCK_FORMATIONS.map((f) => ({
          id: f.id,
          shortCode: f.shortCode,
          label: f.name,
          x: f.x,
          z: f.z,
          kind: 'rock' as const,
          completed: false,
        })),
        { id: SOIL_SAMPLE_SITE.id, shortCode: SOIL_SAMPLE_SITE.shortCode, label: SOIL_SAMPLE_SITE.name, x: SOIL_SAMPLE_SITE.x, z: SOIL_SAMPLE_SITE.z, kind: 'soil', completed: false },
      ],
      nextWaypoint: {
        id: r0.id,
        shortCode: r0.shortCode,
        label: r0.name,
        x: r0.x,
        z: r0.z,
        distM: Math.hypot(r0.x, r0.z),
        bearingDeg: yawToCompassDeg(Math.atan2(r0.x, r0.z)),
      },
    };
  });

  const scanRafRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const missionSecRef = useRef(0);
  const prevDistRef = useRef(0);

  // Refs synced for 10Hz minimap objective check without recreating interval
  const reachedRockRef = useRef(reachedRockFormation);
  reachedRockRef.current = reachedRockFormation;
  const completedActivitiesRef = useRef(completedActivities);
  completedActivitiesRef.current = completedActivities;

  const showNotice = useCallback((msg: string) => {
    setScienceNotice(msg);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setScienceNotice(null);
      noticeTimerRef.current = null;
    }, 3600);
  }, []);

  // 10 Hz React HUD telemetry + minimap sync while Phase 6 is active
  useEffect(() => {
    if (!isExplorationActive) return;

    const timer = window.setInterval(() => {
      const pose = roverPoseRef.current;
      const distDelta = Math.max(0, pose.distanceM - prevDistRef.current);
      prevDistRef.current = pose.distanceM;

      missionSecRef.current += 0.1;
      setMissionTimeSec(missionSecRef.current);
      setSpeedMS(Math.abs(pose.speedMS));
      setDistanceTravelledM(pose.distanceM);
      setCollisionAlert(pose.collision);

      const rock = computeNearestRock(pose.x, pose.z);
      setTargetRockDistanceM(rock.dist);
      setNearestRockName(rock.target.name);
      if (rock.dist <= 6.2 && !reachedRockRef.current) {
        setReachedRockFormation(true);
      }

      // Compute minimap waypoints & next objective target
      const done = completedActivitiesRef.current;
      const rockDone = done.includes('rockSample');
      const soilDone = done.includes('soilComposition');

      const waypoints: MinimapWaypoint[] = [
        {
          id: 'lander',
          shortCode: 'L',
          label: 'Ares Lander',
          x: MARS_LANDER_POS[0],
          z: MARS_LANDER_POS[1],
          kind: 'lander',
          completed: true,
        },
        ...TARGET_ROCK_FORMATIONS.map((f) => ({
          id: f.id,
          shortCode: f.shortCode,
          label: f.name,
          x: f.x,
          z: f.z,
          kind: 'rock' as const,
          completed: rockDone && Math.hypot(pose.x - f.x, pose.z - f.z) < 8 ? true : rockDone,
        })),
        {
          id: SOIL_SAMPLE_SITE.id,
          shortCode: SOIL_SAMPLE_SITE.shortCode,
          label: SOIL_SAMPLE_SITE.name,
          x: SOIL_SAMPLE_SITE.x,
          z: SOIL_SAMPLE_SITE.z,
          kind: 'soil',
          completed: soilDone,
        },
      ];

      let nextTarget: { id: string; shortCode: string; label: string; x: number; z: number };
      if (!rockDone) {
        nextTarget = {
          id: rock.target.id,
          shortCode: rock.target.shortCode,
          label: rock.target.name,
          x: rock.target.x,
          z: rock.target.z,
        };
      } else if (!soilDone) {
        nextTarget = {
          id: SOIL_SAMPLE_SITE.id,
          shortCode: SOIL_SAMPLE_SITE.shortCode,
          label: SOIL_SAMPLE_SITE.name,
          x: SOIL_SAMPLE_SITE.x,
          z: SOIL_SAMPLE_SITE.z,
        };
      } else {
        nextTarget = {
          id: 'lander',
          shortCode: 'L',
          label: 'Ares Lander Base',
          x: MARS_LANDER_POS[0],
          z: MARS_LANDER_POS[1],
        };
      }

      const dx = nextTarget.x - pose.x;
      const dz = nextTarget.z - pose.z;
      const distM = Math.hypot(dx, dz);
      const bearingDeg = yawToCompassDeg(Math.atan2(dx, dz));

      setMinimapTelemetry({
        roverX: pose.x,
        roverZ: pose.z,
        roverYaw: pose.yaw,
        headingDeg: yawToCompassDeg(pose.yaw),
        waypoints,
        nextWaypoint: {
          ...nextTarget,
          distM,
          bearingDeg,
        },
      });

      setBatteryPct((prev) => {
        const drain = distDelta * 0.14 + (armActiveRef.current ? 0.04 : 0);
        const solarCharge = 0.015;
        return Math.max(24, Math.min(100, prev - drain + solarCharge));
      });

      setSurfaceTempC((prev) => {
        const ripple = Math.sin(missionSecRef.current * 0.25) * 0.06;
        return Number((prev + ripple * 0.1).toFixed(1));
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [isExplorationActive]);

  const setDriveControl = useCallback((key: keyof DriveControlsState, active: boolean) => {
    if (active) {
      autoDriveTargetRef.current = null;
    }
    driveInputRef.current[key] = active;
  }, []);

  const stopRover = useCallback(() => {
    autoDriveTargetRef.current = null;
    driveInputRef.current.forward = false;
    driveInputRef.current.backward = false;
    driveInputRef.current.left = false;
    driveInputRef.current.right = false;
    roverPoseRef.current.speedMS = 0;
    wheelSpeedRef.current = 0;
    setSpeedMS(0);
  }, []);

  const zoomCamera = useCallback((deltaSteps: number) => {
    zoomDeltaRef.current += deltaSteps;
  }, []);

  const runTimedScienceSequence = useCallback(
    (id: ExplorationActivityId, subjectName: string, targetYawOffset = 0) => {
      const def = ACTIVITY_DEFS[id];
      if (def.usesArm) {
        armActiveRef.current = true;
      }
      if (id === 'commCheck') {
        setCommStatus('SLEWING HGA · DSN HANDSHAKE...');
      }

      scienceAnimRef.current = {
        activity: id,
        progress: 0,
        substage: getSubstageLabel(id, 0, subjectName),
        targetYawOffset,
        sampleCollectedVisible: false,
        cameraFlashIntensity: 0,
      };
      setScienceSubstage(scienceAnimRef.current.substage);
      setScienceProgressPct(0);

      if (scanRafRef.current !== null) {
        window.cancelAnimationFrame(scanRafRef.current);
      }

      const startTime = performance.now();
      let photoCaptured = false;

      const step = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / def.durationMs);
        const stageText = getSubstageLabel(id, p, subjectName);

        // Shutter snap & real canvas screenshot capture at p >= 0.64 for cameraObs
        let flash = 0;
        if (id === 'cameraObs' && p >= 0.64) {
          const flashAge = (p - 0.64) / 0.16;
          flash = flashAge < 1 ? Math.sin(flashAge * Math.PI) : 0;
          if (!photoCaptured) {
            photoCaptured = true;
            cameraFlashRef.current = now;
            const pose = roverPoseRef.current;
            const brg = yawToCompassDeg(pose.yaw + targetYawOffset);
            const dataUrl = captureMarsFrameDataUrl(
              canvasElementRef.current,
              brg,
              subjectName,
              missionSecRef.current
            );
            const photo: CapturedMarsPhoto = {
              id: `photo-${Date.now()}`,
              dataUrl,
              timestampSec: Math.round(missionSecRef.current),
              bearingDeg: brg,
              subject: subjectName,
              locationLabel: `X ${pose.x.toFixed(1)}m · Z ${pose.z.toFixed(1)}m`,
            };
            setCapturedPhotos((prev) => [photo, ...prev].slice(0, 8));
          }
        }

        scienceAnimRef.current.progress = p;
        scienceAnimRef.current.substage = stageText;
        scienceAnimRef.current.sampleCollectedVisible =
          (id === 'rockSample' || id === 'soilComposition') && p >= 0.56 && p <= 0.88;
        scienceAnimRef.current.cameraFlashIntensity = flash;

        setScienceSubstage(stageText);
        setScienceProgressPct(Math.round(p * 100));

        if (p < 1) {
          scanRafRef.current = window.requestAnimationFrame(step);
        } else {
          armActiveRef.current = false;
          scienceAnimRef.current = {
            activity: null,
            progress: 0,
            substage: '',
            targetYawOffset: 0,
            sampleCollectedVisible: false,
            cameraFlashIntensity: 0,
          };
          setActiveScienceScan(null);
          setScienceSubstage(null);
          setScienceProgressPct(0);

          if (id === 'surfaceTemp') {
            setSurfaceTempC(-58.4);
          } else if (id === 'commCheck') {
            setCommStatus('X-BAND + MRO 2.4 Mbps LOCK');
          } else if (id === 'rockSample') {
            setReachedRockFormation(true);
          }

          setCompletedActivities((prev) => (prev.includes(id) ? prev : [...prev, id]));
          setActivityResults((prev) => ({
            ...prev,
            [id]: {
              id,
              title: def.title,
              reading: def.reading,
              detail: def.detail,
              completedAtSec: Math.round(missionSecRef.current),
            },
          }));
          setRoverHealthPct((h) => Math.max(96.5, Number((h - 0.1).toFixed(1))));
          showNotice(`${def.title} complete: ${def.reading}`);
          scanRafRef.current = null;
        }
      };

      scanRafRef.current = window.requestAnimationFrame(step);
    },
    [showNotice]
  );

  const triggerActivity = useCallback(
    (id: ExplorationActivityId) => {
      if (activeScienceScan) {
        showNotice(`Completing ${ACTIVITY_DEFS[activeScienceScan].title} — standby...`);
        return;
      }

      const pose = roverPoseRef.current;

      if (id === 'rockSample') {
        const nearest = computeNearestRock(pose.x, pose.z);
        setActiveScienceScan(id);
        if (nearest.dist > 3.5) {
          const dx = pose.x - nearest.target.x;
          const dz = pose.z - nearest.target.z;
          const len = Math.max(0.01, Math.hypot(dx, dz));
          const standX = nearest.target.x + (dx / len) * 2.8;
          const standZ = nearest.target.z + (dz / len) * 2.8;
          setScienceSubstage(`Navigating rover to ${nearest.target.name}...`);
          setScienceProgressPct(8);
          showNotice(`Auto-navigating to ${nearest.target.name} for percussive core drilling...`);
          autoDriveTargetRef.current = {
            x: standX,
            z: standZ,
            stopRadius: 0.45,
            label: nearest.target.name,
            onArrived: () => {
              autoDriveTargetRef.current = null;
              runTimedScienceSequence('rockSample', nearest.target.name);
            },
          };
        } else {
          runTimedScienceSequence('rockSample', nearest.target.name);
        }
        return;
      }

      if (id === 'soilComposition') {
        const distToBasin = Math.hypot(pose.x - SOIL_SAMPLE_SITE.x, pose.z - SOIL_SAMPLE_SITE.z);
        setActiveScienceScan(id);
        if (distToBasin > 2.6) {
          setScienceSubstage(`Navigating rover to ${SOIL_SAMPLE_SITE.name}...`);
          setScienceProgressPct(8);
          showNotice(`Auto-navigating to ${SOIL_SAMPLE_SITE.name} for regolith scoop...`);
          autoDriveTargetRef.current = {
            x: SOIL_SAMPLE_SITE.x,
            z: SOIL_SAMPLE_SITE.z,
            stopRadius: 1.25,
            label: SOIL_SAMPLE_SITE.name,
            onArrived: () => {
              autoDriveTargetRef.current = null;
              runTimedScienceSequence('soilComposition', SOIL_SAMPLE_SITE.name);
            },
          };
        } else {
          runTimedScienceSequence('soilComposition', SOIL_SAMPLE_SITE.name);
        }
        return;
      }

      if (id === 'cameraObs') {
        const nearest = computeNearestRock(pose.x, pose.z);
        const targetAngle = Math.atan2(nearest.target.x - pose.x, nearest.target.z - pose.z);
        const relYaw = Math.atan2(Math.sin(targetAngle - pose.yaw), Math.cos(targetAngle - pose.yaw));
        setActiveScienceScan(id);
        runTimedScienceSequence('cameraObs', nearest.target.name, relYaw);
        return;
      }

      setActiveScienceScan(id);
      runTimedScienceSequence(id, nearestRockName);
    },
    [activeScienceScan, nearestRockName, runTimedScienceSequence, showNotice]
  );

  const startExploration = useCallback(() => {
    setExplorationStarted(true);
  }, []);

  const resetExploration = useCallback(() => {
    if (scanRafRef.current !== null) {
      window.cancelAnimationFrame(scanRafRef.current);
      scanRafRef.current = null;
    }
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    autoDriveTargetRef.current = null;
    driveInputRef.current = { forward: false, backward: false, left: false, right: false };
    roverPoseRef.current = { x: 0, z: 0, yaw: 0.25, speedMS: 0, distanceM: 0, collision: false };
    wheelSpeedRef.current = 0;
    armActiveRef.current = false;
    zoomDeltaRef.current = 0;
    prevDistRef.current = 0;
    missionSecRef.current = 0;
    scienceAnimRef.current = {
      activity: null,
      progress: 0,
      substage: '',
      targetYawOffset: 0,
      sampleCollectedVisible: false,
      cameraFlashIntensity: 0,
    };

    setExplorationStarted(false);
    setBatteryPct(96.4);
    setSpeedMS(0);
    setDistanceTravelledM(0);
    setMissionTimeSec(0);
    setSurfaceTempC(-61.2);
    setCommStatus('MRO UHF NOMINAL');
    setRoverHealthPct(99.2);
    setCollisionAlert(false);
    setTargetRockDistanceM(computeNearestRock(0, 0).dist);
    setActiveScienceScan(null);
    setScienceSubstage(null);
    setScienceProgressPct(0);
    setScienceNotice(null);
    setCompletedActivities([]);
    setActivityResults({});
    setReachedRockFormation(false);
    setCapturedPhotos([]);
  }, []);

  useEffect(() => {
    return () => {
      if (scanRafRef.current !== null) window.cancelAnimationFrame(scanRafRef.current);
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // Derive 5 dynamic Mission Objectives
  const objExploreArea = distanceTravelledM >= 3.5;
  const objReachRock = reachedRockFormation;
  const objAnalyseSoil = completedActivities.includes('soilComposition');
  const objCaptureImage = completedActivities.includes('cameraObs');
  const objCompleteMission =
    objExploreArea &&
    objReachRock &&
    objAnalyseSoil &&
    objCaptureImage &&
    completedActivities.length >= 5;

  const objectives: ExplorationObjectiveItem[] = [
    {
      id: 'exploreArea',
      label: 'Explore the landing area',
      hint: objExploreArea
        ? 'Drive traverse > 3.5 m verified'
        : `Drive rover (${distanceTravelledM.toFixed(1)} / 3.5 m)`,
      completed: objExploreArea,
    },
    {
      id: 'reachRock',
      label: 'Reach a nearby rock formation',
      hint: objReachRock
        ? `${nearestRockName} reached`
        : `${targetRockDistanceM.toFixed(1)} m to beaconed outcrop`,
      completed: objReachRock,
    },
    {
      id: 'analyseSoil',
      label: 'Analyse a soil sample',
      hint: objAnalyseSoil ? 'Regolith chemistry logged' : 'Run Soil Composition Analysis',
      completed: objAnalyseSoil,
    },
    {
      id: 'captureImage',
      label: 'Capture a landscape image',
      hint: objCaptureImage
        ? `${capturedPhotos.length} Mastcam frame${capturedPhotos.length === 1 ? '' : 's'} archived`
        : 'Run Camera Observation',
      completed: objCaptureImage,
    },
    {
      id: 'completeMission',
      label: 'Complete the scientific mission',
      hint: objCompleteMission
        ? 'Ready for Phase 7 Earth Transmission'
        : `${completedActivities.length}/5 science tasks & prior objectives`,
      completed: objCompleteMission,
    },
  ];

  const samplesAnalysedCount =
    (completedActivities.includes('rockSample') ? 1 : 0) +
    (completedActivities.includes('soilComposition') ? 1 : 0);

  return {
    explorationStarted,
    startExploration,
    resetExploration,
    driveInputRef,
    roverPoseRef,
    wheelSpeedRef,
    armActiveRef,
    zoomDeltaRef,
    cameraFlashRef,
    canvasElementRef,
    autoDriveTargetRef,
    scienceAnimRef,
    setDriveControl,
    stopRover,
    zoomCamera,
    triggerActivity,
    batteryPct,
    speedMS,
    distanceTravelledM,
    missionTimeSec,
    surfaceTempC,
    commStatus,
    roverHealthPct,
    collisionAlert,
    targetRockDistanceM,
    nearestRockName,
    activeScienceScan,
    scienceSubstage,
    scienceProgressPct,
    scienceNotice,
    completedActivities,
    activityResults,
    capturedPhotos,
    capturedPhotoUrl: capturedPhotos.length > 0,
    minimapTelemetry,
    objectives,
    explorationComplete: objCompleteMission,
    samplesAnalysedCount,
  };
}
