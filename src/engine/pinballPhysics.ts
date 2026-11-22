import { soundEngine } from '../audio/soundEngine';
import {
  BALL_RADIUS,
  BumperDef,
  DRAIN_Y,
  HoleSlotDef,
  LAUNCH_DIVIDER_X,
  LAUNCH_LANE_X,
  PLUNGER_REST_Y,
  SegmentWall,
  TABLE_BUMPERS,
  TABLE_FLIPPERS,
  TABLE_HEIGHT,
  TABLE_HOLE_SLOTS,
  TABLE_WIDTH,
  TOP_REENTRY_POINTS,
  buildTableWalls,
} from './tableGeometry';
import {
  BallPhase,
  DifficultyConfig,
  GameStatsSnapshot,
  HoleKind,
  ThemePalette,
} from '../types/pinball';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface FloatingPopup {
  x: number;
  y: number;
  vy: number;
  text: string;
  subText?: string;
  color: string;
  life: number;
  maxLife: number;
}

interface FlipperState {
  side: 'left' | 'right';
  pivotX: number;
  pivotY: number;
  length: number;
  baseRadius: number;
  tipRadius: number;
  restAngle: number;
  activeAngle: number;
  angle: number;
  prevAngle: number;
  angularVelocity: number;
  pressed: boolean;
}

interface BumperRuntime extends BumperDef {
  hitTimer: number;
  scalePulse: number;
}

interface ActiveHoleRuntime {
  slot: HoleSlotDef;
  kind: HoleKind;
  appearProgress: number;
}

const COMBO_WINDOW_SEC = 2.8;
const HOLE_ROTATION_INTERVAL = 10.0;
const MAX_PARTICLES = 72;

export class PinballSimulation {
  private walls: SegmentWall[] = buildTableWalls();
  private bumpers: BumperRuntime[] = TABLE_BUMPERS.map((b) => ({
    ...b,
    hitTimer: 0,
    scalePulse: 0,
  }));
  private allHoleSlots: HoleSlotDef[] = TABLE_HOLE_SLOTS;
  private activeHoles: ActiveHoleRuntime[] = [];
  private holeSwapTimer = HOLE_ROTATION_INTERVAL;
  private lastHolePairKey = '';

  private flippers: FlipperState[] = TABLE_FLIPPERS.map((f) => ({
    ...f,
    angle: f.restAngle,
    prevAngle: f.restAngle,
    angularVelocity: 0,
    pressed: false,
  }));

