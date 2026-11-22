export const TABLE_WIDTH = 420;
export const TABLE_HEIGHT = 720;
export const BALL_RADIUS = 10.5;
export const LAUNCH_LANE_X = 384;
export const LAUNCH_DIVIDER_X = 366;
export const PLUNGER_REST_Y = 668;
export const DRAIN_Y = 696;

export interface SegmentWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isDivider?: boolean;
}

export interface BumperDef {
  id: string;
  x: number;
  y: number;
  radius: number;
  points: number;
  kind: 'triangle' | 'side';
}

export interface HoleSlotDef {
  id: string;
  x: number;
  y: number;
  radius: number;
  zone: 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';
}

export interface FlipperDef {
  side: 'left' | 'right';
  pivotX: number;
  pivotY: number;
  length: number;
  baseRadius: number;
  tipRadius: number;
  restAngle: number; // radians
  activeAngle: number; // radians
}

export function buildTableWalls(): SegmentWall[] {
  const walls: SegmentWall[] = [];

  // Top elliptical arch from (18, 165) over (210, 22) to (402, 165)
  const archSegments = 24;
  const cx = 210;
  const cy = 165;
  const rx = 192;
  const ry = 143;

  for (let i = 0; i < archSegments; i++) {
    const a1 = Math.PI + (i / archSegments) * Math.PI;
    const a2 = Math.PI + ((i + 1) / archSegments) * Math.PI;
    walls.push({
      x1: cx + Math.cos(a1) * rx,
      y1: cy + Math.sin(a1) * ry,
      x2: cx + Math.cos(a2) * rx,
      y2: cy + Math.sin(a2) * ry,
    });
  }

  // Left outer vertical wall
  walls.push({ x1: 18, y1: 165, x2: 18, y2: 536 });

  // Left lower sloped guide rail funneling to left flipper
  walls.push({ x1: 18, y1: 536, x2: 114, y2: 612 });
  // Left drain chute outer wall below flipper
  walls.push({ x1: 18, y1: 536, x2: 18, y2: 710 });

  // Right outer wall (launch lane right edge)
  walls.push({ x1: 402, y1: 165, x2: 402, y2: 690 });

  // Launch lane bottom floor
  walls.push({ x1: 366, y1: 690, x2: 402, y2: 690 });

  // Launch lane inner divider wall
  walls.push({ x1: 366, y1: 174, x2: 366, y2: 690, isDivider: true });

  // Right lower sloped guide rail funneling to right flipper
  walls.push({ x1: 366, y1: 536, x2: 270, y2: 612 });

  // Subtle upper-left and upper-right angled deflectors to keep action lively
  walls.push({ x1: 18, y1: 278, x2: 42, y2: 304 });
  walls.push({ x1: 366, y1: 278, x2: 342, y2: 304 });

  return walls;
}

// Center 3 bumpers arranged in an inverted triangle (▽): 10, 20, 50 pts
// Plus 2 moderate-strength side bumpers
export const TABLE_BUMPERS: BumperDef[] = [
  {
    id: 'tri-10',
    x: 132,
    y: 214,
    radius: 27,
    points: 10,
    kind: 'triangle',
  },
  {
    id: 'tri-20',
    x: 252,
    y: 214,
    radius: 27,
    points: 20,
    kind: 'triangle',
  },
  {
    id: 'tri-50',
    x: 192,
    y: 312,
    radius: 30,
    points: 50,
    kind: 'triangle',
  },
  {
    id: 'side-left',
    x: 72,
    y: 368,
    radius: 19,
    points: 15,
    kind: 'side',
  },
  {
    id: 'side-right',
    x: 312,
    y: 368,
    radius: 19,
    points: 15,
    kind: 'side',
  },
];

// 6 candidate hole slots: 2 upper-left, 2 upper-right, 1 lower-left, 1 lower-right.
// During gameplay, 2 random slots are active and rotate every 10s (1 vanish + 1 warp re-entry).
export const TABLE_HOLE_SLOTS: HoleSlotDef[] = [
  {
    id: 'upper-left-1',
    x: 68,
    y: 148,
    radius: 16,
    zone: 'upper-left',
  },
  {
    id: 'upper-left-2',
    x: 58,
    y: 242,
    radius: 16,
    zone: 'upper-left',
  },
  {
    id: 'upper-right-1',
    x: 316,
    y: 148,
    radius: 16,
    zone: 'upper-right',
  },
  {
    id: 'upper-right-2',
    x: 326,
    y: 242,
    radius: 16,
    zone: 'upper-right',
  },
  {
    id: 'lower-left-1',
    x: 46,
    y: 470,
    radius: 17,
    zone: 'lower-left',
  },
  {
    id: 'lower-right-1',
    x: 338,
    y: 470,
    radius: 17,
    zone: 'lower-right',
  },
];

export interface TopReentryPoint {
  id: 'left' | 'center' | 'right';
  label: string;
  x: number;
  y: number;
}

export const TOP_REENTRY_POINTS: TopReentryPoint[] = [
  { id: 'left', label: '左側重進', x: 112, y: 84 },
  { id: 'center', label: '中央重進', x: 192, y: 62 },
  { id: 'right', label: '右側重進', x: 272, y: 84 },
];

const DEG = Math.PI / 180;

export const TABLE_FLIPPERS: FlipperDef[] = [
  {
    side: 'left',
    pivotX: 116,
    pivotY: 614,
    length: 64,
    baseRadius: 10,
    tipRadius: 6,
    restAngle: 26 * DEG,
    activeAngle: -33 * DEG,
  },
  {
    side: 'right',
    pivotX: 268,
    pivotY: 614,
    length: 64,
    baseRadius: 10,
    tipRadius: 6,
    restAngle: 154 * DEG,
    activeAngle: 213 * DEG,
  },
];
