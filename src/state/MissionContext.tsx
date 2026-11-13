import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  ActivationSequenceStage,
  CameraPresetId,
  CapturedMarsPhoto,
  ComponentId,
  CruiseEventItem,
  CruiseStage,
  EdlEventItem,
  EdlStage,
  ExplorationActivityId,
  ExplorationActivityResult,
  ExplorationObjectiveItem,
  LaunchStage,
  MissionPhaseId,
  Phase2DiagnosticItem,
  RoverConfiguration,
  ScienceAnimState,
  SystemCheckItem,
  TransmissionCategoryItem,
  TransmissionStage,
} from '../types/mission';
import { useRoverAssembly } from './useRoverAssembly';
import { useSystemTesting } from './useSystemTesting';
import { useMachineActivation } from './useMachineActivation';
import { LaunchAnimClock, useRocketLaunch } from './useRocketLaunch';
import { CruiseAnimClock, useDeepSpaceCruise } from './useDeepSpaceCruise';
import { EdlAnimClock, useMarsLanding } from './useMarsLanding';
import {
  AutoDriveTarget,
  DriveControlsState,
  MinimapTelemetry,
  RoverSurfacePose,
  useMarsExploration,
} from './useMarsExploration';
import { useMissionTransmission } from './useMissionTransmission';
import { useMissionAudio } from '../audio/useMissionAudio';
import { AudioPreferences, soundEngine } from '../audio/SoundEngine';

export interface DropFeedback {
  type: 'error' | 'success';
  message: string;
}

