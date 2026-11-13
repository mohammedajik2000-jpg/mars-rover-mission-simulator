import { useCallback, useEffect, useRef, useState } from 'react';
import { CruiseEventItem, CruiseStage } from '../types/mission';

export const CRUISE_DURATION_SEC = 22;
export const TOTAL_TRANSFER_DISTANCE_MKM = 480.0;
const TOTAL_TRANSIT_HOURS = 214 * 24 + 14; // 214 days 14 hours

const CRUISE_EVENT_DEFINITIONS: Array<{ id: string; label: string; thresholdPct: number }> = [
  { id: 'evt-departure', label: 'Earth departure confirmed.', thresholdPct: 2 },
  { id: 'evt-systems', label: 'Spacecraft systems operational.', thresholdPct: 22 },
  { id: 'evt-trajectory', label: 'Mars transfer trajectory established.', thresholdPct: 45 },
  { id: 'evt-detected', label: 'Mars detected.', thresholdPct: 68 },
  { id: 'evt-approach', label: 'Mars approach initiated.', thresholdPct: 86 },
];

export interface CruiseAnimClock {
  active: boolean;
  startMs: number;
  completed: boolean;
}

export function useDeepSpaceCruise() {
  const [cruiseStage, setCruiseStage] = useState<CruiseStage>('idle');
  const [cruiseProgressPct, setCruiseProgressPct] = useState<number>(0);
  const [distanceTravelledMKm, setDistanceTravelledMKm] = useState<number>(0);
  const [remainingDistanceMKm, setRemainingDistanceMKm] = useState<number>(
    TOTAL_TRANSFER_DISTANCE_MKM
  );
  const [spacecraftSpeedKmS, setSpacecraftSpeedKmS] = useState<number>(39.4);
  const [cruiseElapsedHours, setCruiseElapsedHours] = useState<number>(0);
  const [commStatus, setCommStatus] = useState<string>('DSN Goldstone · Nominal (0.1 s)');
  const [cruiseEvents, setCruiseEvents] = useState<CruiseEventItem[]>(() =>
    CRUISE_EVENT_DEFINITIONS.map((d) => ({ ...d, status: 'pending' }))
  );

  const rafRef = useRef<number | null>(null);
  const stageRef = useRef<CruiseStage>('idle');
  const lastUiSyncRef = useRef<number>(0);

  const cruiseAnimRef = useRef<CruiseAnimClock>({
    active: false,
    startMs: 0,
    completed: false,
  });

  const resetCruise = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stageRef.current = 'idle';
    cruiseAnimRef.current = { active: false, startMs: 0, completed: false };
    setCruiseStage('idle');
    setCruiseProgressPct(0);
    setDistanceTravelledMKm(0);
    setRemainingDistanceMKm(TOTAL_TRANSFER_DISTANCE_MKM);
    setSpacecraftSpeedKmS(39.4);
    setCruiseElapsedHours(0);
    setCommStatus('DSN Goldstone · Nominal (0.1 s)');
    setCruiseEvents(CRUISE_EVENT_DEFINITIONS.map((d) => ({ ...d, status: 'pending' })));
  }, []);

  const startDeepSpaceCruise = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const startMs = performance.now();
    stageRef.current = 'departure';
    lastUiSyncRef.current = 0;
    cruiseAnimRef.current = { active: true, startMs, completed: false };
    setCruiseStage('departure');
    setCruiseProgressPct(0);
    setDistanceTravelledMKm(0);
    setRemainingDistanceMKm(TOTAL_TRANSFER_DISTANCE_MKM);
    setSpacecraftSpeedKmS(39.4);
    setCruiseElapsedHours(0);
    setCommStatus('DSN Goldstone · Locked');

    const tick = (now: number) => {
      const elapsedSec = (now - startMs) / 1000;
      const p = Math.min(1, elapsedSec / CRUISE_DURATION_SEC);
      const pct = p * 100;

      let nextStage: CruiseStage;
      if (p < 0.2) nextStage = 'departure';
      else if (p < 0.45) nextStage = 'transfer';
      else if (p < 0.68) nextStage = 'midcourse';
      else if (p < 0.86) nextStage = 'marsDetected';
      else if (p < 1) nextStage = 'approach';
      else nextStage = 'arrival';

      if (nextStage !== stageRef.current) {
        stageRef.current = nextStage;
        setCruiseStage(nextStage);
      }

      if (p >= 1) {
        cruiseAnimRef.current.completed = true;
        setCruiseStage('arrival');
        setCruiseProgressPct(100);
        setDistanceTravelledMKm(TOTAL_TRANSFER_DISTANCE_MKM);
        setRemainingDistanceMKm(0);
        setSpacecraftSpeedKmS(24.1);
        setCruiseElapsedHours(TOTAL_TRANSIT_HOURS);
        setCommStatus('DSN Canberra · 13.4 min delay · Nominal');
        setCruiseEvents(CRUISE_EVENT_DEFINITIONS.map((d) => ({ ...d, status: 'confirmed' })));
        rafRef.current = null;
        return;
      }

      if (now - lastUiSyncRef.current >= 95) {
        lastUiSyncRef.current = now;
        const dist = TOTAL_TRANSFER_DISTANCE_MKM * p;
        const speed = 39.4 - p * 15.3 + Math.sin(p * Math.PI) * 1.4;
        const hours = Math.round(TOTAL_TRANSIT_HOURS * p);
        const lightDelayMin = (p * 13.4).toFixed(1);
        const station =
          p < 0.34 ? 'DSN Goldstone' : p < 0.68 ? 'DSN Madrid' : 'DSN Canberra';

        setCruiseProgressPct(pct);
        setDistanceTravelledMKm(dist);
        setRemainingDistanceMKm(TOTAL_TRANSFER_DISTANCE_MKM - dist);
        setSpacecraftSpeedKmS(speed);
        setCruiseElapsedHours(hours);
        setCommStatus(`${station} · ${lightDelayMin} min delay`);

        setCruiseEvents(
          CRUISE_EVENT_DEFINITIONS.map((d, idx) => {
            const nextThresh = CRUISE_EVENT_DEFINITIONS[idx + 1]?.thresholdPct ?? 100;
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
    cruiseStage,
    cruiseProgressPct,
    distanceTravelledMKm,
    remainingDistanceMKm,
    spacecraftSpeedKmS,
    cruiseElapsedHours,
    commStatus,
    cruiseEvents,
    cruiseAnimRef,
    startDeepSpaceCruise,
    resetCruise,
  };
}
