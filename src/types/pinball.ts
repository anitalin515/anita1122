export type GamePhase = 'SETUP' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type DifficultyId = 'easy' | 'normal' | 'hard';

export type ThemeId =
  | 'sakura'
  | 'seasalt'
  | 'mint'
  | 'apricot'
  | 'lavender'
  | 'lemon'
  | 'cloud'
  | 'peach';

export type Gender = 'male' | 'female' | 'other';

export type BallPhase = 'READY_TO_LAUNCH' | 'IN_PLAY' | 'VANISHING' | 'WARPING' | 'DRAINED';

export type HoleKind = 'vanish' | 'warp';

export interface PlayerProfile {
  name: string;
  gender: Gender;
}

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  subtitle: string;
  gravity: number;
  triangleBumperImpulse: number;
  sideBumperImpulse: number;
  wallRestitution: number;
  flipperSpeed: number;
  flipperBoost: number;
  maxBallSpeed: number;
  plungerMaxSpeed: number;
  plungerMinSpeed: number;
}

export interface ThemePalette {
  id: ThemeId;
  name: string;
  motifLabel: string;
  englishName: string;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  tableBgTop: string;
  tableBgBottom: string;
  tablePattern: string;
  tableWall: string;
  tableWallStroke: string;
  laneBg: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentText: string;
  bumper10Fill: string;
  bumper10Stroke: string;
  bumper20Fill: string;
  bumper20Stroke: string;
  bumper50Fill: string;
  bumper50Stroke: string;
  sideBumperFill: string;
  sideBumperStroke: string;
  flipperFill: string;
  flipperStroke: string;
  ballFill: string;
  ballHighlight: string;
  ballShadow: string;
  sinkholeOuter: string;
  sinkholeInner: string;
  sinkholeRim: string;
  warpOuter: string;
  warpInner: string;
  warpRim: string;
  textPrimary: string;
  textMuted: string;
  swatchColor: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  gender: Gender;
  score: number;
  maxCombo: number;
  difficulty: DifficultyId;
  createdAt: number;
}

export interface AudioSettings {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
}

export interface GameStatsSnapshot {
  score: number;
  ballsRemaining: number;
  currentBallNumber: number;
  comboCount: number;
  comboMultiplier: number;
  maxCombo: number;
  ballPhase: BallPhase;
  chargeRatio: number;
  holeSwapRemainingSec: number;
  lastEventText: string | null;
}
