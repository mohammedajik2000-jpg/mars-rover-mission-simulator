import { ComponentId, MissionPhaseInfo, RoverComponentSpec } from '../types/mission';

export const BASE_CHASSIS_MASS_KG = 420;
export const CHASSIS_IDLE_DRAW_W = 45;

export const ROVER_COMPONENTS: RoverComponentSpec[] = [
  {
    id: 'wheels',
    code: 'MOB-06',
    name: 'Six Wheels',
    subsystem: 'Rocker-Bogie Mobility',
    massKg: 158,
    powerDrawW: 110,
    powerGenW: 0,
    batteryWh: 0,
    mountLocation: 'Lower Lateral Chassis Pivots',
    description:
      'Six machined aluminum-titanium wheels with chevron grousers mounted on an articulated rocker-bogie differential suspension.',
    specs: [
      { label: 'Wheel Diameter', value: '52.5 cm' },
      { label: 'Climb Grade', value: '45° Loose Regolith' },
      { label: 'Drive Motors', value: '6 Independent Brushless' },
    ],
    cameraTarget: [0, 0.55, 0],
    cameraPosition: [3.6, 1.4, 3.2],
    mountHighlightPos: [0, 0.62, 0.05],
  },
  {
    id: 'battery',
    code: 'PWR-BAT',
    name: 'Battery',
    subsystem: 'Energy Storage Core',
    massKg: 64,
    powerDrawW: 0,
    powerGenW: 110,
    batteryWh: 2400,
    mountLocation: 'Aft Thermal Power Bay',
    description:
      'Dual-bus radiation-hardened Li-Ion battery pack paired with an auxiliary radioisotope thermal regulator for Martian nights.',
    specs: [
      { label: 'Bus Voltage', value: '28.0 V DC Regulated' },
      { label: 'Storage', value: '2,400 Wh Dual-Cell' },
      { label: 'Thermal Range', value: '-130°C to +45°C' },
    ],
    cameraTarget: [0, 0.95, -0.8],
    cameraPosition: [-2.8, 1.8, -3.4],
    mountHighlightPos: [0, 0.9, -0.92],
  },
  {
    id: 'solarPanels',
    code: 'PWR-SOL',
    name: 'Solar Panels',
    subsystem: 'Photovoltaic Generation',
    massKg: 52,
    powerDrawW: 0,
    powerGenW: 340,
    batteryWh: 0,
    mountLocation: 'Upper Deck Wing Hinges',
    description:
      'Triple-junction gallium arsenide deployable solar wings engineered for dust shedding and high-efficiency Martian insolation capture.',
    specs: [
      { label: 'Peak Output', value: '340 W @ 1.52 AU' },
      { label: 'Cell Efficiency', value: '31.4% Triple-Junction' },
      { label: 'Array Span', value: '2.84 m Deployed' },
    ],
    cameraTarget: [0, 1.15, -0.1],
    cameraPosition: [3.2, 2.8, -2.5],
    mountHighlightPos: [0, 1.1, -0.25],
  },
  {
    id: 'navCameras',
    code: 'OPT-NAV',
    name: 'Navigation Cameras',
    subsystem: 'Stereo Vision & Mast',
    massKg: 34,
    powerDrawW: 38,
    powerGenW: 0,
    batteryWh: 0,
    mountLocation: 'Forward Starboard Mast Mount',
    description:
      'Remote sensing mast housing 3D stereo Navcams, laser micro-imager, and four chassis-mounted hazard avoidance cameras.',
    specs: [
      { label: 'Resolution', value: '20 MP Color Stereo' },
      { label: 'Mast Elevation', value: '2.15 m Above Ground' },
      { label: 'Slew Range', value: '360° Azimuth / ±90° Pitch' },
    ],
    cameraTarget: [0.35, 1.75, 0.75],
    cameraPosition: [2.6, 2.3, 2.8],
    mountHighlightPos: [0.34, 1.1, 0.54],
  },
  {
    id: 'commAntenna',
    code: 'COM-HGA',
    name: 'Communication Antenna',
    subsystem: 'Deep Space X-Band & UHF',
    massKg: 29,
    powerDrawW: 55,
    powerGenW: 0,
    batteryWh: 0,
    mountLocation: 'Aft Port Gimbal Platform',
    description:
      '2-axis steerable parabolic High-Gain Antenna for direct-to-Earth X-band telemetry plus an omnidirectional UHF orbiter relay mast.',
    specs: [
      { label: 'X-Band Rate', value: '32 kbps Direct-to-Earth' },
      { label: 'UHF Relay', value: '2.0 Mbps via Orbiter' },
      { label: 'Dish Aperture', value: '0.68 m Composite' },
    ],
    cameraTarget: [-0.45, 1.55, -0.55],
    cameraPosition: [-2.9, 2.2, -2.6],
    mountHighlightPos: [-0.32, 1.1, -0.46],
  },
  {
    id: 'roboticArm',
    code: 'MAN-ARM',
    name: 'Robotic Arm',
    subsystem: '5-DOF Sample Acquisition',
    massKg: 95,
    powerDrawW: 85,
    powerGenW: 0,
    batteryWh: 0,
    mountLocation: 'Forward Bulkhead Turret Bracket',
    description:
      'Five-degree-of-freedom titanium manipulator arm equipped with a rotary percussive rock-coring drill and contact abrasion tool.',
    specs: [
      { label: 'Reach Envelope', value: '2.10 m Forward' },
      { label: 'Turret Payload', value: '45 kg Instrumentation' },
      { label: 'Coring Depth', value: '60 mm Rock Core' },
    ],
    cameraTarget: [0, 1.05, 1.35],
    cameraPosition: [2.8, 1.7, 3.3],
    mountHighlightPos: [-0.14, 0.88, 0.86],
  },
  {
    id: 'scienceInstruments',
    code: 'SCI-LAB',
    name: 'Scientific Instruments',
    subsystem: 'Spectroscopy & Atmospheric Lab',
    massKg: 78,
    powerDrawW: 65,
    powerGenW: 0,
    batteryWh: 0,
    mountLocation: 'Upper & Ventral Science Bay',
    description:
      'Integrated astrobiology suite featuring a Raman UV spectrometer, atmospheric oxygen extractor module, and subsurface radar.',
    specs: [
      { label: 'Spectrometer', value: '248.6 nm Deep-UV Raman' },
      { label: 'O2 Production', value: '10 g/hr Solid Oxide' },
      { label: 'Subsurface Scan', value: '10 m Ground Radar' },
    ],
    cameraTarget: [0, 1.2, 0.1],
    cameraPosition: [-3.1, 2.4, 2.4],
    mountHighlightPos: [-0.24, 1.12, 0.24],
  },
];

