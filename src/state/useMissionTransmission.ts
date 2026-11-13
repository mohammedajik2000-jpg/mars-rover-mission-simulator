import { useCallback, useEffect, useRef, useState } from 'react';
import { TransmissionCategoryItem, TransmissionStage } from '../types/mission';

export interface TransmissionPayloadSummary {
  photosCount: number;
  readingsCount: number;
  samplesCount: number;
  roverHealthPct: number;
}

const INITIAL_CATEGORIES = (summary: TransmissionPayloadSummary): TransmissionCategoryItem[] => [
  {
    id: 'photos',
    label: 'Photographs',
    summary: `${Math.max(1, summary.photosCount)} Mastcam-Z HDR Frame${summary.photosCount === 1 ? '' : 's'}`,
    sizeMb: Math.max(18.4, summary.photosCount * 18.4),
    progress: 0,
    status: 'pending',
  },
  {
    id: 'readings',
    label: 'Scientific Readings',
    summary: `${Math.max(1, summary.readingsCount)} Telemetry & MEDA Logs`,
    sizeMb: Math.max(4.2, summary.readingsCount * 3.8),
    progress: 0,
    status: 'pending',
  },
  {
    id: 'samples',
    label: 'Sample Analysis',
    summary: `${summary.samplesCount} Core & Regolith Spectral Assays`,
    sizeMb: Math.max(12.6, summary.samplesCount * 14.5),
    progress: 0,
    status: 'pending',
  },
  {
    id: 'health',
    label: 'Rover Health',
    summary: `Power, Thermal & ${summary.roverHealthPct.toFixed(1)}% Frame Audit`,
    sizeMb: 2.4,
    progress: 0,
    status: 'pending',
  },
];

export function useMissionTransmission() {
  const [transmissionStage, setTransmissionStage] = useState<TransmissionStage>('idle');
  const [transmissionProgressPct, setTransmissionProgressPct] = useState(0);
  const [transmittedMb, setTransmittedMb] = useState(0);
  const [totalPayloadMb, setTotalPayloadMb] = useState(48.0);
  const [statusMessage, setStatusMessage] = useState(
    'Ready to acquire Earth Deep Space Network carrier.'
  );
  const [categories, setCategories] = useState<TransmissionCategoryItem[]>(() =>
    INITIAL_CATEGORIES({
      photosCount: 1,
      readingsCount: 4,
      samplesCount: 2,
      roverHealthPct: 99.0,
    })
  );

  const rafRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const resetTransmission = useCallback(() => {
    stopTimer();
    setTransmissionStage('idle');
    setTransmissionProgressPct(0);
    setTransmittedMb(0);
    setStatusMessage('Ready to acquire Earth Deep Space Network carrier.');
  }, [stopTimer]);

  const startTransmission = useCallback(
    (summary: TransmissionPayloadSummary) => {
      stopTimer();
      const baseCats = INITIAL_CATEGORIES(summary);
      const totalMb = baseCats.reduce((acc, c) => acc + c.sizeMb, 0);
      setTotalPayloadMb(Number(totalMb.toFixed(1)));
      setCategories(baseCats);
      setTransmissionStage('acquiring');
      setTransmissionProgressPct(0);
      setTransmittedMb(0);
      setStatusMessage('Slewing High-Gain Dish & locking Earth DSN Canberra array...');

      const totalDurationMs = 9200;
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const pct = Math.min(100, (elapsed / totalDurationMs) * 100);
        setTransmissionProgressPct(pct);
        setTransmittedMb(Number(((pct / 100) * totalMb).toFixed(1)));

        if (pct < 12) {
          setTransmissionStage('acquiring');
          setStatusMessage('Slewing High-Gain Parabolic Dish toward Earth...');
        } else if (pct < 86) {
          setTransmissionStage('transmitting');
          if (pct < 34) {
            setStatusMessage('Streaming Mastcam-Z Mars photographs across 225M km...');
          } else if (pct < 56) {
            setStatusMessage('Transmitting MEDA thermal & spectrometer scientific readings...');
          } else if (pct < 76) {
            setStatusMessage('Uploading PIXL rock core & regolith sample spectral assays...');
          } else {
            setStatusMessage('Downlinking ARES-IV system health & mobility diagnostics...');
          }
        } else if (pct < 100) {
          setTransmissionStage('verifying');
          setStatusMessage('Verifying Reed-Solomon checksums at Earth Mission Control...');
        } else {
          setTransmissionStage('complete');
          setStatusMessage('ALL SCIENCE DATA VERIFIED AT EARTH MISSION CONTROL');
        }

        // Progress each category across staggered windows
        const windows: Array<[number, number]> = [
          [10, 38],
          [32, 60],
          [54, 80],
          [74, 96],
        ];

        setCategories(
          baseCats.map((cat, idx) => {
            const [wStart, wEnd] = windows[idx];
            const catPct =
              pct <= wStart
                ? 0
                : pct >= wEnd
                  ? 100
                  : Math.round(((pct - wStart) / (wEnd - wStart)) * 100);
            const status = catPct >= 100 ? 'verified' : catPct > 0 ? 'sending' : 'pending';
            return { ...cat, progress: catPct, status };
          })
        );

        if (pct < 100) {
          rafRef.current = window.requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };

      rafRef.current = window.requestAnimationFrame(tick);
    },
    [stopTimer]
  );

  useEffect(() => stopTimer, [stopTimer]);

  return {
    transmissionStage,
    transmissionProgressPct,
    transmittedMb,
    totalPayloadMb,
    statusMessage,
    categories,
    startTransmission,
    resetTransmission,
  };
}
