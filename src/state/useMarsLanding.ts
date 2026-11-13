import { useCallback, useEffect, useRef, useState } from 'react';
import { EdlEventItem, EdlStage } from '../types/mission';

export const EDL_DURATION_SEC = 24;

const EDL_EVENT_DEFINITIONS: Array<{ id: string; label: string; thresholdPct: number }> = [
  { id: 'edl-approach', label: 'Mars approach confirmed.', thresholdPct: 2 },
  { id: 'edl-entry', label: 'Atmospheric entry initiated.', thresholdPct: 16 },
  { id: 'edl-parachute', label: 'Supersonic parachute deployed.', thresholdPct: 38 },
  { id: 'edl-touchdown', label: 'Landing successful · Jezero Crater.', thresholdPct: 68 },
  { id: 'edl-deploy', label: 'Rover deployment complete.', thresholdPct: 82 },
];

export interface EdlAnimClock {
  active: boolean;
  startMs: number;
  completed: boolean;
}

export function useMarsLanding() {
  const [edlStage, setEdlStage] = useState<EdlStage>('idle');
  const [edlProgressPct, setEdlProgressPct] = useState<number>(0);
  const [edlAltitudeKm, setEdlAltitudeKm] = useState<number>(125.0);
  const [edlSpeedMS, setEdlSpeedMS] = useState<number>(5400);
  const [heatshieldTempC, setHeatshieldTempC] = useState<number>(180);
  const [parachuteDeployed, setParachuteDeployed] = useState<boolean>(false);
  const [landingStatusText, setLandingStatusText] = useState<string>('MARS APPROACH CONFIRMED');
  const [edlEvents, setEdlEvents] = useState<EdlEventItem[]>(() =>
    EDL_EVENT_DEFINITIONS.map((d) => ({ ...d, status: 'pending' }))
  );

  const rafRef = useRef<number | null>(null);
  const stageRef = useRef<EdlStage>('idle');
  const lastUiSyncRef = useRef<number>(0);

  const edlAnimRef = useRef<EdlAnimClock>({
    active: false,
    startMs: 0,
    completed: false,
  });

  const resetMarsLanding = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stageRef.current = 'idle';
    edlAnimRef.current = { active: false, startMs: 0, completed: false };
    setEdlStage('idle');
    setEdlProgressPct(0);
    setEdlAltitudeKm(125.0);
    setEdlSpeedMS(5400);
    setHeatshieldTempC(180);
    setParachuteDeployed(false);
    setLandingStatusText('MARS APPROACH CONFIRMED');
    setEdlEvents(EDL_EVENT_DEFINITIONS.map((d) => ({ ...d, status: 'pending' })));
  }, []);

  const startMarsLanding = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const startMs = performance.now();
    stageRef.current = 'approach';
    lastUiSyncRef.current = 0;
    edlAnimRef.current = { active: true, startMs, completed: false };

    setEdlStage('approach');
    setEdlProgressPct(0);
    setEdlAltitudeKm(125.0);
    setEdlSpeedMS(5400);
    setHeatshieldTempC(180);
    setParachuteDeployed(false);
    setLandingStatusText('MARS APPROACH CONFIRMED');

    const tick = (now: number) => {
      const elapsedSec = (now - startMs) / 1000;
      const p = Math.min(1, elapsedSec / EDL_DURATION_SEC);
      const pct = p * 100;

      let nextStage: EdlStage;
      if (p < 0.16) nextStage = 'approach';
      else if (p < 0.38) nextStage = 'entry';
      else if (p < 0.56) nextStage = 'parachute';
      else if (p < 0.68) nextStage = 'poweredDescent';
      else if (p < 0.78) nextStage = 'touchdown';
      else if (p < 1) nextStage = 'roverDeploy';
      else nextStage = 'complete';

      if (nextStage !== stageRef.current) {
        stageRef.current = nextStage;
        setEdlStage(nextStage);
      }

      if (p >= 1) {
        edlAnimRef.current.completed = true;
        setEdlStage('complete');
        setEdlProgressPct(100);
        setEdlAltitudeKm(0);
        setEdlSpeedMS(0);
        setHeatshieldTempC(24);
        setParachuteDeployed(true);
        setLandingStatusText('ROVER DEPLOYMENT COMPLETE');
        setEdlEvents(EDL_EVENT_DEFINITIONS.map((d) => ({ ...d, status: 'confirmed' })));
        rafRef.current = null;
        return;
      }

      if (now - lastUiSyncRef.current >= 95) {
        lastUiSyncRef.current = now;

        // Smooth altitude profile: 125km -> 42km -> 11km -> 0km
        let alt = 0;
        let speed = 0;
        let temp = 24;

        if (p < 0.16) {
          const t = p / 0.16;
          alt = 125 - t * 45; // 125 -> 80 km
          speed = 5400;
          temp = 180 + t * 240;
        } else if (p < 0.38) {
          const t = (p - 0.16) / 0.22;
          alt = 80 - t * 68; // 80 -> 12 km
          speed = 5400 - t * 4980; // 5400 -> 420 m/s
          temp = 420 + Math.sin(t * Math.PI) * 1450; // Peak plasma heat ~1870 C
        } else if (p < 0.56) {
          const t = (p - 0.38) / 0.18;
          alt = 12 - t * 10.2; // 12 -> 1.8 km
          speed = 420 - t * 340; // 420 -> 80 m/s
          temp = 580 - t * 440;
        } else if (p < 0.68) {
          const t = (p - 0.56) / 0.12;
          alt = Math.max(0, 1.8 * (1 - t));
          speed = 80 * (1 - t) + 0.8;
          temp = 140 - t * 90;
        } else {
          alt = 0;
          speed = p >= 0.78 && p < 0.96 ? 0.45 : 0;
          temp = 24;
        }

        const statusMap: Record<EdlStage, string> = {
          idle: 'STANDBY',
          approach: 'MARS APPROACH CONFIRMED',
          entry: 'ATMOSPHERIC ENTRY · PEAK HEATING',
          parachute: 'PARACHUTE DEPLOYED · DECELERATING',
          poweredDescent: 'CONTROLLED DESCENT TO SURFACE',
          touchdown: 'LANDING SUCCESSFUL',
          roverDeploy: 'DEPLOYING ROVER ONTO MARS',
          complete: 'ROVER DEPLOYMENT COMPLETE',
        };

        setEdlProgressPct(pct);
        setEdlAltitudeKm(alt);
        setEdlSpeedMS(speed);
        setHeatshieldTempC(temp);
        setParachuteDeployed(p >= 0.38);
        setLandingStatusText(statusMap[nextStage]);

        setEdlEvents(
          EDL_EVENT_DEFINITIONS.map((d, idx) => {
            const nextThresh = EDL_EVENT_DEFINITIONS[idx + 1]?.thresholdPct ?? 100;
            if (pct >= nextThresh) return { ...d, status: 'confirmed' };
            if (pct >= d.thresholdPct) return { ...d, status: 'active' };
            return { ...d, status: 'pending' };
          })
        );
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
    edlStage,
    edlProgressPct,
    edlAltitudeKm,
    edlSpeedMS,
    heatshieldTempC,
    parachuteDeployed,
    landingStatusText,
    edlEvents,
    edlAnimRef,
    startMarsLanding,
    resetMarsLanding,
  };
}
