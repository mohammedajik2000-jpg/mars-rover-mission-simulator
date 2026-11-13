import { useCallback, useEffect, useRef, useState } from 'react';
import { SystemCheckItem } from '../types/mission';

const INITIAL_CHECKS: SystemCheckItem[] = [
  {
    id: 'chk-power',
    componentId: 'battery',
    name: 'Power Bus & Battery Core',
    protocol: '28V DC Load Regulation',
    status: 'idle',
    progress: 0,
    reading: 'Pending',
  },
  {
    id: 'chk-solar',
    componentId: 'solarPanels',
    name: 'Solar Array Deployment',
    protocol: 'Triple-Junction IV Curve',
    status: 'idle',
    progress: 0,
    reading: 'Pending',
  },
  {
    id: 'chk-wheels',
    componentId: 'wheels',
    name: 'Rocker-Bogie Mobility',
    protocol: '6-Axis Torque & Steering',
    status: 'idle',
    progress: 0,
    reading: 'Pending',
  },
  {
    id: 'chk-nav',
    componentId: 'navCameras',
    name: 'Stereo Mast & Hazcams',
    protocol: 'Optical Parallax Calibration',
    status: 'idle',
    progress: 0,
    reading: 'Pending',
  },
  {
    id: 'chk-comm',
    componentId: 'commAntenna',
    name: 'X-Band & UHF Transceiver',
    protocol: 'DSN Carrier Lock Test',
    status: 'idle',
    progress: 0,
    reading: 'Pending',
  },
  {
    id: 'chk-arm',
    componentId: 'roboticArm',
    name: '5-DOF Robotic Manipulator',
    protocol: 'Joint Envelope & Drill Spin',
    status: 'idle',
    progress: 0,
    reading: 'Pending',
  },
  {
    id: 'chk-science',
    componentId: 'scienceInstruments',
    name: 'Scientific Payload Suite',
    protocol: 'UV Laser & Radar Sync',
    status: 'idle',
    progress: 0,
    reading: 'Pending',
  },
];

const PASSED_READINGS: Record<string, string> = {
  'chk-power': '28.04 V · 2,400 Wh Nominal',
  'chk-solar': '340.2 W Peak · 0% Fault',
  'chk-wheels': '6/6 Actuators Balanced',
  'chk-nav': 'Stereo Baseline 0.02 mm',
  'chk-comm': 'SNR +18.4 dB · Locked',
  'chk-arm': '5-DOF Range Verified',
  'chk-science': 'Raman & MOXIE Calibrated',
};

export function useSystemTesting() {
  const [checks, setChecks] = useState<SystemCheckItem[]>(INITIAL_CHECKS);
  const [isTesting, setIsTesting] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [verifiedAtIso, setVerifiedAtIso] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);

  const resetTesting = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsTesting(false);
    setTestComplete(false);
    setVerifiedAtIso(null);
    setChecks(INITIAL_CHECKS.map((item) => ({ ...item })));
  }, []);

  const runSystemChecks = useCallback(() => {
    if (isTesting) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    setIsTesting(true);
    setTestComplete(false);
    setVerifiedAtIso(null);

    const start = performance.now();
    const stepDuration = 620;
    const overlapOffset = 340;
    const totalDuration = overlapOffset * (INITIAL_CHECKS.length - 1) + stepDuration;

    const tick = (now: number) => {
      const elapsed = now - start;

      setChecks(
        INITIAL_CHECKS.map((item, idx) => {
          const itemStart = idx * overlapOffset;
          const localElapsed = elapsed - itemStart;
          if (localElapsed <= 0) {
            return { ...item, status: 'idle', progress: 0, reading: 'Queued' };
          }
          if (localElapsed < stepDuration) {
            const pct = Math.min(99, Math.round((localElapsed / stepDuration) * 100));
            return { ...item, status: 'running', progress: pct, reading: 'Diagnostics Active' };
          }
          return {
            ...item,
            status: 'passed',
            progress: 100,
            reading: PASSED_READINGS[item.id] ?? 'Nominal',
          };
        })
      );

      if (elapsed < totalDuration) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsTesting(false);
        setTestComplete(true);
        setVerifiedAtIso(new Date().toISOString());
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [isTesting]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    checks,
    isTesting,
    testComplete,
    verifiedAtIso,
    runSystemChecks,
    resetTesting,
  };
}