interface MissionContextValue {
  activePhase: MissionPhaseId;
  setActivePhase: (phase: MissionPhaseId) => void;
  inspectedFuturePhase: MissionPhaseId | null;
  setInspectedFuturePhase: (phase: MissionPhaseId | null) => void;
  selectedComponentId: ComponentId;
  setSelectedComponentId: (id: ComponentId) => void;
  draggingComponentId: ComponentId | null;
  setDraggingComponentId: (id: ComponentId | null) => void;
  dragPointerNdcRef: React.MutableRefObject<{ x: number; y: number; active: boolean }>;
  dropZoneAligned: boolean;
  setDropZoneAligned: (aligned: boolean) => void;
  dropFeedback: DropFeedback | null;
  triggerDropFeedback: (fb: DropFeedback) => void;
  installedComponents: Record<ComponentId, boolean>;
  installingComponentId: ComponentId | null;
  installProgress: number;
  installedCount: number;
  totalComponents: number;
  allInstalled: boolean;
  installComponent: (id: ComponentId) => void;
  resetMissionAssembly: () => void;
  metrics: ReturnType<typeof useRoverAssembly>['metrics'];
  checks: SystemCheckItem[];
  isTesting: boolean;
  testComplete: boolean;
  runSystemChecks: () => void;
  startMachinePhase2: () => void;
  activationStage: ActivationSequenceStage;
  powerLevelPct: number;
  busVoltage: number;
  lightsOn: boolean;
  computerOnline: boolean;
  mechanicalProgressPct: number;
  mechanicalSubstep: string;
  mechSteps: Array<{ id: string; label: string; status: 'idle' | 'running' | 'passed' }>;
  phase2Diagnostics: Phase2DiagnosticItem[];
  restartActivation: () => void;
  proceedToPhase3Launch: () => void;
  launchStage: LaunchStage;
  missionTimeSec: number;
  altitudeKm: number;
  velocityKmS: number;
  gForce: number;
  downrangeKm: number;
  ascentProgress: number;
  launchAnimRef: React.MutableRefObject<LaunchAnimClock>;
  startLaunchCountdown: () => void;
  resetLaunch: () => void;
  proceedToPhase4Cruise: () => void;
  cruiseStage: CruiseStage;
  cruiseProgressPct: number;
  distanceTravelledMKm: number;
  remainingDistanceMKm: number;
  spacecraftSpeedKmS: number;
  cruiseElapsedHours: number;
  commStatus: string;
  cruiseEvents: CruiseEventItem[];
  cruiseAnimRef: React.MutableRefObject<CruiseAnimClock>;
  startDeepSpaceCruise: () => void;
  resetCruise: () => void;
  proceedToPhase5Landing: () => void;
  edlStage: EdlStage;
  edlProgressPct: number;
  edlAltitudeKm: number;
  edlSpeedMS: number;
  heatshieldTempC: number;
  parachuteDeployed: boolean;
  landingStatusText: string;
  edlEvents: EdlEventItem[];
  edlAnimRef: React.MutableRefObject<EdlAnimClock>;
  startMarsLanding: () => void;
  resetMarsLanding: () => void;
  proceedToPhase6Exploration: () => void;
  explorationStarted: boolean;
  resetExploration: () => void;
  driveInputRef: React.MutableRefObject<DriveControlsState>;
  roverPoseRef: React.MutableRefObject<RoverSurfacePose>;
  wheelSpeedRef: React.MutableRefObject<number>;
  armActiveRef: React.MutableRefObject<boolean>;
  zoomDeltaRef: React.MutableRefObject<number>;
  cameraFlashRef: React.MutableRefObject<number>;
  canvasElementRef: React.MutableRefObject<HTMLCanvasElement | null>;
  autoDriveTargetRef: React.MutableRefObject<AutoDriveTarget | null>;
  scienceAnimRef: React.MutableRefObject<ScienceAnimState>;
  setDriveControl: (key: keyof DriveControlsState, active: boolean) => void;
  stopRover: () => void;
  zoomCamera: (deltaSteps: number) => void;
  triggerActivity: (id: ExplorationActivityId) => void;
  exploreBatteryPct: number;
  exploreSpeedMS: number;
  exploreDistanceM: number;
  exploreMissionTimeSec: number;
  exploreSurfaceTempC: number;
  exploreCommStatus: string;
  exploreRoverHealthPct: number;
  exploreCollisionAlert: boolean;
  targetRockDistanceM: number;
  nearestRockName: string;
  activeScienceScan: ExplorationActivityId | null;
  scienceSubstage: string | null;
  scienceProgressPct: number;
  scienceNotice: string | null;
  completedActivities: ExplorationActivityId[];
  activityResults: Partial<Record<ExplorationActivityId, ExplorationActivityResult>>;
  capturedPhotos: CapturedMarsPhoto[];
  capturedPhotoUrl: boolean;
  minimapTelemetry: MinimapTelemetry;
  explorationObjectives: ExplorationObjectiveItem[];
  explorationComplete: boolean;
  samplesAnalysedCount: number;
  proceedToPhase7Transmission: () => void;
  replayPhase7Transmission: () => void;
  transmissionStage: TransmissionStage;
  transmissionProgressPct: number;
  transmittedMb: number;
  totalPayloadMb: number;
  transmissionStatusMessage: string;
  transmissionCategories: TransmissionCategoryItem[];
  roverConfiguration: RoverConfiguration;
  cameraPreset: CameraPresetId;
  setCameraPreset: (preset: CameraPresetId) => void;
  cameraFocusToken: number;
  focusOnComponent: (id: ComponentId) => void;
  autoRotate: boolean;
  setAutoRotate: (value: boolean) => void;
  audioPrefs: AudioPreferences;
  updateAudioPrefs: (patch: Partial<AudioPreferences>) => void;
  toggleAudioEnabled: () => void;
  toggleMute: () => void;
}

const MissionContext = createContext<MissionContextValue | null>(null);

