import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useMission } from '../state/MissionContext';
import { COMPONENT_BY_ID } from '../data/roverComponents';
import { CameraPresetId, ComponentId } from '../types/mission';
import { RoverModel } from './RoverModel';
import { EarthLabEnvironment } from './EarthLabEnvironment';
import { LaunchFacilityScene } from './LaunchFacilityScene';
import { DeepSpaceCruiseScene } from './DeepSpaceCruiseScene';
import { MarsLandingScene } from './MarsLandingScene';
import { MarsExplorationScene } from './MarsExplorationScene';
import { Phase7TransmissionScene } from './Phase7TransmissionScene';
import { MarsMinimapHud } from '../components/MarsMinimapHud';

const PRESET_VIEWS: Record<
  CameraPresetId,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  overview: { position: [3.45, 2.15, 3.55], target: [0, 0.85, 0] },
  front: { position: [0.1, 1.35, 3.9], target: [0, 0.9, 0.2] },
  side: { position: [4.1, 1.25, 0.05], target: [0, 0.85, 0] },
  top: { position: [0.01, 4.4, 0.7], target: [0, 0.9, 0] },
  aft: { position: [-0.2, 1.5, -3.8], target: [0, 0.9, -0.2] },
};

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _projVec = new THREE.Vector3();

const DROP_NDC_THRESHOLD = 0.28;

const StudioEnvironmentRig: React.FC<{ isCruisePhase: boolean }> = ({ isCruisePhase }) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new RoomEnvironment();
    const renderTarget = pmremGenerator.fromScene(envScene, 0.04);
    scene.environment = renderTarget.texture;

    return () => {
      renderTarget.dispose();
      envScene.dispose();
      pmremGenerator.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    scene.environmentIntensity = isCruisePhase ? 0.18 : 0.82;
  }, [scene, isCruisePhase]);

  return null;
};

const DragDropTracker: React.FC<{
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  alignedRef: React.MutableRefObject<boolean>;
}> = ({ cameraRef, alignedRef }) => {
  const { camera } = useThree();
  const { draggingComponentId, dragPointerNdcRef, setDropZoneAligned } = useMission();

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera, cameraRef]);

  useFrame(() => {
    if (!draggingComponentId || !dragPointerNdcRef.current.active) {
      if (alignedRef.current) {
        alignedRef.current = false;
        setDropZoneAligned(false);
      }
      return;
    }

    const spec = COMPONENT_BY_ID[draggingComponentId];
    if (!spec) return;

    _projVec.set(...spec.mountHighlightPos).project(camera);
    const dist = Math.hypot(
      _projVec.x - dragPointerNdcRef.current.x,
      _projVec.y - dragPointerNdcRef.current.y
    );
    const nextAligned = _projVec.z < 1 && dist <= DROP_NDC_THRESHOLD;

    if (nextAligned !== alignedRef.current) {
      alignedRef.current = nextAligned;
      setDropZoneAligned(nextAligned);
    }
  });

  return null;
};

const CameraController: React.FC<{ isSoftwareGl: boolean }> = ({ isSoftwareGl }) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const {
    cameraPreset,
    cameraFocusToken,
    selectedComponentId,
    autoRotate,
    activationStage,
  } = useMission();

  const isTransitioning = useRef(false);
  const desiredPos = useRef(new THREE.Vector3(...PRESET_VIEWS.overview.position));
  const desiredTarget = useRef(new THREE.Vector3(...PRESET_VIEWS.overview.target));

  useEffect(() => {
    const view = PRESET_VIEWS[cameraPreset];
    desiredPos.current.set(...view.position);
    desiredTarget.current.set(...view.target);
    isTransitioning.current = true;
  }, [cameraPreset]);

  useEffect(() => {
    if (cameraFocusToken === 0) return;
    const spec = COMPONENT_BY_ID[selectedComponentId];
    if (!spec) return;
    desiredPos.current.set(...spec.cameraPosition);
    desiredTarget.current.set(...spec.cameraTarget);
    isTransitioning.current = true;
  }, [cameraFocusToken, selectedComponentId]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (isTransitioning.current) {
      const lambda = 5.5;
      _targetPos.copy(desiredPos.current);
      _targetLook.copy(desiredTarget.current);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, lambda, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, lambda, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, lambda, delta);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, lambda, delta);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, lambda, delta);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, lambda, delta);

      if (
        camera.position.distanceTo(_targetPos) < 0.03 &&
        controls.target.distanceTo(_targetLook) < 0.03
      ) {
        isTransitioning.current = false;
      }
    }

    controls.update();
  });

  const cinematicReadyOrbit = activationStage === 'ready';

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={!isSoftwareGl}
      dampingFactor={0.06}
      enablePan={false}
      minDistance={2.2}
      maxDistance={9.5}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI * 0.485}
      autoRotate={(autoRotate || cinematicReadyOrbit) && !isSoftwareGl}
      autoRotateSpeed={cinematicReadyOrbit ? 1.15 : 0.9}
      onStart={() => {
        isTransitioning.current = false;
      }}
    />
  );
};

