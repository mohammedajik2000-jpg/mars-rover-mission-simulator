import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BASE_CHASSIS_MASS_KG,
  CHASSIS_IDLE_DRAW_W,
  COMPONENT_BY_ID,
  INITIAL_INSTALLED_STATE,
  ROVER_COMPONENTS,
} from '../data/roverComponents';
import { ComponentId, RoverConfiguration } from '../types/mission';

const INSTALL_DURATION_MS = 1250;

export function useRoverAssembly(onBeforeReset?: () => void) {
  const [selectedComponentId, setSelectedComponentId] = useState<ComponentId>('wheels');
  const [installedComponents, setInstalledComponents] = useState<Record<ComponentId, boolean>>(
    INITIAL_INSTALLED_STATE
  );
  const [installingComponentId, setInstallingComponentId] = useState<ComponentId | null>(null);
  const [installProgress, setInstallProgress] = useState<number>(0);

  const rafRef = useRef<number | null>(null);

  const installedCount = useMemo(
    () => Object.values(installedComponents).filter(Boolean).length,
    [installedComponents]
  );

  const totalComponents = ROVER_COMPONENTS.length;
  const allInstalled = installedCount === totalComponents;

  const installComponent = useCallback(
    (id: ComponentId) => {
      if (installedComponents[id] || installingComponentId !== null) {
        return;
      }

      setSelectedComponentId(id);
      setInstallingComponentId(id);
      setInstallProgress(0);

      const start = performance.now();

      const step = (now: number) => {
        const elapsed = now - start;
        const pct = Math.min(100, Math.round((elapsed / INSTALL_DURATION_MS) * 100));
        setInstallProgress(pct);

        if (elapsed < INSTALL_DURATION_MS) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setInstalledComponents((prev) => ({ ...prev, [id]: true }));
          setInstallingComponentId(null);
          setInstallProgress(0);
          rafRef.current = null;
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [installedComponents, installingComponentId]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const resetAssembly = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setInstallingComponentId(null);
    setInstallProgress(0);
    setInstalledComponents(INITIAL_INSTALLED_STATE);
    setSelectedComponentId('wheels');
    onBeforeReset?.();
  }, [onBeforeReset]);

  const metrics = useMemo(() => {
    let addedMass = 0;
    let batteryCapacityWh = 0;
    let powerGenerationW = 0;
    let powerConsumptionW = CHASSIS_IDLE_DRAW_W;

    (Object.keys(installedComponents) as ComponentId[]).forEach((id) => {
      if (installedComponents[id]) {
        const spec = COMPONENT_BY_ID[id];
        addedMass += spec.massKg;
        batteryCapacityWh += spec.batteryWh;
        powerGenerationW += spec.powerGenW;
        powerConsumptionW += spec.powerDrawW;
      }
    });

    const totalMassKg = BASE_CHASSIS_MASS_KG + addedMass;
    const netPowerW = powerGenerationW - powerConsumptionW;

    let powerStatus: 'Offline' | 'Battery Only' | 'Solar + Battery' | 'Nominal' = 'Offline';
    if (installedComponents.battery && installedComponents.solarPanels) {
      powerStatus = netPowerW >= 0 ? 'Nominal' : 'Solar + Battery';
    } else if (installedComponents.battery) {
      powerStatus = 'Battery Only';
    } else if (installedComponents.solarPanels) {
      powerStatus = 'Solar + Battery';
    }

    const wheelStatus = installedComponents.wheels
      ? '6-Wheel Rocker-Bogie Armed'
      : 'Unmounted (Chassis Stand)';

    const commStatus = installedComponents.commAntenna
      ? 'X-Band & UHF Linked'
      : 'No Transceiver Array';

    const assemblyReadinessPct = Math.round((installedCount / totalComponents) * 100);

    return {
      totalMassKg,
      batteryCapacityWh,
      powerGenerationW,
      powerConsumptionW,
      netPowerW,
      powerStatus,
      wheelStatus,
      commStatus,
      assemblyReadinessPct,
    };
  }, [installedComponents, installedCount, totalComponents]);

  const buildRoverConfiguration = useCallback(
    (
      systemsVerified: boolean,
      verifiedAtIso: string | null,
      activationCompleted: boolean
    ): RoverConfiguration => ({
      roverId: 'ARES-IV-01',
      chassisModel: 'WEB-OctaCore Mk.IV',
      baseMassKg: BASE_CHASSIS_MASS_KG,
      installedComponents: { ...installedComponents },
      totalMassKg: metrics.totalMassKg,
      batteryCapacityWh: metrics.batteryCapacityWh,
      powerGenerationW: metrics.powerGenerationW,
      powerConsumptionW: metrics.powerConsumptionW,
      netPowerW: metrics.netPowerW,
      systemsVerified,
      verifiedAtIso,
      activationCompleted,
    }),
    [installedComponents, metrics]
  );

  return {
    selectedComponentId,
    setSelectedComponentId,
    installedComponents,
    installingComponentId,
    installProgress,
    installedCount,
    totalComponents,
    allInstalled,
    installComponent,
    resetAssembly,
    metrics,
    buildRoverConfiguration,
  };
}
