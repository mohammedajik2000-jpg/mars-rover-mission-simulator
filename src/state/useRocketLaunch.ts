import { useCallback, useEffect, useRef, useState } from 'react';
import { LaunchStage } from '../types/mission';

export const LAUNCH_COUNTDOWN_SEC = 10;
export const LAUNCH_ASCENT_DURATION_SEC = 18;

export interface LaunchAnimClock {
  active: boolean;
  startMs: number;
  completed: boolean;
}

export function useRocketLaunch() {
  const [launchStage, setLaunchStage] = useState<LaunchStage>('pad');
  const [missionTimeSec, setMissionTimeSec] = useState<number>(-LAUNCH_COUNTDOWN_SEC);
  const [altitudeKm, setAltitudeKm] = useState<number>(0);
  const [velocityKmS, setVelocityKmS] = useState<number>(0);
  const [gForce, setGForce] = useState<number>(1.0);
  const [downrangeKm, setDownrangeKm] = useState<number>(0);
  const [ascentProgress, setAscentProgress] = useState<number>(0);

  const rafRef = useRef<number | null>(null);
  const stageRef = useRef<LaunchStage>('pad');
  const lastUiSyncRef = useRef<number>(0);

  // Continuous clock read directly by Three.js useFrame for stutter-free 60+ fps animation
  const launchAnimRef = useRef<LaunchAnimClock>({
    active: false,
    startMs: 0,
    completed: false,
  });

  const resetLaunch = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stageRef.current = 'pad';
    launchAnimRef.current = { active: false, startMs: 0, completed: false };
    setLaunchStage('pad');
    setMissionTimeSec(-LAUNCH_COUNTDOWN_SEC);
    setAltitudeKm(0);
    setVelocityKmS(0);
    setGForce(1.0);
    setDownrangeKm(0);
    setAscentProgress(0);
  }, []);

  const startLaunchCountdown = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const startMs = performance.now();
    stageRef.current = 'countdown';
    lastUiSyncRef.current = 0;
    launchAnimRef.current = { active: true, startMs, completed: false };
    setLaunchStage('countdown');

    const tick = (now: number) => {
      const elapsedSec = (now - startMs) / 1000;
      const tMinus = elapsedSec - LAUNCH_COUNTDOWN_SEC;

      let nextStage: LaunchStage;
      let p = 0;
      let alt = 0;
      let vel = 0;
      let downrange = 0;
      let g = 1.0;

      if (tMinus < -2.2) {
        nextStage = 'countdown';
      } else if (tMinus < 0) {
        nextStage = 'ignition';
        g = 1.08;
      } else if (tMinus < LAUNCH_ASCENT_DURATION_SEC) {
        p = tMinus / LAUNCH_ASCENT_DURATION_SEC;
        alt = 225 * Math.pow(p, 1.55);
        vel = 7.82 * Math.pow(p, 0.88);
        downrange = 640 * Math.pow(p, 1.85);
        g =
          p < 0.38
            ? 1.4 + p * 6.5
            : p < 0.44
              ? 1.1
              : 1.5 + (p - 0.44) * 4.2;

        if (p < 0.36) nextStage = 'liftoff';
        else if (p < 0.56) nextStage = 'stageSep';
        else if (p < 0.76) nextStage = 'fairingSep';
        else nextStage = 'spacecraftSep';
      } else {
        stageRef.current = 'orbitSuccess';
        launchAnimRef.current.completed = true;
        setLaunchStage('orbitSuccess');
        setMissionTimeSec(LAUNCH_ASCENT_DURATION_SEC);
        setAscentProgress(1);
        setAltitudeKm(225.0);
        setVelocityKmS(7.82);
        setDownrangeKm(640.0);
        setGForce(0.0);
        rafRef.current = null;
        return;
      }

      if (nextStage !== stageRef.current) {
        stageRef.current = nextStage;
        setLaunchStage(nextStage);
      }

      // Throttle React HUD telemetry state updates to ~10 Hz so 3D canvas stays 100% smooth
      if (now - lastUiSyncRef.current >= 95) {
        lastUiSyncRef.current = now;
        setMissionTimeSec(tMinus);
        setAscentProgress(p);
        setAltitudeKm(alt);
        setVelocityKmS(vel);
        setDownrangeKm(downrange);
        setGForce(g);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    launchStage,
    missionTimeSec,
    altitudeKm,
    velocityKmS,
    gForce,
    downrangeKm,
    ascentProgress,
    launchAnimRef,
    startLaunchCountdown,
    resetLaunch,
  };
}
