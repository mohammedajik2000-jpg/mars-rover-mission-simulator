import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivationSequenceStage,
  ComponentId,
  CruiseEventItem,
  CruiseStage,
  EdlStage,
  ExplorationActivityId,
  LaunchStage,
  MissionPhaseId,
  Phase2DiagnosticItem,
  ScienceAnimState,
  SystemCheckItem,
  TransmissionCategoryItem,
  TransmissionStage,
} from '../types/mission';
import { DriveControlsState, RoverSurfacePose } from '../state/useMarsExploration';
import { AudioPreferences, soundEngine } from './SoundEngine';

interface UseMissionAudioArgs {
  activePhase: MissionPhaseId;
  selectedComponentId: ComponentId;
  draggingComponentId: ComponentId | null;
  dropZoneAligned: boolean;
  installingComponentId: ComponentId | null;
  installedCount: number;
  allInstalled: boolean;
  checks: SystemCheckItem[];
  testComplete: boolean;
  activationStage: ActivationSequenceStage;
  lightsOn: boolean;
  computerOnline: boolean;
  mechSteps: Array<{ id: string; label: string; status: 'idle' | 'running' | 'passed' }>;
  phase2Diagnostics: Phase2DiagnosticItem[];
  launchStage: LaunchStage;
  launchMissionTimeSec: number;
  cruiseStage: CruiseStage;
  cruiseEvents: CruiseEventItem[];
  edlStage: EdlStage;
  activeScienceScan: ExplorationActivityId | null;
  completedActivities: ExplorationActivityId[];
  scienceAnimRef: React.MutableRefObject<ScienceAnimState>;
  roverPoseRef: React.MutableRefObject<RoverSurfacePose>;
  driveInputRef: React.MutableRefObject<DriveControlsState>;
  transmissionStage: TransmissionStage;
  transmissionCategories: TransmissionCategoryItem[];
}

const COUNTDOWN_WORDS: Record<number, string> = {
  10: 'Ten',
  9: 'Nine',
  8: 'Eight',
  7: 'Seven',
  6: 'Six',
  5: 'Five',
  4: 'Four',
  3: 'Three',
  2: 'Two',
  1: 'One',
};