  private particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 3,
    life: 0,
    maxLife: 0.4,
    color: '#ffffff',
  }));
  private popups: FloatingPopup[] = [];
  private trail: { x: number; y: number }[] = [];

  // Ball state
  private ballX = LAUNCH_LANE_X;
  private ballY = PLUNGER_REST_Y - BALL_RADIUS;
  private ballVx = 0;
  private ballVy = 0;
  private ballPhase: BallPhase = 'READY_TO_LAUNCH';
  private hasExitedLaunchLane = false;
  private activeHoleTarget: ActiveHoleRuntime | null = null;
  private holeAnimProgress = 0;
  private warpGraceTimer = 0;
  private topPortalFlashTimer = 0;
  private activeTopPortalId: 'left' | 'center' | 'right' | null = null;
  private stallTimer = 0;

  // Plunger charge state
  private isChargingPlunger = false;
  private chargeRatio = 0;
  private chargeDir = 1;

  // Game progress
  private score = 0;
  private ballsRemaining = 3;
  private currentBallNumber = 1;
  private comboCount = 0;
  private comboTimer = 0;
  private maxCombo = 0;
  private lastEventText: string | null = null;

  // Juice & timing
  private hitstopTimer = 0;
  private shakeTimer = 0;
  private shakeMagnitude = 0;
  private ambientTime = 0;

  private difficulty: DifficultyConfig;
  private onStatsChange: (stats: GameStatsSnapshot) => void;
  private onRoundEnd: (finalScore: number, maxCombo: number) => void;
  private lastSnapshotTime = 0;

  constructor(
    difficulty: DifficultyConfig,
    onStatsChange: (stats: GameStatsSnapshot) => void,
    onRoundEnd: (finalScore: number, maxCombo: number) => void
  ) {
    this.difficulty = difficulty;
    this.onStatsChange = onStatsChange;
    this.onRoundEnd = onRoundEnd;
    this.resetRound(difficulty);
  }

  public setDifficulty(difficulty: DifficultyConfig): void {
    this.difficulty = difficulty;
  }

  public resetRound(difficulty?: DifficultyConfig): void {
    if (difficulty) {
      this.difficulty = difficulty;
    }
    this.score = 0;
    this.ballsRemaining = 3;
    this.currentBallNumber = 1;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.lastEventText = null;
    this.popups = [];
    this.particles.forEach((p) => (p.active = false));
    this.hitstopTimer = 0;
    this.shakeTimer = 0;
    this.topPortalFlashTimer = 0;
    this.lastHolePairKey = '';
    this.rotateActiveHoles(false);
    this.prepareNextBall();
    this.emitSnapshot(true);
  }

  private rotateActiveHoles(announce: boolean): void {
    const indices = this.allHoleSlots.map((_, i) => i);
    let firstIdx = 0;
    let secondIdx = 1;

    // Pick 2 distinct random slots, avoiding repeating the exact previous pair
    for (let attempt = 0; attempt < 8; attempt++) {
      const a = indices[Math.floor(Math.random() * indices.length)];
      const remaining = indices.filter((i) => i !== a);
      const b = remaining[Math.floor(Math.random() * remaining.length)];
      const pairKey = [a, b].sort((x, y) => x - y).join('-');
      firstIdx = a;
      secondIdx = b;
      if (pairKey !== this.lastHolePairKey) {
        this.lastHolePairKey = pairKey;
        break;
      }
    }

    // Randomly designate which of the 2 active holes is 'vanish' vs 'warp' (重新迴轉)
    const firstIsWarp = Math.random() < 0.5;
    this.activeHoles = [
      {
        slot: this.allHoleSlots[firstIdx],
        kind: firstIsWarp ? 'warp' : 'vanish',
        appearProgress: 0,
      },
      {
        slot: this.allHoleSlots[secondIdx],
        kind: firstIsWarp ? 'vanish' : 'warp',
        appearProgress: 0,
      },
    ];

    this.holeSwapTimer = HOLE_ROTATION_INTERVAL;

    if (announce) {
      this.lastEventText = '消失洞與迴轉洞位置已更換';
    }
  }

  private prepareNextBall(): void {
    this.ballPhase = 'READY_TO_LAUNCH';
    this.ballX = LAUNCH_LANE_X;
    this.ballY = PLUNGER_REST_Y - BALL_RADIUS;
    this.ballVx = 0;
    this.ballVy = 0;
    this.hasExitedLaunchLane = false;
    this.activeHoleTarget = null;
    this.holeAnimProgress = 0;
    this.warpGraceTimer = 0;
    this.stallTimer = 0;
    this.isChargingPlunger = false;
    this.chargeRatio = 0;
    this.chargeDir = 1;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.trail = [];
  }

  public setFlipperPressed(side: 'left' | 'right', pressed: boolean): void {
    const flipper = this.flippers.find((f) => f.side === side);
    if (!flipper) return;
    if (pressed && !flipper.pressed) {
      soundEngine.playFlipperUp();
    }
    flipper.pressed = pressed;
  }

  public releaseAllInputs(): void {
    this.flippers.forEach((f) => {
      f.pressed = false;
    });
    this.isChargingPlunger = false;
    this.chargeRatio = 0;
  }

  public startPlungerCharge(): void {
    if (this.ballPhase !== 'READY_TO_LAUNCH') return;
    this.isChargingPlunger = true;
    this.chargeDir = 1;
  }

  public releasePlunger(): void {
    if (this.ballPhase !== 'READY_TO_LAUNCH' || !this.isChargingPlunger) return;
    this.isChargingPlunger = false;
    const power = Math.max(0.28, this.chargeRatio);
    this.launchBallWithPower(power);
  }

  public quickLaunch(): void {
    if (this.ballPhase !== 'READY_TO_LAUNCH') return;
    this.isChargingPlunger = false;
    const randomPower = 0.72 + Math.random() * 0.25;
    this.launchBallWithPower(randomPower);
  }

  private launchBallWithPower(powerRatio: number): void {
    const clamped = Math.max(0.2, Math.min(1, powerRatio));
    const speed =
      this.difficulty.plungerMinSpeed +
      (this.difficulty.plungerMaxSpeed - this.difficulty.plungerMinSpeed) * clamped;
    this.ballVy = -speed;
    this.ballVx = (Math.random() - 0.5) * 14;
    this.ballPhase = 'IN_PLAY';
    this.chargeRatio = 0;
    this.lastEventText = '彈珠發射！';
    soundEngine.playLaunch(clamped);
    this.spawnParticles(this.ballX, this.ballY + 6, 10, '#ffffff');
    this.emitSnapshot(true);
  }

  public getComboMultiplier(combo: number = this.comboCount): number {
    if (combo <= 1) return 1;
    if (combo === 2) return 1.5;
    if (combo === 3) return 2;
    if (combo === 4) return 2.5;
    return 3;
  }

  public step(rawDt: number, theme: ThemePalette): void {
    const dt = Math.min(rawDt, 0.05);
    this.ambientTime += dt;

    // Update particles & popups even during hitstop for crisp visual decay
    this.updateEffects(dt);

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    if (this.topPortalFlashTimer > 0) {
      this.topPortalFlashTimer = Math.max(0, this.topPortalFlashTimer - dt);
    }

    if (this.warpGraceTimer > 0) {
      this.warpGraceTimer = Math.max(0, this.warpGraceTimer - dt);
    }

    // Smooth appear animation for active holes
    for (const h of this.activeHoles) {
      if (h.appearProgress < 1) {
        h.appearProgress = Math.min(1, h.appearProgress + dt * 4);
      }
    }

    // Rotate active holes every 10 seconds while playing (avoid swapping mid-capture)
    if (this.ballPhase !== 'VANISHING' && this.ballPhase !== 'WARPING') {
      this.holeSwapTimer -= dt;
      if (this.holeSwapTimer <= 0) {
        this.rotateActiveHoles(true);
      }
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    // Combo decay
    if (this.comboCount > 0 && this.ballPhase === 'IN_PLAY') {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.comboTimer = 0;
      }
    }

    // Update bumpers hit timers
    for (const b of this.bumpers) {
      if (b.hitTimer > 0) {
        b.hitTimer = Math.max(0, b.hitTimer - dt * 5);
      }
      if (b.scalePulse > 0) {
        b.scalePulse = Math.max(0, b.scalePulse - dt * 6);
      }
    }

    // Plunger charge oscillation
    if (this.ballPhase === 'READY_TO_LAUNCH') {
      if (this.isChargingPlunger) {
        this.chargeRatio += this.chargeDir * dt * 1.15;
        if (this.chargeRatio >= 1) {
          this.chargeRatio = 1;
          this.chargeDir = -1;
        } else if (this.chargeRatio <= 0.15) {
          this.chargeRatio = 0.15;
          this.chargeDir = 1;
        }
        this.ballY = PLUNGER_REST_Y - BALL_RADIUS + this.chargeRatio * 24;
      } else {
        this.ballY = PLUNGER_REST_Y - BALL_RADIUS;
      }
      this.emitSnapshot(false);
      return;
    }

    // Vanish hole animation (ends current ball)
    if (this.ballPhase === 'VANISHING' && this.activeHoleTarget) {
      this.holeAnimProgress += dt * 3.8;
      this.ballX += (this.activeHoleTarget.slot.x - this.ballX) * Math.min(1, dt * 14);
      this.ballY += (this.activeHoleTarget.slot.y - this.ballY) * Math.min(1, dt * 14);
      if (this.holeAnimProgress >= 1) {
        this.handleBallEnded('掉入消失洞');
      }
      this.emitSnapshot(false);
      return;
    }

    // Warp re-entry animation (spirals in, then drops back from top center)
    if (this.ballPhase === 'WARPING' && this.activeHoleTarget) {
      this.holeAnimProgress += dt * 3.2;
      this.ballX += (this.activeHoleTarget.slot.x - this.ballX) * Math.min(1, dt * 16);
      this.ballY += (this.activeHoleTarget.slot.y - this.ballY) * Math.min(1, dt * 16);
      if (this.holeAnimProgress >= 1) {
        this.completeWarpReentry(theme);
      }
      this.emitSnapshot(false);
      return;
    }

    if (this.ballPhase !== 'IN_PLAY') {
      return;
    }

    // Physics substeps for accurate flipper & wall collisions
    const substeps = 8;
    const subDt = dt / substeps;

    for (let s = 0; s < substeps; s++) {
      this.stepFlippers(subDt);
      this.stepBall(subDt, theme);
      if (this.ballPhase !== 'IN_PLAY') break;
    }

    // Record motion trail
    this.trail.unshift({ x: this.ballX, y: this.ballY });
    if (this.trail.length > 8) {
      this.trail.pop();
    }

    // Anti-stall safeguard: if ball barely moves in main playfield for 1.4s, give a gentle nudge
    if (this.hasExitedLaunchLane && this.ballPhase === 'IN_PLAY') {
      const speedSq = this.ballVx * this.ballVx + this.ballVy * this.ballVy;
      if (speedSq < 35 * 35) {
        this.stallTimer += dt;
        if (this.stallTimer > 1.4) {
          this.ballVx += (Math.random() > 0.5 ? 1 : -1) * 140;
          this.ballVy -= 120;
          this.stallTimer = 0;
        }
      } else {
        this.stallTimer = 0;
      }
    }

    this.emitSnapshot(false);
  }

  private completeWarpReentry(theme: ThemePalette): void {
    const exitPoint =
      TOP_REENTRY_POINTS[Math.floor(Math.random() * TOP_REENTRY_POINTS.length)];
    const offsetX = (Math.random() - 0.5) * 18;
    this.ballX = exitPoint.x + offsetX;
    this.ballY = exitPoint.y;

    // Angle velocity slightly toward playfield center while keeping lively randomness
    const inwardBias = exitPoint.id === 'left' ? 55 : exitPoint.id === 'right' ? -55 : 0;
    this.ballVx = inwardBias + (Math.random() - 0.5) * 140;
    this.ballVy = 155 + Math.random() * 75;
    this.ballPhase = 'IN_PLAY';
    this.activeHoleTarget = null;
    this.holeAnimProgress = 0;
    this.warpGraceTimer = 0.45;
    this.topPortalFlashTimer = 0.7;
    this.activeTopPortalId = exitPoint.id;
    this.trail = [];
    this.stallTimer = 0;
    this.lastEventText = `迴轉重進！彈珠從上方${exitPoint.id === 'left' ? '左側' : exitPoint.id === 'right' ? '右側' : '中央'}落下`;
    this.spawnParticles(this.ballX, this.ballY, 14, theme.warpRim);
    this.popups.push({
      x: this.ballX,
      y: this.ballY + 26,
      vy: 24,
      text: `${exitPoint.label}！`,
      color: theme.warpOuter,
      life: 0.85,
      maxLife: 0.85,
    });
    this.emitSnapshot(true);
  }

  private stepFlippers(subDt: number): void {
    const speed = this.difficulty.flipperSpeed;
    for (const f of this.flippers) {
      f.prevAngle = f.angle;
      const target = f.pressed ? f.activeAngle : f.restAngle;
      const diff = target - f.angle;
      const maxDelta = speed * subDt;
      if (Math.abs(diff) <= maxDelta) {
        f.angle = target;
      } else {
        f.angle += Math.sign(diff) * maxDelta;
      }
      f.angularVelocity = (f.angle - f.prevAngle) / subDt;
    }
  }

  private stepBall(subDt: number, theme: ThemePalette): void {
    // Gravity
    this.ballVy += this.difficulty.gravity * subDt;

    // Slight air drag
    this.ballVx *= 1 - 0.04 * subDt;
    this.ballVy *= 1 - 0.04 * subDt;

    // Clamp max ball velocity
    const speed = Math.hypot(this.ballVx, this.ballVy);
    if (speed > this.difficulty.maxBallSpeed) {
      const scale = this.difficulty.maxBallSpeed / speed;
      this.ballVx *= scale;
      this.ballVy *= scale;
    }

    // Integrate position
    this.ballX += this.ballVx * subDt;
    this.ballY += this.ballVy * subDt;

    // Track when ball exits launch lane into main playfield
    if (!this.hasExitedLaunchLane && this.ballX < LAUNCH_DIVIDER_X - BALL_RADIUS - 2) {
      this.hasExitedLaunchLane = true;
    }

    // One-way launch gate: block ball from re-entering launch lane once it has exited
    if (this.hasExitedLaunchLane) {
      const gateWall: SegmentWall = {
        x1: LAUNCH_DIVIDER_X,
        y1: 72,
        x2: LAUNCH_DIVIDER_X,
        y2: 175,
      };
      this.collideWall(gateWall, true);
    }

    // Collide with static table walls
    for (const wall of this.walls) {
      this.collideWall(wall, false);
    }

    // Collide with bumpers
    for (const bumper of this.bumpers) {
      this.collideBumper(bumper, theme);
    }

    // Collide with flippers
    for (const flipper of this.flippers) {
      this.collideFlipper(flipper);
    }

    // Check the 2 currently active holes (only once in main playfield and outside warp grace)
    if (this.hasExitedLaunchLane && this.warpGraceTimer <= 0) {
      for (const hole of this.activeHoles) {
        const dist = Math.hypot(this.ballX - hole.slot.x, this.ballY - hole.slot.y);
        if (dist < hole.slot.radius + 1) {
          this.activeHoleTarget = hole;
          this.holeAnimProgress = 0;
          this.ballVx = 0;
          this.ballVy = 0;

          if (hole.kind === 'warp') {
            // Re-entry vortex hole: keep ball alive and warp to top!
            this.ballPhase = 'WARPING';
            this.lastEventText = '進入迴轉洞！即將從上方重進';
            soundEngine.playWarpReentry();
            this.spawnParticles(hole.slot.x, hole.slot.y, 14, theme.warpRim);
            this.popups.push({
              x: hole.slot.x,
              y: hole.slot.y - 18,
              vy: -34,
              text: '迴轉洞',
              color: theme.warpOuter,
              life: 0.8,
              maxLife: 0.8,
            });
          } else {
            // Vanish hole: ends current ball immediately
            this.ballPhase = 'VANISHING';
            this.comboCount = 0;
            this.comboTimer = 0;
            this.lastEventText = '彈珠落入消失洞！';
            soundEngine.playVanishHole();
            this.spawnParticles(hole.slot.x, hole.slot.y, 14, theme.sinkholeRim);
            this.popups.push({
              x: hole.slot.x,
              y: hole.slot.y - 18,
              vy: -34,
              text: '消失洞',
              color: theme.sinkholeOuter,
              life: 0.9,
              maxLife: 0.9,
            });
          }

          this.emitSnapshot(true);
          return;
        }
      }
    }

    // Check bottom drain (between/below flippers)
    if (this.ballY > DRAIN_Y) {
      if (!this.hasExitedLaunchLane) {
        this.ballY = PLUNGER_REST_Y - BALL_RADIUS;
        this.ballPhase = 'READY_TO_LAUNCH';
        this.ballVx = 0;
        this.ballVy = 0;
      } else {
        soundEngine.playBallDrain();
        this.handleBallEnded('彈珠掉落出界');
      }
    }
  }

  private collideWall(wall: SegmentWall, onlyFromLeft: boolean): void {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return;

    const t = Math.max(
      0,
      Math.min(1, ((this.ballX - wall.x1) * dx + (this.ballY - wall.y1) * dy) / lenSq)
    );
    const closestX = wall.x1 + t * dx;
    const closestY = wall.y1 + t * dy;

    const distX = this.ballX - closestX;
    const distY = this.ballY - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq >= BALL_RADIUS * BALL_RADIUS || distSq === 0) return;

    if (onlyFromLeft && this.ballX > wall.x1) return;

    const dist = Math.sqrt(distSq);
    const nx = distX / dist;
    const ny = distY / dist;

    // Push ball outside wall
    const overlap = BALL_RADIUS - dist;
    this.ballX += nx * overlap;
    this.ballY += ny * overlap;

    const vn = this.ballVx * nx + this.ballVy * ny;
    if (vn < 0) {
      const restitution = this.difficulty.wallRestitution;
      this.ballVx -= (1 + restitution) * vn * nx;
      this.ballVy -= (1 + restitution) * vn * ny;
      if (Math.abs(vn) > 150) {
        soundEngine.playWallTap(Math.abs(vn));
      }
    }
  }

  private collideBumper(bumper: BumperRuntime, theme: ThemePalette): void {
    const dx = this.ballX - bumper.x;
    const dy = this.ballY - bumper.y;
    const minDist = BALL_RADIUS + bumper.radius;
    const distSq = dx * dx + dy * dy;

    if (distSq >= minDist * minDist || distSq === 0) return;

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;

    // Separate ball cleanly
    this.ballX = bumper.x + nx * (minDist + 0.5);
    this.ballY = bumper.y + ny * (minDist + 0.5);

    // Apply difficulty-specific bumper impulse
    const impulse =
      bumper.kind === 'triangle'
        ? this.difficulty.triangleBumperImpulse
        : this.difficulty.sideBumperImpulse;

    const vn = this.ballVx * nx + this.ballVy * ny;
    if (vn < 0) {
      this.ballVx -= 1.8 * vn * nx;
      this.ballVy -= 1.8 * vn * ny;
    }
    const postSpeed = Math.hypot(this.ballVx, this.ballVy);
    const targetSpeed = Math.max(postSpeed, impulse);
    this.ballVx = nx * targetSpeed;
    this.ballVy = ny * targetSpeed;

    // Prevent rapid double-hit within same bumper pulse
    if (bumper.hitTimer < 0.72) {
      bumper.hitTimer = 1;
      bumper.scalePulse = 1;

      // Combo & scoring logic
      this.comboCount += 1;
      this.comboTimer = COMBO_WINDOW_SEC;
      if (this.comboCount > this.maxCombo) {
        this.maxCombo = this.comboCount;
      }

      const multiplier = this.getComboMultiplier(this.comboCount);
      const earned = Math.round(bumper.points * multiplier);
      this.score += earned;

      const popupColor =
        bumper.points === 50
          ? theme.bumper50Fill
          : bumper.points === 20
            ? theme.bumper20Stroke
            : bumper.kind === 'side'
              ? theme.sideBumperStroke
              : theme.accent;

      this.popups.push({
        x: bumper.x,
        y: bumper.y - bumper.radius - 6,
        vy: -48,
        text: `+${earned}`,
        subText: this.comboCount >= 2 ? `連擊 ×${multiplier}` : undefined,
        color: popupColor,
        life: 0.85,
        maxLife: 0.85,
      });

      this.lastEventText =
        this.comboCount >= 2
          ? `連續撞擊 ×${multiplier} (+${earned})`
          : `命中 ${bumper.points} 分撞擊點`;

      if (bumper.kind === 'triangle') {
        soundEngine.playTriangleBumper(bumper.points, this.comboCount);
        this.spawnParticles(bumper.x, bumper.y, bumper.points === 50 ? 16 : 11, popupColor);
        if (bumper.points === 50 || this.comboCount >= 3) {
          this.hitstopTimer = 0.032;
          this.shakeTimer = 0.14;
          this.shakeMagnitude = bumper.points === 50 ? 3.5 : 2.2;
        }
      } else {
        soundEngine.playSideBumper();
        this.spawnParticles(bumper.x, bumper.y, 8, theme.sideBumperStroke);
      }

      this.emitSnapshot(true);
    }
  }

  private collideFlipper(flipper: FlipperState): void {
    const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
    const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length;

    const dx = tipX - flipper.pivotX;
    const dy = tipY - flipper.pivotY;
    const lenSq = dx * dx + dy * dy;
    const t = Math.max(
      0,
      Math.min(1, ((this.ballX - flipper.pivotX) * dx + (this.ballY - flipper.pivotY) * dy) / lenSq)
    );

    const closestX = flipper.pivotX + t * dx;
    const closestY = flipper.pivotY + t * dy;
    const flipperRadius = flipper.baseRadius + (flipper.tipRadius - flipper.baseRadius) * t;
    const minDist = BALL_RADIUS + flipperRadius;

    const distX = this.ballX - closestX;
    const distY = this.ballY - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq >= minDist * minDist || distSq === 0) return;

    const dist = Math.sqrt(distSq);
    const nx = distX / dist;
    const ny = distY / dist;

    // Push ball out of flipper capsule
    this.ballX = closestX + nx * (minDist + 0.5);
    this.ballY = closestY + ny * (minDist + 0.5);

    const rx = closestX - flipper.pivotX;
    const ry = closestY - flipper.pivotY;
    const contactVx = -flipper.angularVelocity * ry;
    const contactVy = flipper.angularVelocity * rx;

    const relVx = this.ballVx - contactVx;
    const relVy = this.ballVy - contactVy;
    const relVn = relVx * nx + relVy * ny;

    if (relVn < 0) {
      const isSwingingUp =
        (flipper.side === 'left' && flipper.angularVelocity < -0.5) ||
        (flipper.side === 'right' && flipper.angularVelocity > 0.5);

      const restitution = isSwingingUp ? 0.85 : 0.48;
      this.ballVx -= (1 + restitution) * relVn * nx;
      this.ballVy -= (1 + restitution) * relVn * ny;

      if (isSwingingUp) {
        const leverage = 0.45 + 0.55 * t;
        const kick = this.difficulty.flipperBoost * leverage;
        this.ballVx += nx * kick * 0.48;
        this.ballVy -= Math.abs(ny) * kick + 140 * leverage;
      }

      // Reset consecutive bumper combo when ball touches a flipper
      this.comboCount = 0;
      this.comboTimer = 0;
    }
  }

  private handleBallEnded(reason: string): void {
    this.ballsRemaining -= 1;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.lastEventText = reason;

    if (this.ballsRemaining <= 0) {
      this.ballPhase = 'DRAINED';
      this.emitSnapshot(true);
      this.onRoundEnd(this.score, this.maxCombo);
    } else {
      this.currentBallNumber += 1;
      this.prepareNextBall();
      this.emitSnapshot(true);
    }
  }

  private spawnParticles(x: number, y: number, count: number, color: string): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 170;
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.radius = 2.5 + Math.random() * 3.5;
        p.maxLife = 0.32 + Math.random() * 0.25;
        p.life = p.maxLife;
        p.color = color;
        spawned += 1;
        if (spawned >= count) break;
      }
    }
  }

  private updateEffects(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.5 * dt;
      p.vy *= 1 - 2.5 * dt;
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life -= dt;
      pop.y += pop.vy * dt;
      if (pop.life <= 0) {
        this.popups.splice(i, 1);
      }
    }
  }

  private emitSnapshot(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastSnapshotTime < 80) return;
    this.lastSnapshotTime = now;
    this.onStatsChange({
      score: this.score,
      ballsRemaining: this.ballsRemaining,
      currentBallNumber: this.currentBallNumber,
      comboCount: this.comboCount,
      comboMultiplier: this.getComboMultiplier(this.comboCount),
      maxCombo: this.maxCombo,
      ballPhase: this.ballPhase,
      chargeRatio: this.chargeRatio,
      holeSwapRemainingSec: Math.max(0, Math.ceil(this.holeSwapTimer)),
      lastEventText: this.lastEventText,
    });
  }

  public render(ctx: CanvasRenderingContext2D, theme: ThemePalette): void {
    ctx.save();

    if (this.shakeTimer > 0) {
      const decay = this.shakeTimer / 0.14;
      const sx = (Math.random() - 0.5) * 2 * this.shakeMagnitude * decay;
      const sy = (Math.random() - 0.5) * 2 * this.shakeMagnitude * decay;
      ctx.translate(sx, sy);
    }

    // 1. Soft pastel gradient playfield background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, TABLE_HEIGHT);
    bgGrad.addColorStop(0, theme.tableBgTop);
    bgGrad.addColorStop(1, theme.tableBgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // 2. Theme-specific light background pattern motifs
    this.renderPastelBackgroundArt(ctx, theme);

    // 3. Launch lane background tint
    ctx.fillStyle = theme.laneBg;
    ctx.fillRect(LAUNCH_DIVIDER_X, 165, TABLE_WIDTH - LAUNCH_DIVIDER_X - 18, TABLE_HEIGHT - 195);

    // 4. Inverted triangle geometric guide connecting the 3 center bumpers
    const tri10 = this.bumpers[0];
    const tri20 = this.bumpers[1];
    const tri50 = this.bumpers[2];
    ctx.save();
    ctx.strokeStyle = theme.tableWallStroke;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(tri10.x, tri10.y);
    ctx.lineTo(tri20.x, tri20.y);
    ctx.lineTo(tri50.x, tri50.y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // 5. One-way gate indicator at launch lane exit
    ctx.save();
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.38;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(LAUNCH_DIVIDER_X, 82);
    ctx.lineTo(LAUNCH_DIVIDER_X, 174);
    ctx.stroke();
    ctx.restore();

    // 6. Table walls & rails
    ctx.save();
    ctx.strokeStyle = theme.tableWallStroke;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const wall of this.walls) {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }
    ctx.restore();

    // 7. Bottom center drain visual cue
    ctx.save();
    ctx.fillStyle = theme.tablePattern;
    ctx.fillRect(156, 672, 72, 48);
    ctx.fillStyle = theme.textMuted;
    ctx.globalAlpha = 0.55;
    ctx.font = '600 10px "Plus Jakarta Sans", "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('出界區', 192, 704);
    ctx.restore();

    // 8. Top re-entry portal indicator (subtle arch halo + flash when ball drops back in)
    this.renderTopReentryPortal(ctx, theme);

    // 9. Active 2 dynamic holes (1 Vanish Hole + 1 Re-entry Warp Hole, rotating every 10s)
    for (const hole of this.activeHoles) {
      this.renderActiveHole(ctx, hole, theme);
    }

    // 10. Plunger spring in right launch lane
    this.renderPlunger(ctx, theme);

    // 11. Bumpers (Inverted triangle 10/20/50 + moderate side bumpers)
    for (const bumper of this.bumpers) {
      this.renderBumper(ctx, bumper, theme);
    }

    // 12. Flippers
    for (const flipper of this.flippers) {
      this.renderFlipper(ctx, flipper, theme);
    }

    // 13. Ball trail & ball
    this.renderBall(ctx, theme);

    // 14. Particles & floating score popups
    this.renderParticlesAndPopups(ctx);

    ctx.restore();
  }

  private renderPastelBackgroundArt(ctx: CanvasRenderingContext2D, theme: ThemePalette): void {
    ctx.save();
    ctx.fillStyle = theme.tablePattern;
    ctx.strokeStyle = theme.tablePattern;

    const drawHeart = (cx: number, cy: number, size: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + size * 0.35);
      ctx.bezierCurveTo(
        cx - size,
        cy - size * 0.35,
        cx - size * 0.55,
        cy - size,
        cx,
        cy - size * 0.35
      );
      ctx.bezierCurveTo(
        cx + size * 0.55,
        cy - size,
        cx + size,
        cy - size * 0.35,
        cx,
        cy + size * 0.35
      );
      ctx.stroke();
    };

    const drawFourPointStar = (cx: number, cy: number, s: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.quadraticCurveTo(cx, cy, cx + s, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy + s);
      ctx.quadraticCurveTo(cx, cy, cx - s, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy - s);
      ctx.fill();
    };

    if (theme.id === 'sakura') {
      // Sweet: Sakura blossoms, soft pastel hearts & sugar sparkles
      const centers = [
        { x: 96, y: 120, r: 40 },
        { x: 290, y: 136, r: 32 },
        { x: 192, y: 462, r: 58 },
      ];
      for (const c of centers) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + this.ambientTime * 0.08;
          ctx.beginPath();
          ctx.ellipse(
            c.x + Math.cos(a) * (c.r * 0.42),
            c.y + Math.sin(a) * (c.r * 0.42),
            c.r * 0.34,
            c.r * 0.18,
            a,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      ctx.lineWidth = 2;
      drawHeart(102, 524, 18);
      drawHeart(282, 524, 18);
      drawFourPointStar(192, 112, 11);
    } else if (theme.id === 'peach') {
      // Sweet: Candy swirl lollipops, pastel hearts & sweet sparkles
      ctx.lineWidth = 2.2;
      const drawLollipop = (cx: number, cy: number, r: number) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3.5; a += 0.35) {
          const sr = (a / (Math.PI * 3.5)) * (r * 0.8);
          const px = cx + Math.cos(a) * sr;
          const py = cy + Math.sin(a) * sr;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy + r);
        ctx.lineTo(cx, cy + r + 24);
        ctx.stroke();
      };
      drawLollipop(192, 466, 26);
      drawHeart(102, 128, 19);
      drawHeart(282, 128, 19);
      drawFourPointStar(112, 515, 10);
      drawFourPointStar(272, 515, 10);
    } else if (theme.id === 'seasalt') {
      // Space: Ringed planet, crescent moon, dotted orbits & stars
      ctx.lineWidth = 2.2;
      // Ringed planet at center lower field
      ctx.beginPath();
      ctx.arc(192, 466, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(192, 466, 56, 15, -0.32, 0, Math.PI * 2);
      ctx.stroke();
      // Orbiting moon dot
      const moonA = this.ambientTime * 0.5;
      ctx.beginPath();
      ctx.arc(192 + Math.cos(moonA) * 56, 466 + Math.sin(moonA) * 15, 4.5, 0, Math.PI * 2);
      ctx.fill();
      // Crescent moon top-left
      ctx.beginPath();
      ctx.arc(102, 122, 18, 0.4, Math.PI * 1.65);
      ctx.arc(110, 118, 15, Math.PI * 1.5, 0.55, true);
      ctx.closePath();
      ctx.fill();
      // Stars top-right
      drawFourPointStar(278, 122, 13);
      drawFourPointStar(250, 146, 7);
    } else if (theme.id === 'cloud') {
      // Space: Mini rocket, constellation lines & nebula rings
      ctx.lineWidth = 2;
      // Constellation upper arch
      const pts = [
        { x: 86, y: 126 },
        { x: 128, y: 102 },
        { x: 192, y: 118 },
        { x: 256, y: 102 },
        { x: 298, y: 128 },
      ];
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      pts.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
      pts.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      // Minimalist rocket at center-bottom
      ctx.beginPath();
      ctx.moveTo(192, 422);
      ctx.quadraticCurveTo(214, 448, 208, 488);
      ctx.lineTo(176, 488);
      ctx.quadraticCurveTo(170, 448, 192, 422);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(192, 456, 7, 0, Math.PI * 2);
      ctx.stroke();
      // Rocket fins
      ctx.beginPath();
      ctx.moveTo(176, 474);
      ctx.lineTo(164, 494);
      ctx.lineTo(177, 488);
      ctx.moveTo(208, 474);
      ctx.lineTo(220, 494);
      ctx.lineTo(207, 488);
      ctx.stroke();
    } else if (theme.id === 'mint') {
      // Science: Atomic orbitals, hexagonal benzene molecule & electron dots
      ctx.lineWidth = 2;
      // Atom at lower center
      ctx.beginPath();
      ctx.arc(192, 466, 8, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const rot = (i * Math.PI) / 3 + this.ambientTime * 0.15;
        ctx.beginPath();
        ctx.ellipse(192, 466, 54, 19, rot, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Benzene hexagon top-left & top-right
      const drawHex = (cx: number, cy: number, r: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      };
      drawHex(102, 126, 22);
      drawHex(282, 126, 22);
    } else if (theme.id === 'lemon') {
      // Science: Harmonic sine waves, laboratory Erlenmeyer flask & fizz bubbles
      ctx.lineWidth = 2.2;
      // Sine wave across upper playfield
      ctx.beginPath();
      for (let x = 44; x <= 340; x += 8) {
        const y = 122 + Math.sin(x * 0.045 + this.ambientTime * 1.1) * 14;
        if (x === 44) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Erlenmeyer flask silhouette at lower center
      ctx.beginPath();
      ctx.moveTo(182, 424);
      ctx.lineTo(202, 424);
      ctx.moveTo(185, 424);
      ctx.lineTo(185, 444);
      ctx.lineTo(162, 488);
      ctx.quadraticCurveTo(160, 496, 170, 496);
      ctx.lineTo(214, 496);
      ctx.quadraticCurveTo(224, 496, 222, 488);
      ctx.lineTo(199, 444);
      ctx.lineTo(199, 424);
      ctx.stroke();
      // Effervescent bubbles rising
      [186, 196, 190].forEach((bx, idx) => {
        const by = 456 - ((idx * 14 + this.ambientTime * 14) % 36);
        ctx.beginPath();
        ctx.arc(bx, by, 3.5 + (idx % 2) * 2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (theme.id === 'lavender') {
      // Fantasy: Arcane magic circle, enchanted hexagram & fairy sparkles
      ctx.lineWidth = 2;
      const mx = 192;
      const my = 466;
      const rot = this.ambientTime * 0.14;
      ctx.beginPath();
      ctx.arc(mx, my, 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(mx, my, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // Dual overlapping mystic triangles
      for (let t = 0; t < 2; t++) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = rot + (i * Math.PI * 2) / 3 + t * Math.PI;
          const px = mx + Math.cos(a) * 42;
          const py = my + Math.sin(a) * 42;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      drawFourPointStar(98, 122, 16);
      drawFourPointStar(286, 122, 16);
      drawFourPointStar(192, 108, 10);
    } else {
      // Fantasy (Apricot): Celestial astrolabe rings & floating crystal diamonds
      ctx.lineWidth = 2.2;
      for (let r = 28; r <= 60; r += 16) {
        ctx.beginPath();
        ctx.arc(192, 466, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      const drawCrystal = (cx: number, cy: number, w: number, h: number) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - h);
        ctx.lineTo(cx + w, cy);
        ctx.lineTo(cx, cy + h);
        ctx.lineTo(cx - w, cy);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - w, cy);
        ctx.lineTo(cx + w, cy);
        ctx.moveTo(cx, cy - h);
        ctx.lineTo(cx, cy + h);
        ctx.stroke();
      };
      drawCrystal(100, 124, 15, 24);
      drawCrystal(284, 124, 15, 24);
      drawFourPointStar(192, 114, 12);
    }
    ctx.restore();
  }

  private renderTopReentryPortal(ctx: CanvasRenderingContext2D, theme: ThemePalette): void {
    ctx.save();
    for (const pt of TOP_REENTRY_POINTS) {
      const isFlashing =
        this.topPortalFlashTimer > 0 && this.activeTopPortalId === pt.id;
      const alpha = isFlashing ? 0.35 + (this.topPortalFlashTimer / 0.7) * 0.65 : 0.24;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = theme.warpRim;
      ctx.lineWidth = isFlashing ? 3 : 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isFlashing ? 21 : 13, 0, Math.PI * 2);
      ctx.stroke();

      if (isFlashing) {
        ctx.fillStyle = theme.warpInner;
        ctx.globalAlpha = (this.topPortalFlashTimer / 0.7) * 0.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 19, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private renderActiveHole(
    ctx: CanvasRenderingContext2D,
    hole: ActiveHoleRuntime,
    theme: ThemePalette
  ): void {
    const { slot, kind, appearProgress } = hole;
    const scale = 0.45 + 0.55 * appearProgress;
    const r = slot.radius * scale;
    const countdownRatio = Math.max(0, Math.min(1, this.holeSwapTimer / HOLE_ROTATION_INTERVAL));

    ctx.save();
    ctx.globalAlpha = appearProgress;

    if (kind === 'warp') {
      // Re-entry warp hole (迴轉洞)
      // 10s countdown ring outside the portal
      ctx.strokeStyle = theme.warpRim;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        slot.x,
        slot.y,
        r + 5,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * countdownRatio
      );
      ctx.stroke();

      const grad = ctx.createRadialGradient(slot.x, slot.y, 2, slot.x, slot.y, r);
      grad.addColorStop(0, theme.warpInner);
      grad.addColorStop(1, theme.warpOuter);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Luminous spiral ring
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      const rot = this.ambientTime * 3.4;
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, r * 0.6, rot, rot + Math.PI * 1.15);
      ctx.stroke();

      // Upward warp arrow icon inside center
      ctx.strokeStyle = theme.warpOuter;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(slot.x, slot.y + 4);
      ctx.lineTo(slot.x, slot.y - 4);
      ctx.moveTo(slot.x - 3.5, slot.y - 1);
      ctx.lineTo(slot.x, slot.y - 4.5);
      ctx.lineTo(slot.x + 3.5, slot.y - 1);
      ctx.stroke();

      ctx.fillStyle = theme.warpOuter;
      ctx.font = '700 9.5px "Plus Jakarta Sans", "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('迴轉重進', slot.x, slot.y + r + 15);
    } else {
      // Vanish hole (消失洞)
      // 10s countdown ring outside the rim
      ctx.strokeStyle = theme.sinkholeRim;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        slot.x,
        slot.y,
        r + 5,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * countdownRatio
      );
      ctx.stroke();

      const grad = ctx.createRadialGradient(slot.x, slot.y, 2, slot.x, slot.y, r);
      grad.addColorStop(0, theme.sinkholeInner);
      grad.addColorStop(1, theme.sinkholeOuter);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1.8;
      const rot = -this.ambientTime * 2.2;
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, r * 0.58, rot, rot + Math.PI * 0.85);
      ctx.stroke();

      ctx.fillStyle = theme.textMuted;
      ctx.font = '700 9.5px "Plus Jakarta Sans", "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('消失洞', slot.x, slot.y + r + 15);
    }

    ctx.restore();
  }

  private renderPlunger(ctx: CanvasRenderingContext2D, theme: ThemePalette): void {
    const compression = this.ballPhase === 'READY_TO_LAUNCH' ? this.chargeRatio * 24 : 0;
    const topY = PLUNGER_REST_Y + compression;
    const bottomY = 688;
    const centerX = LAUNCH_LANE_X;

    ctx.save();
    ctx.strokeStyle = theme.tableWallStroke;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const coils = 5;
    const span = Math.max(8, bottomY - topY - 6);
    ctx.moveTo(centerX, bottomY);
    for (let i = 1; i <= coils; i++) {
      const y = bottomY - (i / coils) * span;
      const xOff = i % 2 === 0 ? -8 : 8;
      ctx.lineTo(centerX + xOff, y);
    }
    ctx.lineTo(centerX, topY + 6);
    ctx.stroke();

    ctx.fillStyle = this.isChargingPlunger ? theme.accent : theme.tableWallStroke;
    ctx.beginPath();
    ctx.roundRect(centerX - 12, topY, 24, 8, 4);
    ctx.fill();

    if (this.ballPhase === 'READY_TO_LAUNCH' && this.chargeRatio > 0.02) {
      ctx.fillStyle = theme.accent;
      ctx.globalAlpha = 0.85;
      const barH = 44 * this.chargeRatio;
      ctx.beginPath();
      ctx.roundRect(centerX - 3, PLUNGER_REST_Y - 58 + (44 - barH), 6, barH, 3);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderBumper(
    ctx: CanvasRenderingContext2D,
    b: BumperRuntime,
    theme: ThemePalette
  ): void {
    const scale = 1 + b.scalePulse * 0.16;
    const r = b.radius * scale;

    let fill = theme.bumper10Fill;
    let stroke = theme.bumper10Stroke;
    let textColor = theme.textPrimary;

    if (b.kind === 'side') {
      fill = theme.sideBumperFill;
      stroke = theme.sideBumperStroke;
    } else if (b.points === 20) {
      fill = theme.bumper20Fill;
      stroke = theme.bumper20Stroke;
    } else if (b.points === 50) {
      fill = theme.bumper50Fill;
      stroke = theme.bumper50Stroke;
      textColor = '#FFFFFF';
    }

    ctx.save();

    if (b.hitTimer > 0) {
      ctx.strokeStyle = stroke;
      ctx.globalAlpha = b.hitTimer * 0.55;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r + (1 - b.hitTimer) * 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.beginPath();
    ctx.arc(b.x, b.y + 3, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = b.points === 50 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (b.kind === 'triangle') {
      ctx.font = '700 15px "JetBrains Mono", monospace';
      ctx.fillText(String(b.points), b.x, b.y + 0.5);
    } else {
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText(String(b.points), b.x, b.y + 0.5);
    }

    ctx.restore();
  }

  private renderFlipper(
    ctx: CanvasRenderingContext2D,
    f: FlipperState,
    theme: ThemePalette
  ): void {
    const tipX = f.pivotX + Math.cos(f.angle) * f.length;
    const tipY = f.pivotY + Math.sin(f.angle) * f.length;

    ctx.save();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.lineWidth = f.baseRadius * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.pivotX, f.pivotY + 3);
    ctx.lineTo(tipX, tipY + 3);
    ctx.stroke();

    ctx.strokeStyle = theme.flipperStroke;
    ctx.lineWidth = f.baseRadius * 2 + 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.pivotX, f.pivotY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.strokeStyle = theme.flipperFill;
    ctx.lineWidth = f.baseRadius * 2 - 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.pivotX, f.pivotY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(f.pivotX, f.pivotY, 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderBall(ctx: CanvasRenderingContext2D, theme: ThemePalette): void {
    if (this.ballPhase === 'DRAINED') return;

    const shrink =
      this.ballPhase === 'VANISHING' || this.ballPhase === 'WARPING'
        ? Math.max(0.05, 1 - this.holeAnimProgress)
        : 1;
    const r = BALL_RADIUS * shrink;

    ctx.save();

    if (this.ballPhase === 'IN_PLAY') {
      for (let i = 1; i < this.trail.length; i++) {
        const pt = this.trail[i];
        const alpha = (1 - i / this.trail.length) * 0.24;
        ctx.fillStyle = theme.accent;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, BALL_RADIUS * (1 - i * 0.08), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = theme.ballShadow;
    ctx.beginPath();
    ctx.arc(this.ballX + 1.5, this.ballY + 3, r, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(
      this.ballX - r * 0.32,
      this.ballY - r * 0.35,
      r * 0.12,
      this.ballX,
      this.ballY,
      r
    );
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.65, theme.ballHighlight);
    grad.addColorStop(1, theme.tableWallStroke);

    ctx.fillStyle = grad;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private renderParticlesAndPopups(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const pop of this.popups) {
      const alpha = Math.min(1, (pop.life / pop.maxLife) * 1.4);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.textAlign = 'center';
      ctx.fillStyle = pop.color;
      ctx.font = '700 15px "JetBrains Mono", "Noto Sans TC", sans-serif';
      ctx.fillText(pop.text, pop.x, pop.y);
      if (pop.subText) {
        ctx.font = '700 11px "Plus Jakarta Sans", "Noto Sans TC", sans-serif';
        ctx.fillText(pop.subText, pop.x, pop.y - 16);
      }
    }
    ctx.restore();
  }
}
