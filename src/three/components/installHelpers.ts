import type React from 'react';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { ActivationSequenceStage, ScienceAnimState } from '../../types/mission';
import { RoverMaterialLibrary } from '../materials';

export type ComponentRenderMode = 'hidden' | 'preview' | 'installing' | 'installed';

export interface ComponentAssemblyProps {
  mode: ComponentRenderMode;
  installProgress: number; // 0 to 100
  isTestingActive?: boolean;
  activationStage?: ActivationSequenceStage;
  activeMechStepId?: string | null;
  lightsOn?: boolean;
  externalWheelSpeedRef?: React.MutableRefObject<number>;
  externalArmActiveRef?: React.MutableRefObject<boolean>;
  externalScienceRef?: React.MutableRefObject<ScienceAnimState>;
  externalAntennaTracking?: boolean;
}

export function resolveMaterial(
  mode: ComponentRenderMode,
  realMat: THREE.Material,
  mats: RoverMaterialLibrary,
  wireframePass = false
): THREE.Material {
  if (mode === 'preview') {
    return wireframePass ? mats.previewGhostWire : mats.previewGhostSolid;
  }
  return realMat;
}

export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Smoothly animates a THREE.Group along an insertion vector during installation
 * and adds a subtle hover float when in holographic preview mode.
 */
export function useMountSlideAnimation(
  groupRef: React.RefObject<THREE.Group | null>,
  mode: ComponentRenderMode,
  installProgress: number,
  entryOffset: [number, number, number]
) {
  const currentProgress = useRef(mode === 'installed' ? 1 : 0);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (mode === 'preview') {
      const hoverY = Math.sin(state.clock.elapsedTime * 3.0) * 0.025;
      group.position.set(
        entryOffset[0] * 0.08,
        entryOffset[1] * 0.08 + hoverY,
        entryOffset[2] * 0.08
      );
      group.scale.setScalar(1);
      return;
    }

    if (mode === 'installing') {
      const targetT = easeOutCubic(installProgress / 100);
      currentProgress.current = THREE.MathUtils.damp(currentProgress.current, targetT, 14, delta);
      const remaining = 1 - currentProgress.current;
      group.position.set(
        entryOffset[0] * remaining,
        entryOffset[1] * remaining,
        entryOffset[2] * remaining
      );
      const s = 0.92 + 0.08 * currentProgress.current;
      group.scale.setScalar(s);
      return;
    }

    if (mode === 'installed') {
      currentProgress.current = THREE.MathUtils.damp(currentProgress.current, 1, 14, delta);
      const remaining = 1 - currentProgress.current;
      group.position.set(
        entryOffset[0] * remaining,
        entryOffset[1] * remaining,
        entryOffset[2] * remaining
      );
      group.scale.setScalar(1);
    }
  });
}