export const MissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePhase, setActivePhase] = useState<MissionPhaseId>('phase1');
  const [inspectedFuturePhase, setInspectedFuturePhase] = useState<MissionPhaseId | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('overview');
  const [cameraFocusToken, setCameraFocusToken] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [draggingComponentId, setDraggingComponentId] = useState<ComponentId | null>(null);
  const [dropZoneAligned, setDropZoneAligned] = useState<boolean>(false);
  const [dropFeedback, setDropFeedback] = useState<DropFeedback | null>(null);
  const dragPointerNdcRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const feedbackTimerRef = useRef<number | null>(null);

  const testing = useSystemTesting();
  const activation = useMachineActivation();
  const launch = useRocketLaunch();
  const cruise = useDeepSpaceCruise();
  const landing = useMarsLanding();
  const exploration = useMarsExploration(activePhase === 'phase6');
  const transmission = useMissionTransmission();

  const triggerDropFeedback = useCallback((fb: DropFeedback) => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    setDropFeedback(fb);
    feedbackTimerRef.current = window.setTimeout(() => {
      setDropFeedback(null);
      feedbackTimerRef.current = null;
    }, 2600);
  }, []);

  const handleBeforeReset = useCallback(() => {
    soundEngine.stopAllLoops(0.15);
    testing.resetTesting();
    activation.resetActivation();
    launch.resetLaunch();
    cruise.resetCruise();
    landing.resetMarsLanding();
    exploration.resetExploration();
    transmission.resetTransmission();
    setActivePhase('phase1');
    setAutoRotate(false);
    setCameraPreset('overview');
    setDraggingComponentId(null);
    setDropZoneAligned(false);
    setDropFeedback(null);
  }, [testing, activation, launch, cruise, landing, exploration, transmission]);

  const assembly = useRoverAssembly(handleBeforeReset);

  const focusOnComponent = useCallback(
    (id: ComponentId) => {
      assembly.setSelectedComponentId(id);
      setCameraFocusToken((prev) => prev + 1);
    },
    [assembly]
  );

  const startMachinePhase2 = useCallback(() => {
    if (!testing.testComplete) return;
    setActivePhase('phase2');
    setCameraPreset('overview');
    activation.startActivationSequence();
  }, [testing.testComplete, activation]);

  const proceedToPhase3Launch = useCallback(() => {
    if (activation.stage !== 'ready') return;
    setInspectedFuturePhase(null);
    setAutoRotate(false);
    launch.resetLaunch();
    setActivePhase('phase3');
  }, [activation.stage, launch]);

  const proceedToPhase4Cruise = useCallback(() => {
    if (launch.launchStage !== 'orbitSuccess') return;
    setInspectedFuturePhase(null);
    setAutoRotate(false);
    setActivePhase('phase4');
    cruise.startDeepSpaceCruise();
  }, [launch.launchStage, cruise]);

  const proceedToPhase5Landing = useCallback(() => {
    if (cruise.cruiseStage !== 'arrival') return;
    setInspectedFuturePhase(null);
    setAutoRotate(false);
    setActivePhase('phase5');
    landing.startMarsLanding();
  }, [cruise.cruiseStage, landing]);

  const proceedToPhase6Exploration = useCallback(() => {
    if (landing.edlStage !== 'complete') return;
    setInspectedFuturePhase(null);
    setAutoRotate(false);
    exploration.startExploration();
    setActivePhase('phase6');
  }, [landing.edlStage, exploration]);

  const startPhase7Stream = useCallback(() => {
    transmission.startTransmission({
      photosCount: exploration.capturedPhotos.length,
      readingsCount: exploration.completedActivities.length,
      samplesCount: exploration.samplesAnalysedCount,
      roverHealthPct: exploration.roverHealthPct,
    });
  }, [
    transmission,
    exploration.capturedPhotos.length,
    exploration.completedActivities.length,
    exploration.samplesAnalysedCount,
    exploration.roverHealthPct,
  ]);

  const proceedToPhase7Transmission = useCallback(() => {
    if (!exploration.explorationComplete) return;
    setInspectedFuturePhase(null);
    setAutoRotate(false);
    setActivePhase('phase7');
    startPhase7Stream();
  }, [exploration.explorationComplete, startPhase7Stream]);

  const replayPhase7Transmission = useCallback(() => {
    startPhase7Stream();
  }, [startPhase7Stream]);

  const roverConfiguration = useMemo(
    () =>
      assembly.buildRoverConfiguration(
        testing.testComplete,
        testing.verifiedAtIso,
        activation.stage === 'ready'
      ),
    [assembly, testing.testComplete, testing.verifiedAtIso, activation.stage]
  );

  const audio = useMissionAudio({
    activePhase,
    selectedComponentId: assembly.selectedComponentId,
    draggingComponentId,
    dropZoneAligned,
    installingComponentId: assembly.installingComponentId,
    installedCount: assembly.installedCount,
    allInstalled: assembly.allInstalled,
    checks: testing.checks,
    testComplete: testing.testComplete,
    activationStage: activation.stage,
    lightsOn: activation.lightsOn,
    computerOnline: activation.computerOnline,
    mechSteps: activation.mechSteps,
    phase2Diagnostics: activation.diagnostics,
    launchStage: launch.launchStage,
    launchMissionTimeSec: launch.missionTimeSec,
    cruiseStage: cruise.cruiseStage,
    cruiseEvents: cruise.cruiseEvents,
    edlStage: landing.edlStage,
    activeScienceScan: exploration.activeScienceScan,
    completedActivities: exploration.completedActivities,
    scienceAnimRef: exploration.scienceAnimRef,
    roverPoseRef: exploration.roverPoseRef,
    driveInputRef: exploration.driveInputRef,
    transmissionStage: transmission.transmissionStage,
    transmissionCategories: transmission.categories,
  });

  const value: MissionContextValue = {
    activePhase,
    setActivePhase,
    inspectedFuturePhase,
    setInspectedFuturePhase,
    selectedComponentId: assembly.selectedComponentId,
    setSelectedComponentId: assembly.setSelectedComponentId,
    draggingComponentId,
    setDraggingComponentId,
    dragPointerNdcRef,
    dropZoneAligned,
    setDropZoneAligned,
    dropFeedback,
    triggerDropFeedback,
    installedComponents: assembly.installedComponents,
    installingComponentId: assembly.installingComponentId,
    installProgress: assembly.installProgress,
    installedCount: assembly.installedCount,
    totalComponents: assembly.totalComponents,
    allInstalled: assembly.allInstalled,
    installComponent: assembly.installComponent,
    resetMissionAssembly: assembly.resetAssembly,
    metrics: assembly.metrics,
    checks: testing.checks,
    isTesting: testing.isTesting,
    testComplete: testing.testComplete,
    runSystemChecks: testing.runSystemChecks,
    startMachinePhase2,
    activationStage: activation.stage,
    powerLevelPct: activation.powerLevelPct,
    busVoltage: activation.busVoltage,
    lightsOn: activation.lightsOn,
    computerOnline: activation.computerOnline,
    mechanicalProgressPct: activation.mechanicalProgressPct,
    mechanicalSubstep: activation.mechanicalSubstep,
    mechSteps: activation.mechSteps,
    phase2Diagnostics: activation.diagnostics,
    restartActivation: activation.startActivationSequence,
    proceedToPhase3Launch,
    launchStage: launch.launchStage,
    missionTimeSec: launch.missionTimeSec,
    altitudeKm: launch.altitudeKm,
    velocityKmS: launch.velocityKmS,
    gForce: launch.gForce,
    downrangeKm: launch.downrangeKm,
    ascentProgress: launch.ascentProgress,
    launchAnimRef: launch.launchAnimRef,
    startLaunchCountdown: launch.startLaunchCountdown,
    resetLaunch: launch.resetLaunch,
    proceedToPhase4Cruise,
    cruiseStage: cruise.cruiseStage,
    cruiseProgressPct: cruise.cruiseProgressPct,
    distanceTravelledMKm: cruise.distanceTravelledMKm,
    remainingDistanceMKm: cruise.remainingDistanceMKm,
    spacecraftSpeedKmS: cruise.spacecraftSpeedKmS,
    cruiseElapsedHours: cruise.cruiseElapsedHours,
    commStatus: cruise.commStatus,
    cruiseEvents: cruise.cruiseEvents,
    cruiseAnimRef: cruise.cruiseAnimRef,
    startDeepSpaceCruise: cruise.startDeepSpaceCruise,
    resetCruise: cruise.resetCruise,
    proceedToPhase5Landing,
    edlStage: landing.edlStage,
    edlProgressPct: landing.edlProgressPct,
    edlAltitudeKm: landing.edlAltitudeKm,
    edlSpeedMS: landing.edlSpeedMS,
    heatshieldTempC: landing.heatshieldTempC,
    parachuteDeployed: landing.parachuteDeployed,
    landingStatusText: landing.landingStatusText,
    edlEvents: landing.edlEvents,
    edlAnimRef: landing.edlAnimRef,
    startMarsLanding: landing.startMarsLanding,
    resetMarsLanding: landing.resetMarsLanding,
    proceedToPhase6Exploration,
    explorationStarted: exploration.explorationStarted,
    resetExploration: exploration.resetExploration,
    driveInputRef: exploration.driveInputRef,
    roverPoseRef: exploration.roverPoseRef,
    wheelSpeedRef: exploration.wheelSpeedRef,
    armActiveRef: exploration.armActiveRef,
    zoomDeltaRef: exploration.zoomDeltaRef,
    cameraFlashRef: exploration.cameraFlashRef,
    canvasElementRef: exploration.canvasElementRef,
    autoDriveTargetRef: exploration.autoDriveTargetRef,
    scienceAnimRef: exploration.scienceAnimRef,
    setDriveControl: exploration.setDriveControl,
    stopRover: exploration.stopRover,
    zoomCamera: exploration.zoomCamera,
    triggerActivity: exploration.triggerActivity,
    exploreBatteryPct: exploration.batteryPct,
    exploreSpeedMS: exploration.speedMS,
    exploreDistanceM: exploration.distanceTravelledM,
    exploreMissionTimeSec: exploration.missionTimeSec,
    exploreSurfaceTempC: exploration.surfaceTempC,
    exploreCommStatus: exploration.commStatus,
    exploreRoverHealthPct: exploration.roverHealthPct,
    exploreCollisionAlert: exploration.collisionAlert,
    targetRockDistanceM: exploration.targetRockDistanceM,
    nearestRockName: exploration.nearestRockName,
    activeScienceScan: exploration.activeScienceScan,
    scienceSubstage: exploration.scienceSubstage,
    scienceProgressPct: exploration.scienceProgressPct,
    scienceNotice: exploration.scienceNotice,
    completedActivities: exploration.completedActivities,
    activityResults: exploration.activityResults,
    capturedPhotos: exploration.capturedPhotos,
    capturedPhotoUrl: exploration.capturedPhotoUrl,
    minimapTelemetry: exploration.minimapTelemetry,
    explorationObjectives: exploration.objectives,
    explorationComplete: exploration.explorationComplete,
    samplesAnalysedCount: exploration.samplesAnalysedCount,
    proceedToPhase7Transmission,
    replayPhase7Transmission,
    transmissionStage: transmission.transmissionStage,
    transmissionProgressPct: transmission.transmissionProgressPct,
    transmittedMb: transmission.transmittedMb,
    totalPayloadMb: transmission.totalPayloadMb,
    transmissionStatusMessage: transmission.statusMessage,
    transmissionCategories: transmission.categories,
    roverConfiguration,
    cameraPreset,
    setCameraPreset,
    cameraFocusToken,
    focusOnComponent,
    autoRotate,
    setAutoRotate,
    audioPrefs: audio.audioPrefs,
    updateAudioPrefs: audio.updateAudioPrefs,
    toggleAudioEnabled: audio.toggleAudioEnabled,
    toggleMute: audio.toggleMute,
  };

  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>;
};

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) {
    throw new Error('useMission must be used within a MissionProvider');
  }
  return ctx;
}