export const COMPONENT_BY_ID: Record<ComponentId, RoverComponentSpec> =
  ROVER_COMPONENTS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<ComponentId, RoverComponentSpec>
  );

export const INITIAL_INSTALLED_STATE: Record<ComponentId, boolean> = {
  wheels: false,
  solarPanels: false,
  battery: false,
  navCameras: false,
  commAntenna: false,
  roboticArm: false,
  scienceInstruments: false,
};

export const MISSION_PHASES: MissionPhaseInfo[] = [
  {
    id: 'phase1',
    number: 1,
    title: 'Rover Assembly & Integration',
    shortTitle: 'Assembly',
    status: 'active',
    summary:
      'Assemble all seven mission-critical subsystems onto the Warm Electronics Box chassis and complete full-stack diagnostics.',
    prerequisites: 'Active Engineering Bay',
  },
  {
    id: 'phase2',
    number: 2,
    title: 'Machine Activation',
    shortTitle: 'Activation',
    status: 'locked',
    summary:
      'Cold-boot flight computers, verify actuator torque limits, and establish initial telemetry heartbeat.',
    prerequisites: 'Complete Phase 1 Assembly & Systems Check',
  },
  {
    id: 'phase3',
    number: 3,
    title: 'Earth Rocket Launch',
    shortTitle: 'Launch',
    status: 'locked',
    summary:
      'Encapsulate rover inside aeroshell payload fairing and execute heavy-lift orbital ascent from Launch Complex 41.',
    prerequisites: 'Complete Phase 2 Activation',
  },
  {
    id: 'phase4',
    number: 4,
    title: 'Earth-to-Mars Space Journey',
    shortTitle: 'Cruise',
    status: 'locked',
    summary:
      'Perform deep-space trajectory correction maneuvers and periodic health telemetry checks across 480M km.',
    prerequisites: 'Complete Phase 3 Launch',
  },
  {
    id: 'phase5',
    number: 5,
    title: 'Mars Atmospheric Entry & Landing',
    shortTitle: 'EDL',
    status: 'locked',
    summary:
      'Execute hypersonic heatshield entry, supersonic parachute deployment, and sky-crane powered descent to Jezero Crater.',
    prerequisites: 'Complete Phase 4 Cruise',
  },
  {
    id: 'phase6',
    number: 6,
    title: 'Interactive Mars Exploration',
    shortTitle: 'Explore',
    status: 'locked',
    summary:
      'Navigate Jezero Crater, collect rock cores & regolith samples, capture Mastcam photographs, and perform surface science.',
    prerequisites: 'Complete Phase 5 Landing',
  },
  {
    id: 'phase7',
    number: 7,
    title: 'Data Transmission & Final Report',
    shortTitle: 'Transmit',
    status: 'locked',
    summary:
      'Point the High-Gain Antenna toward Earth, stream photographs, readings, and sample analyses across the Deep Space Network, and generate the final mission report.',
    prerequisites: 'Complete Phase 6 Exploration Objectives',
  },
];