export function useMissionAudio(args: UseMissionAudioArgs) {
  const [audioPrefs, setAudioPrefs] = useState<AudioPreferences>(() => soundEngine.getPrefs());
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const updateAudioPrefs = useCallback((patch: Partial<AudioPreferences>) => {
    soundEngine.unlockFromUserGesture();
    setAudioUnlocked(true);
    setAudioPrefs((prev) => {
      const next = { ...prev, ...patch };
      soundEngine.savePrefs(next);
      return next;
    });
  }, []);

  const toggleAudioEnabled = useCallback(() => {
    soundEngine.unlockFromUserGesture();
    setAudioUnlocked(true);
    setAudioPrefs((prev) => {
      const next = { ...prev, enabled: !prev.enabled, muted: false };
      soundEngine.savePrefs(next);
      if (!next.enabled) {
        soundEngine.stopAllLoops(0.15);
      }
      return next;
    });
  }, []);

  const toggleMute = useCallback(() => {
    soundEngine.unlockFromUserGesture();
    setAudioUnlocked(true);
    setAudioPrefs((prev) => {
      const next = { ...prev, muted: !prev.muted };
      soundEngine.savePrefs(next);
      if (next.muted) {
        soundEngine.stopAllLoops(0.12);
      }
      return next;
    });
  }, []);

  // Unlock browser AudioContext strictly on first user interaction
  useEffect(() => {
    const onInteract = () => {
      if (soundEngine.unlockFromUserGesture()) {
        setAudioUnlocked(true);
      }
    };
    window.addEventListener('pointerdown', onInteract, { passive: true });
    window.addEventListener('keydown', onInteract, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
  }, []);

  // Stop all phase-specific loops cleanly when changing phases or disabling sound
  const prevPhaseRef = useRef<MissionPhaseId>(args.activePhase);
  useEffect(() => {
    if (prevPhaseRef.current !== args.activePhase) {
      prevPhaseRef.current = args.activePhase;
      soundEngine.stopAllLoops(0.25);
    }
  }, [args.activePhase]);

  // Helper to re-sync continuous phase ambience whenever user unlocks/unmutes inside a phase
  useEffect(() => {
    if (!audioUnlocked || !audioPrefs.enabled || audioPrefs.muted) {
      soundEngine.stopAllLoops(0.15);
      return;
    }

    if (args.activePhase === 'phase3') {
      if (args.launchStage === 'pad' || args.launchStage === 'countdown' || args.launchStage === 'ignition') {
        soundEngine.startPadCrowdLoop();
      } else if (
        args.launchStage === 'liftoff' ||
        args.launchStage === 'stageSep' ||
        args.launchStage === 'fairingSep' ||
        args.launchStage === 'spacecraftSep'
      ) {
        soundEngine.startRocketExhaustLoop();
      }
    } else if (args.activePhase === 'phase4') {
      soundEngine.startSpaceAmbienceLoop();
      soundEngine.startSpacecraftHumLoop();
    } else if (args.activePhase === 'phase5') {
      if (args.edlStage === 'entry') soundEngine.startEntryPlasmaLoop();
      if (args.edlStage === 'poweredDescent') soundEngine.startDescentEngineLoop();
    } else if (args.activePhase === 'phase6') {
      soundEngine.startMarsWindAmbience();
    } else if (args.activePhase === 'phase7') {
      soundEngine.startSpaceAmbienceLoop();
      if (args.transmissionStage === 'transmitting' || args.transmissionStage === 'verifying') {
        soundEngine.startTransmissionStreamLoop();
      }
    }
  }, [
    audioUnlocked,
    audioPrefs.enabled,
    audioPrefs.muted,
    args.activePhase,
    args.launchStage,
    args.edlStage,
    args.transmissionStage,
  ]);

  // ---------------- PHASE 1: ROVER ASSEMBLY ----------------
  const prevSelectedRef = useRef(args.selectedComponentId);
  useEffect(() => {
    if (prevSelectedRef.current !== args.selectedComponentId) {
      prevSelectedRef.current = args.selectedComponentId;
      if (args.activePhase === 'phase1') {
        soundEngine.playUiClick();
      }
    }
  }, [args.selectedComponentId, args.activePhase]);

  const prevDragRef = useRef(args.draggingComponentId);
  useEffect(() => {
    if (args.draggingComponentId && prevDragRef.current !== args.draggingComponentId) {
      soundEngine.playDragMove();
    }
    prevDragRef.current = args.draggingComponentId;
  }, [args.draggingComponentId]);

  const prevAlignedRef = useRef(args.dropZoneAligned);
  useEffect(() => {
    if (args.dropZoneAligned && !prevAlignedRef.current && args.draggingComponentId) {
      soundEngine.playUiClick();
    }
    prevAlignedRef.current = args.dropZoneAligned;
  }, [args.dropZoneAligned, args.draggingComponentId]);

  const prevInstallingRef = useRef(args.installingComponentId);
  useEffect(() => {
    if (args.installingComponentId && prevInstallingRef.current !== args.installingComponentId) {
      soundEngine.playInstallSlide();
    }
    prevInstallingRef.current = args.installingComponentId;
  }, [args.installingComponentId]);

  const prevInstalledCountRef = useRef(args.installedCount);
  useEffect(() => {
    if (args.installedCount > prevInstalledCountRef.current) {
      soundEngine.playInstallLock();
    }
    prevInstalledCountRef.current = args.installedCount;
  }, [args.installedCount]);

  const prevAllInstalledRef = useRef(args.allInstalled);
  useEffect(() => {
    if (args.allInstalled && !prevAllInstalledRef.current) {
      soundEngine.playConfirmChord();
    }
    prevAllInstalledRef.current = args.allInstalled;
  }, [args.allInstalled]);

  const prevPassedChecksRef = useRef(0);
  useEffect(() => {
    const passed = args.checks.filter((c) => c.status === 'passed').length;
    if (passed > prevPassedChecksRef.current) {
      soundEngine.playDiagnosticBeep(true);
    }
    prevPassedChecksRef.current = passed;
  }, [args.checks]);

  const prevTestCompleteRef = useRef(args.testComplete);
  useEffect(() => {
    if (args.testComplete && !prevTestCompleteRef.current) {
      soundEngine.playConfirmChord();
    }
    prevTestCompleteRef.current = args.testComplete;
  }, [args.testComplete]);

  // ---------------- PHASE 2: MACHINE ACTIVATION ----------------
  const prevActStageRef = useRef(args.activationStage);
  useEffect(() => {
    if (args.activePhase !== 'phase2') {
      prevActStageRef.current = args.activationStage;
      return;
    }
    if (args.activationStage !== prevActStageRef.current) {
      prevActStageRef.current = args.activationStage;
      if (args.activationStage === 'power') {
        soundEngine.playPowerStartup();
      } else if (args.activationStage === 'ready') {
        soundEngine.playConfirmChord();
      }
    }
  }, [args.activePhase, args.activationStage]);

  const prevLightsRef = useRef(args.lightsOn);
  const prevCompRef = useRef(args.computerOnline);
  useEffect(() => {
    if (args.activePhase === 'phase2') {
      if (args.lightsOn && !prevLightsRef.current) soundEngine.playElectricalRelay();
      if (args.computerOnline && !prevCompRef.current) soundEngine.playElectricalRelay();
    }
    prevLightsRef.current = args.lightsOn;
    prevCompRef.current = args.computerOnline;
  }, [args.activePhase, args.lightsOn, args.computerOnline]);

  const prevRunningMechRef = useRef<string | null>(null);
  useEffect(() => {
    if (args.activePhase !== 'phase2') return;
    const runningId = args.mechSteps.find((m) => m.status === 'running')?.id ?? null;
    if (runningId && runningId !== prevRunningMechRef.current) {
      if (runningId === 'mech-wheels') soundEngine.playMotorWhir(220, 0.65);
      else if (runningId === 'mech-arm') soundEngine.playArmServo(0.65);
      else soundEngine.playAntennaSlew();
    }
    prevRunningMechRef.current = runningId;
  }, [args.activePhase, args.mechSteps]);

  const prevP2DiagRef = useRef(0);
  useEffect(() => {
    const passed = args.phase2Diagnostics.filter((d) => d.status === 'passed').length;
    if (args.activePhase === 'phase2' && passed > prevP2DiagRef.current) {
      soundEngine.playDiagnosticBeep(true);
    }
    prevP2DiagRef.current = passed;
  }, [args.activePhase, args.phase2Diagnostics]);

  // ---------------- PHASE 3: ROCKET LAUNCH ----------------
  const prevLaunchStageRef = useRef(args.launchStage);
  useEffect(() => {
    if (args.activePhase !== 'phase3') {
      prevLaunchStageRef.current = args.launchStage;
      return;
    }

    const stage = args.launchStage;
    if (stage !== prevLaunchStageRef.current) {
      prevLaunchStageRef.current = stage;
      if (stage === 'pad' || stage === 'countdown') {
        soundEngine.startPadCrowdLoop();
      }
      if (stage === 'ignition') {
        soundEngine.playRocketIgnition();
        soundEngine.speakAnnouncement('Main engine ignition');
      } else if (stage === 'liftoff') {
        soundEngine.stopLoop('pad-crowd', 0.9);
        soundEngine.startRocketExhaustLoop();
        soundEngine.setLoopLevel('rocket-exhaust', 1.0);
        soundEngine.speakAnnouncement('Liftoff');
      } else if (stage === 'stageSep') {
        soundEngine.playStageSeparation();
        soundEngine.setLoopLevel('rocket-exhaust', 0.65);
      } else if (stage === 'fairingSep') {
        soundEngine.playStageSeparation();
        soundEngine.setLoopLevel('rocket-exhaust', 0.36);
      } else if (stage === 'spacecraftSep') {
        soundEngine.playStageSeparation();
        soundEngine.setLoopLevel('rocket-exhaust', 0.14);
      } else if (stage === 'orbitSuccess') {
        soundEngine.stopLoop('rocket-exhaust', 0.9);
        soundEngine.playConfirmChord();
        soundEngine.speakAnnouncement('Orbit insertion confirmed');
      }
    }
  }, [args.activePhase, args.launchStage]);

  const lastCdSecRef = useRef<number | null>(null);
  useEffect(() => {
    if (args.activePhase !== 'phase3') {
      lastCdSecRef.current = null;
      return;
    }
    if (args.launchStage === 'countdown' && args.launchMissionTimeSec < 0) {
      const sec = Math.max(1, Math.min(10, Math.ceil(-args.launchMissionTimeSec)));
      if (sec !== lastCdSecRef.current) {
        lastCdSecRef.current = sec;
        soundEngine.playCountdownBeep(sec <= 3);
        if (sec === 6 || sec === 3) {
          soundEngine.playWarningSiren();
        }
        const word = COUNTDOWN_WORDS[sec];
        if (word && sec >= 3) {
          soundEngine.speakAnnouncement(word);
        }
      }
    } else if (args.launchStage === 'pad') {
      lastCdSecRef.current = null;
    }
  }, [args.activePhase, args.launchStage, args.launchMissionTimeSec]);

  // ---------------- PHASE 4: DEEP SPACE CRUISE ----------------
  const prevCruiseStageRef = useRef(args.cruiseStage);
  useEffect(() => {
    if (args.activePhase !== 'phase4') {
      prevCruiseStageRef.current = args.cruiseStage;
      return;
    }
    if (args.cruiseStage !== prevCruiseStageRef.current) {
      prevCruiseStageRef.current = args.cruiseStage;
      if (args.cruiseStage === 'marsDetected' || args.cruiseStage === 'arrival') {
        soundEngine.playCommPing();
        soundEngine.playNotificationChime();
      }
    }
  }, [args.activePhase, args.cruiseStage]);

  const prevCruiseEvtsRef = useRef(0);
  useEffect(() => {
    const count = args.cruiseEvents.filter((e) => e.status !== 'pending').length;
    if (args.activePhase === 'phase4' && count > prevCruiseEvtsRef.current) {
      soundEngine.playControlPanelBeep();
      soundEngine.playNotificationChime();
    }
    prevCruiseEvtsRef.current = count;
  }, [args.activePhase, args.cruiseEvents]);

  // ---------------- PHASE 5: MARS ENTRY & LANDING ----------------
  const prevEdlStageRef = useRef(args.edlStage);
  useEffect(() => {
    if (args.activePhase !== 'phase5') {
      prevEdlStageRef.current = args.edlStage;
      return;
    }
    const stage = args.edlStage;
    if (stage !== prevEdlStageRef.current) {
      prevEdlStageRef.current = stage;
      if (stage === 'entry') {
        soundEngine.startEntryPlasmaLoop();
      } else if (stage === 'parachute') {
        soundEngine.stopLoop('entry-plasma', 0.35);
        soundEngine.playParachuteDeploy();
      } else if (stage === 'poweredDescent') {
        soundEngine.startDescentEngineLoop();
      } else if (stage === 'touchdown') {
        soundEngine.stopLoop('descent-engine', 0.25);
        soundEngine.playMarsTouchdown();
      } else if (stage === 'roverDeploy') {
        soundEngine.playRoverDeploy();
      } else if (stage === 'complete') {
        soundEngine.playConfirmChord();
      }
    }
  }, [args.activePhase, args.edlStage]);

  // ---------------- PHASE 6: MARS EXPLORATION ----------------
  const prevSciScanRef = useRef<ExplorationActivityId | null>(null);
  const shutterFiredRef = useRef(false);
  const samplePodChimeFiredRef = useRef(false);

  useEffect(() => {
    if (args.activePhase !== 'phase6') {
      soundEngine.setRoverDriveAudio(false);
      soundEngine.stopLoop('rock-drill', 0.15);
      soundEngine.stopLoop('soil-scoop', 0.15);
      prevSciScanRef.current = null;
      return;
    }

    const timer = window.setInterval(() => {
      const pose = args.roverPoseRef.current;
      const input = args.driveInputRef.current;
      const speedAbs = Math.abs(pose.speedMS);
      const turning = input.left || input.right;
      const isMoving = speedAbs > 0.14 || (turning && speedAbs > 0.04);
      soundEngine.setRoverDriveAudio(isMoving, Math.min(1, speedAbs / 3.2), turning);

      const sci = args.scienceAnimRef.current;
      const act = sci.activity;
      const p = sci.progress;

      if (act !== prevSciScanRef.current) {
        prevSciScanRef.current = act;
        shutterFiredRef.current = false;
        samplePodChimeFiredRef.current = false;
        soundEngine.stopLoop('rock-drill', 0.12);
        soundEngine.stopLoop('soil-scoop', 0.12);

        if (act === 'surfaceTemp') soundEngine.playSensorBeep();
        else if (act === 'commCheck') {
          soundEngine.playAntennaSlew();
          soundEngine.playCommPing();
        } else if (act === 'cameraObs') soundEngine.playMotorWhir(390, 0.38);
        else if (act === 'roboticArm') soundEngine.playArmServo(0.8);
        else if (act === 'rockSample' || act === 'soilComposition') soundEngine.playArmServo(0.6);
      }

      if (act === 'rockSample') {
        if (p >= 0.22 && p < 0.58) {
          soundEngine.startRockDrillLoop();
        } else {
          soundEngine.stopLoop('rock-drill', 0.15);
          if (p >= 0.58 && !samplePodChimeFiredRef.current) {
            samplePodChimeFiredRef.current = true;
            soundEngine.playInstallLock();
            soundEngine.playArmServo(0.65);
          }
        }
      } else if (act === 'soilComposition') {
        if (p >= 0.2 && p < 0.58) {
          soundEngine.startSoilScoopLoop();
        } else {
          soundEngine.stopLoop('soil-scoop', 0.15);
          if (p >= 0.58 && !samplePodChimeFiredRef.current) {
            samplePodChimeFiredRef.current = true;
            soundEngine.playInstallLock();
            soundEngine.playArmServo(0.65);
          }
        }
      } else if (act === 'cameraObs' && p >= 0.64 && !shutterFiredRef.current) {
        shutterFiredRef.current = true;
        soundEngine.playCameraShutter();
      }
    }, 80);

    return () => {
      window.clearInterval(timer);
      soundEngine.setRoverDriveAudio(false);
      soundEngine.stopLoop('rock-drill', 0.12);
      soundEngine.stopLoop('soil-scoop', 0.12);
    };
  }, [args.activePhase, args.roverPoseRef, args.driveInputRef, args.scienceAnimRef]);

  const prevSciDoneCountRef = useRef(0);
  useEffect(() => {
    if (args.activePhase === 'phase6' && args.completedActivities.length > prevSciDoneCountRef.current) {
      soundEngine.playDiagnosticBeep(true);
    }
    prevSciDoneCountRef.current = args.completedActivities.length;
  }, [args.activePhase, args.completedActivities]);

  // ---------------- PHASE 7: DATA TRANSMISSION ----------------
  const prevTxStageRef = useRef(args.transmissionStage);
  useEffect(() => {
    if (args.activePhase !== 'phase7') {
      prevTxStageRef.current = args.transmissionStage;
      return;
    }
    const stage = args.transmissionStage;
    if (stage !== prevTxStageRef.current) {
      prevTxStageRef.current = stage;
      if (stage === 'acquiring') {
        soundEngine.playAntennaSlew();
        soundEngine.playCommPing();
      } else if (stage === 'transmitting' || stage === 'verifying') {
        soundEngine.startTransmissionStreamLoop();
      } else if (stage === 'complete') {
        soundEngine.stopLoop('tx-stream');
        soundEngine.playMissionSuccessFanfare();
      }
    }
  }, [args.activePhase, args.transmissionStage]);

  const prevTxVerifiedCountRef = useRef(0);
  useEffect(() => {
    const verified = args.transmissionCategories.filter((c) => c.status === 'verified').length;
    if (args.activePhase === 'phase7' && verified > prevTxVerifiedCountRef.current) {
      soundEngine.playDiagnosticBeep(true);
    }
    prevTxVerifiedCountRef.current = verified;
  }, [args.activePhase, args.transmissionCategories]);

  return {
    audioPrefs,
    updateAudioPrefs,
    toggleAudioEnabled,
    toggleMute,
  };
}
