export type ComponentId =
  | 'wheels'
  | 'solarPanels'
  | 'battery'
  | 'navCameras'
  | 'commAntenna'
  | 'roboticArm'
  | 'scienceInstruments';

export type MissionPhaseId =
  | 'phase1'
  | 'phase2'
  | 'phase3'
  | 'phase4'
  | 'phase5'
  | 'phase6'
  | 'phase7';

export type CameraPresetId = 'overview' | 'front' | 'side' | 'top' | 'aft';

export interface RoverComponentSpec {
  id: ComponentId;
  code: string;
  name: string;
  subsystem: string;
  massKg: number;
  powerDrawW: number;
  powerGenW: number;
  batteryWh: number;
  mountLocation: string;
  description: string;
  specs: Array<{ label: string; value: string }>;
  cameraTarget: [number, number, number];
  cameraPosition: [number, number, number];
  mountHighlightPos: [number, number, number];
}

export interface MissionPhaseInfo {
  id: MissionPhaseId;
  number: number;
  title: string;
  shortTitle: string;
  status: 'active' | 'locked';
  summary: string;
  prerequisites: string;
}

export type SystemCheckStatus = 'idle' | 'running' | 'passed';

export interface SystemCheckItem {
  id: string;
  componentId: ComponentId | 'chassis';
  name: string;
  protocol: string;
  status: SystemCheckStatus;
  progress: number;
  reading: string;
}

export type ActivationSequenceStage =
  | 'idle'
  | 'power'
  | 'mechanical'
  | 'diagnostics'
  | 'ready';

export interface Phase2DiagnosticItem {
  id: string;
  label: string;
  status: SystemCheckStatus;
  progress: number;
  metric: string;
}

export type LaunchStage =
  | 'pad'
  | 'countdown'
  | 'ignition'
  | 'liftoff'
  | 'stageSep'
  | 'fairingSep'
  | 'spacecraftSep'
  | 'orbitSuccess';

export type CruiseStage =
  | 'idle'
  | 'departure'
  | 'transfer'
  | 'midcourse'
  | 'marsDetected'
  | 'approach'
  | 'arrival';

export interface CruiseEventItem {
  id: string;
  label: string;
  thresholdPct: number;
  status: 'pending' | 'active' | 'confirmed';
}

export type EdlStage =
  | 'idle'
  | 'approach'
  | 'entry'
  | 'parachute'
  | 'poweredDescent'
  | 'touchdown'
  | 'roverDeploy'
  | 'complete';

export interface EdlEventItem {
  id: string;
  label: string;
  thresholdPct: number;
  status: 'pending' | 'active' | 'confirmed';
}

export interface RoverConfiguration {
  roverId: string;
  chassisModel: string;
  baseMassKg: number;
  installedComponents: Record<ComponentId, boolean>;
  totalMassKg: number;
  batteryCapacityWh: number;
  powerGenerationW: number;
  powerConsumptionW: number;
  netPowerW: number;
  systemsVerified: boolean;
  verifiedAtIso: string | null;
  activationCompleted: boolean;
}

export type ExplorationActivityId =
  | 'rockSample'
  | 'soilComposition'
  | 'surfaceTemp'
  | 'cameraObs'
  | 'roboticArm'
  | 'commCheck';

export type ExplorationObjectiveId =
  | 'exploreArea'
  | 'reachRock'
  | 'analyseSoil'
  | 'captureImage'
  | 'completeMission';

export interface ExplorationActivityResult {
  id: ExplorationActivityId;
  title: string;
  reading: string;
  detail: string;
  completedAtSec: number;
}

export interface ExplorationObjectiveItem {
  id: ExplorationObjectiveId;
  label: string;
  hint: string;
  completed: boolean;
}

export interface CapturedMarsPhoto {
  id: string;
  dataUrl: string;
  timestampSec: number;
  bearingDeg: number;
  subject: string;
  locationLabel: string;
}

export interface ScienceAnimState {
  activity: ExplorationActivityId | null;
  progress: number; // 0..1 across sequence
  substage: string;
  targetYawOffset: number;
  sampleCollectedVisible: boolean;
  cameraFlashIntensity: number;
}

export type TransmissionStage =
  | 'idle'
  | 'acquiring'
  | 'transmitting'
  | 'verifying'
  | 'complete';

export interface TransmissionCategoryItem {
  id: 'photos' | 'readings' | 'samples' | 'health';
  label: string;
  summary: string;
  sizeMb: number;
  progress: number;
  status: 'pending' | 'sending' | 'verified';
}