export const RoverViewport: React.FC = () => {
  const {
    activePhase,
    installedComponents,
    selectedComponentId,
    installingComponentId,
    installProgress,
    isTesting,
    activationStage,
    mechSteps,
    lightsOn,
    computerOnline,
    launchAnimRef,
    cruiseAnimRef,
    edlAnimRef,
    driveInputRef,
    roverPoseRef,
    wheelSpeedRef,
    armActiveRef,
    zoomDeltaRef,
    activeScienceScan,
    scienceSubstage,
    canvasElementRef,
    autoDriveTargetRef,
    scienceAnimRef,
    minimapTelemetry,
    transmissionStage,
    draggingComponentId,
    setDraggingComponentId,
    dragPointerNdcRef,
    dropZoneAligned,
    setDropZoneAligned,
    dropFeedback,
    triggerDropFeedback,
    installComponent,
  } = useMission();

  const [contextLost, setContextLost] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const alignedRef = useRef(false);

  const isSoftwareGl = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return false;
    }
  }, []);

  if (contextLost) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#07090E] p-6 text-center">
        <p className="font-display text-lg font-semibold text-slate-200">
          3D Viewport Context Interrupted
        </p>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          The WebGL graphics context was suspended by the browser. Click below to reinitialize the
          simulation bay.
        </p>
        <button
          type="button"
          onClick={() => setContextLost(false)}
          className="mt-4 rounded border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20"
        >
          Restore 3D Viewport
        </button>
      </div>
    );
  }

  const isTransmitPhase = activePhase === 'phase7';
  const isExplorePhase = activePhase === 'phase6';
  const isLandingPhase = activePhase === 'phase5';
  const isCruisePhase = activePhase === 'phase4';
  const isLaunchPhase = activePhase === 'phase3';
  const isPhase2 = activePhase === 'phase2';

  const updatePointerNdc = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    dragPointerNdcRef.current.x = ndcX;
    dragPointerNdcRef.current.y = ndcY;
    dragPointerNdcRef.current.active = true;
    return { ndcX, ndcY };
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (activePhase !== 'phase1') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = alignedRef.current ? 'move' : 'copy';
    updatePointerNdc(e.clientX, e.clientY);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      dragPointerNdcRef.current.active = false;
      alignedRef.current = false;
      setDropZoneAligned(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (activePhase !== 'phase1') return;
    e.preventDefault();
    const rawId = e.dataTransfer.getData('text/plain') as ComponentId | '';
    const droppedId = (rawId || draggingComponentId) as ComponentId | null;
    const coords = updatePointerNdc(e.clientX, e.clientY);

    let isAlignedNow = alignedRef.current;
    if (droppedId && coords && cameraRef.current && COMPONENT_BY_ID[droppedId]) {
      _projVec.set(...COMPONENT_BY_ID[droppedId].mountHighlightPos).project(cameraRef.current);
      const dist = Math.hypot(_projVec.x - coords.ndcX, _projVec.y - coords.ndcY);
      isAlignedNow = _projVec.z < 1 && dist <= DROP_NDC_THRESHOLD;
    }

    setDraggingComponentId(null);
    setDropZoneAligned(false);
    alignedRef.current = false;
    dragPointerNdcRef.current.active = false;

    if (!droppedId || !COMPONENT_BY_ID[droppedId]) return;
    const spec = COMPONENT_BY_ID[droppedId];

    if (installedComponents[droppedId]) {
      triggerDropFeedback({
        type: 'error',
        message: `${spec.name} is already mounted on the rover.`,
      });
      return;
    }

    if (isAlignedNow) {
      installComponent(droppedId);
      triggerDropFeedback({
        type: 'success',
        message: `Mounted ${spec.name} onto rover chassis.`,
      });
    } else {
      triggerDropFeedback({
        type: 'error',
        message: `Incorrect placement — drag ${spec.name} over its highlighted mount point on the rover.`,
      });
    }
  };

  const dragSpec = draggingComponentId ? COMPONENT_BY_ID[draggingComponentId] : null;

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative h-full w-full bg-[#090d14]"
    >
      {/* Drag-and-Drop Target Status & Placement Feedback Overlay */}
      {activePhase === 'phase1' && dragSpec && (
        <div className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2">
          <div
            className={`rounded border px-3.5 py-1.5 font-mono text-xs font-medium tracking-wide shadow-lg ${
              dropZoneAligned
                ? 'border-emerald-400 bg-emerald-950/90 text-emerald-200'
                : 'border-cyan-400/70 bg-[#0B0F17]/90 text-cyan-200'
            }`}
          >
            {dropZoneAligned
              ? `ALIGNED: Release to snap ${dragSpec.name} into position`
              : `DRAGGING ${dragSpec.name.toUpperCase()} · Move over highlighted rover mount point`}
          </div>
        </div>
      )}

      {activePhase === 'phase1' && !dragSpec && dropFeedback && (
        <div className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2">
          <div
            className={`rounded border px-3.5 py-1.5 font-mono text-xs font-medium shadow-lg ${
              dropFeedback.type === 'success'
                ? 'border-emerald-500/70 bg-emerald-950/90 text-emerald-200'
                : 'border-rose-500/80 bg-rose-950/90 text-rose-200'
            }`}
          >
            {dropFeedback.message}
          </div>
        </div>
      )}

      {isExplorePhase && activeScienceScan === 'cameraObs' && (
        <div className="pointer-events-none absolute inset-6 z-20 flex items-center justify-center rounded border-2 border-cyan-400/70">
          <div className="rounded border border-cyan-400/60 bg-[#0B0F17]/85 px-4 py-2 font-mono text-xs font-semibold tracking-wider text-cyan-200">
            {scienceSubstage || 'MASTCAM-Z STEREO CAPTURE · ACQUIRING 18.4 MP PANORAMA...'}
          </div>
        </div>
      )}

      {isExplorePhase && <MarsMinimapHud telemetry={minimapTelemetry} />}

      <Canvas
        shadows={!isSoftwareGl}
        dpr={isSoftwareGl ? 1 : [1, 2]}
        camera={{
          position: isTransmitPhase
            ? [4.6, 2.3, 5.2]
            : isLandingPhase
              ? [5.2, 46, 8.2]
              : isCruisePhase
                ? [3.4, 1.5, 4.6]
                : isLaunchPhase
                  ? [12.5, 6.2, 14.5]
                  : PRESET_VIEWS.overview.position,
          fov: 42,
          near: 0.1,
          far: 650,
        }}
        gl={{
          antialias: !isSoftwareGl,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isPhase2 ? 1.16 : 1.1,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          const dom = gl.domElement;
          canvasElementRef.current = dom;
          dom.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
          });
          dom.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
      >
        <color
          attach="background"
          args={[
            isExplorePhase
              ? '#c26b44'
              : isTransmitPhase
                ? '#7a3b23'
                : isCruisePhase || isLandingPhase
                  ? '#020409'
                  : isLaunchPhase
                    ? '#2d6da8'
                    : '#090d14',
          ]}
        />
        <fogExp2
          attach="fog"
          args={[
            isExplorePhase
              ? '#c26b44'
              : isTransmitPhase
                ? '#7a3b23'
                : isCruisePhase || isLandingPhase
                  ? '#020409'
                  : isLaunchPhase
                    ? '#2d6da8'
                    : '#090d14',
            isExplorePhase
              ? 0.011
              : isTransmitPhase
                ? 0.008
                : isCruisePhase || isLandingPhase
                  ? 0
                  : isLaunchPhase
                    ? 0.008
                    : 0.026,
          ]}
        />

        <StudioEnvironmentRig isCruisePhase={isCruisePhase} />

        {isTransmitPhase ? (
          <>
            <hemisphereLight args={['#fed7aa', '#29150b', 0.65]} />
            <directionalLight
              position={[-32, 24, 18]}
              intensity={2.8}
              color="#ffedd5"
              castShadow={!isSoftwareGl}
              shadow-mapSize={[1024, 1024]}
            />
            <directionalLight position={[18, 12, -20]} intensity={0.45} color="#38bdf8" />
            <Phase7TransmissionScene
              installedComponents={installedComponents}
              activationStage={activationStage}
              lightsOn={lightsOn}
              computerOnline={computerOnline}
              transmissionStage={transmissionStage}
              isSoftwareGl={isSoftwareGl}
            />
          </>
        ) : isExplorePhase ? (
          <>
            <hemisphereLight args={['#fed7aa', '#451a03', 0.72]} />
            <directionalLight
              position={[-38, 28, 18]}
              intensity={2.95}
              color="#ffedd5"
              castShadow={!isSoftwareGl}
              shadow-mapSize={[1024, 1024]}
              shadow-camera-left={-30}
              shadow-camera-right={30}
              shadow-camera-top={30}
              shadow-camera-bottom={-30}
              shadow-camera-near={2}
              shadow-camera-far={120}
            />
            <directionalLight position={[22, 10, -18]} intensity={0.45} color="#fb923c" />
            <MarsExplorationScene
              installedComponents={installedComponents}
              activationStage={activationStage}
              lightsOn={lightsOn}
              computerOnline={computerOnline}
              driveInputRef={driveInputRef}
              roverPoseRef={roverPoseRef}
              wheelSpeedRef={wheelSpeedRef}
              armActiveRef={armActiveRef}
              zoomDeltaRef={zoomDeltaRef}
              activeScienceScan={activeScienceScan}
              autoDriveTargetRef={autoDriveTargetRef}
              scienceAnimRef={scienceAnimRef}
              nextWaypointPos={minimapTelemetry.nextWaypoint}
              isSoftwareGl={isSoftwareGl}
            />
          </>
        ) : isLandingPhase ? (
          <>
            <hemisphereLight args={['#fed7aa', '#451a03', 0.62]} />
            <directionalLight
              position={[-42, 26, 18]}
              intensity={2.85}
              color="#ffedd5"
              castShadow={!isSoftwareGl}
              shadow-mapSize={[1024, 1024]}
            />
            <directionalLight position={[22, 8, -16]} intensity={0.42} color="#fb923c" />
            <MarsLandingScene
              installedComponents={installedComponents}
              edlAnimRef={edlAnimRef}
              activationStage={activationStage}
              lightsOn={lightsOn}
              computerOnline={computerOnline}
            />
          </>
        ) : isCruisePhase ? (
          <>
            <hemisphereLight args={['#cbd5e1', '#0b1120', 0.48]} />
            <directionalLight position={[-36, 20, -14]} intensity={3.35} color="#fff7ed" />
            <directionalLight position={[28, -10, -24]} intensity={0.38} color="#38bdf8" />
            <DeepSpaceCruiseScene
              installedComponents={installedComponents}
              cruiseAnimRef={cruiseAnimRef}
              activationStage={activationStage}
              lightsOn={lightsOn}
              computerOnline={computerOnline}
            />
          </>
        ) : isLaunchPhase ? (
          <>
            <hemisphereLight args={['#bae6fd', '#334155', 0.85]} />
            <directionalLight
              position={[24, 38, 18]}
              intensity={2.6}
              color="#fff7ed"
              castShadow={!isSoftwareGl}
              shadow-mapSize={[1024, 1024]}
            />
            <LaunchFacilityScene
              installedComponents={installedComponents}
              launchAnimRef={launchAnimRef}
              activationStage={activationStage}
              lightsOn={lightsOn}
              computerOnline={computerOnline}
            />
          </>
        ) : (
          <>
            {/* Earth Engineering Laboratory Cleanroom Lighting */}
            <hemisphereLight args={['#cbd5e1', '#1e293b', isPhase2 ? 0.65 : 0.78]} />
            <directionalLight
              position={[6, 8, 5]}
              intensity={isPhase2 ? 2.65 : 2.35}
              color="#fff7ed"
              castShadow={!isSoftwareGl}
              shadow-mapSize={[1024, 1024]}
              shadow-bias={-0.0004}
              shadow-normalBias={0.02}
              shadow-camera-left={-4.5}
              shadow-camera-right={4.5}
              shadow-camera-top={4.5}
              shadow-camera-bottom={-4.5}
              shadow-camera-near={1}
              shadow-camera-far={24}
            />
            <directionalLight position={[-5, 4, -5]} intensity={isPhase2 ? 1.3 : 1.0} color="#7dd3fc" />
            <pointLight position={[0, 4.5, -2.5]} intensity={1.1} color="#38bdf8" distance={14} />

            {/* Phase 2 Cinematic Overhead Key Accent */}
            {isPhase2 && (
              <spotLight
                position={[0, 6.2, 2.6]}
                angle={0.55}
                penumbra={0.65}
                intensity={lightsOn ? 3.2 : 1.8}
                color={lightsOn ? '#e0f2fe' : '#bae6fd'}
                distance={14}
              />
            )}

            <EarthLabEnvironment lightsOn={lightsOn} />

            <RoverModel
              installedComponents={installedComponents}
              selectedComponentId={selectedComponentId}
              installingComponentId={installingComponentId}
              installProgress={installProgress}
              isTestingActive={isTesting}
              activationStage={activationStage}
              activeMechStepId={mechSteps.find((s) => s.status === 'running')?.id ?? null}
              lightsOn={lightsOn}
              computerOnline={computerOnline}
              isDragging={Boolean(draggingComponentId)}
              dropZoneAligned={dropZoneAligned}
            />

            <DragDropTracker cameraRef={cameraRef} alignedRef={alignedRef} />
            <CameraController isSoftwareGl={isSoftwareGl} />
          </>
        )}
      </Canvas>
    </div>
  );
};
