import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivationSequenceStage, Phase2DiagnosticItem } from '../types/mission';

const INITIAL_PHASE2_DIAGNOSTICS: Phase2DiagnosticItem[] = [
  {
    id: 'p2-battery',
    label: 'Battery System',
    status: 'idle',
    progress: 0,
    metric: 'Standby',
  },
  {
    id: 'p2-wheels',
    label: 'Wheel System',
    status: 'idle',
    progress: 0,
    metric: 'Standby',
  },
  {
    id: 'p2-solar',
    label: 'Solar Power System',
    status: 'idle',
    progress: 0,
    metric: 'Standby',
  },
  {
    id: 'p2-camera',
    label: 'Camera System',
    status: 'idle',
    progress: 0,
    metric: 'Standby',
  },
  {
    id: 'p2-comm',
    label: 'Communication System',
    status: 'idle',
    progress: 0,
    metric: 'Standby',
  },
  {
    id: 'p2-science',
    label: 'Scientific Instruments',
    status: 'idle',
    progress: 0,
    metric: 'Standby',
  },
];

const PASSED_METRICS: Record<string, string> = {
  'p2-battery': '28.0 V · 99.4% Charge',
  'p2-wheels': '6/6 Drive Motors Nominal',
  'p2-solar': '340 W Array Deployed',
  'p2-camera': 'Stereo & Mast Locked',
  'p2-comm': 'DSN X-Band Carrier Ready',
  'p2-science': 'UV Raman & Radar Synced',
};

export function useMachineActivation() {
  const [stage, setStage] = useState<ActivationSequenceStage>('idle');
  const [powerLevelPct, setPowerLevelPct] = useState(0);
  const [busVoltage, setBusVoltage] = useState(0);
  const [lightsOn, setLightsOn] = useState(false);
  const [computerOnline, setComputerOnline] = useState(false);
  const [mechanicalProgressPct, setMechanicalProgressPct] = useState(0);
  const [mechanicalSubstep, setMechanicalSubstep] = useState('Awaiting Activation');
  const [mechSteps, setMechSteps] = useState<Array<{ id: string; label: string; status: 'idle' | 'running' | 'passed' }>>([
    { id: 'mech-wheels', label: 'Six-Wheel Drive Actuators', status: 'idle' },
    { id: 'mech-solar', label: 'Solar Panel Wing Deployment', status: 'idle' },
    { id: 'mech-comm', label: 'High-Gain Antenna Gimbal', status: 'idle' },
    { id: 'mech-arm', label: '5-DOF Robotic Arm', status: 'idle' },
    { id: 'mech-cam', label: 'Navigation Camera Mast', status: 'idle' },
  ]);
  const [diagnostics, setDiagnostics] = useState<Phase2DiagnosticItem[]>(
    INITIAL_PHASE2_DIAGNOSTICS
  );

  const rafRef = useRef<number | null>(null);

  const resetActivation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setStage('idle');
    setPowerLevelPct(0);
    setBusVoltage(0);
    setLightsOn(false);
    setComputerOnline(false);
    setMechanicalProgressPct(0);
    setMechanicalSubstep('Awaiting Activation');
    setMechSteps((prev) => prev.map((s) => ({ ...s, status: 'idle' })));
    setDiagnostics(INITIAL_PHASE2_DIAGNOSTICS.map((d) => ({ ...d })));
  }, []);

  const startActivationSequence = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    setStage('power');
    setPowerLevelPct(0);
    setBusVoltage(0);
    setLightsOn(false);
    setComputerOnline(false);
    setMechanicalProgressPct(0);
    setMechanicalSubstep('Preparing Actuators');
    setMechSteps((prev) => prev.map((s) => ({ ...s, status: 'idle' })));
    setDiagnostics(INITIAL_PHASE2_DIAGNOSTICS.map((d) => ({ ...d })));

    const start = performance.now();

    const POWER_END = 2200;
    const MECH_END = 5700;
    const DIAG_END = 8500;

    const tick = (now: number) => {
      const elapsed = now - start;

      if (elapsed < POWER_END) {
        const t = elapsed / POWER_END;
        setStage('power');
        setPowerLevelPct(Math.round(t * 100));
        setBusVoltage(Number((t * 28.0).toFixed(1)));
        if (t > 0.35) setLightsOn(true);
        if (t > 0.65) setComputerOnline(true);
      } else if (elapsed < MECH_END) {
        setStage('mechanical');
        setPowerLevelPct(100);
        setBusVoltage(28.0);
        setLightsOn(true);
        setComputerOnline(true);

        const mt = (elapsed - POWER_END) / (MECH_END - POWER_END);
        setMechanicalProgressPct(Math.round(mt * 100));

        const activeIdx = Math.min(4, Math.floor(mt * 5));
        const labels = [
          'Actuating Six-Wheel Drive Motors',
          'Deploying Solar Array Wings',
          'Slewing High-Gain Communication Dish',
          'Articulating 5-DOF Robotic Arm',
          'Calibrating Navigation Camera Mast',
        ];
        setMechanicalSubstep(labels[activeIdx]);
        setMechSteps((prev) =>
          prev.map((step, idx) => ({
            ...step,
            status: idx < activeIdx ? 'passed' : idx === activeIdx ? 'running' : 'idle',
          }))
        );
      } else if (elapsed < DIAG_END) {
        setStage('diagnostics');
        setMechanicalProgressPct(100);
        setMechanicalSubstep('All Mechanisms Active');
        setMechSteps((prev) => prev.map((s) => ({ ...s, status: 'passed' })));

        const dt = elapsed - MECH_END;
        const stepDur = 750;
        const stepOffset = 380;

        setDiagnostics(
          INITIAL_PHASE2_DIAGNOSTICS.map((item, idx) => {
            const local = dt - idx * stepOffset;
            if (local <= 0) {
              return { ...item, status: 'idle', progress: 0, metric: 'Queued' };
            }
            if (local < stepDur) {
              const p = Math.min(99, Math.round((local / stepDur) * 100));
              return { ...item, status: 'running', progress: p, metric: 'Verifying...' };
            }
            return {
              ...item,
              status: 'passed',
              progress: 100,
              metric: PASSED_METRICS[item.id] ?? 'Operational',
            };
          })
        );
      } else {
        setStage('ready');
        setPowerLevelPct(100);
        setBusVoltage(28.0);
        setLightsOn(true);
        setComputerOnline(true);
        setMechanicalProgressPct(100);
        setMechanicalSubstep('Operational');
        setMechSteps((prev) => prev.map((s) => ({ ...s, status: 'passed' })));
        setDiagnostics(
          INITIAL_PHASE2_DIAGNOSTICS.map((item) => ({
            ...item,
            status: 'passed',
            progress: 100,
            metric: PASSED_METRICS[item.id] ?? 'Operational',
          }))
        );
        rafRef.current = null;
        return;
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
    stage,
    powerLevelPct,
    busVoltage,
    lightsOn,
    computerOnline,
    mechanicalProgressPct,
    mechanicalSubstep,
    mechSteps,
    diagnostics,
    startActivationSequence,
    resetActivation,
  };
}
