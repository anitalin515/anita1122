import { DifficultyConfig, DifficultyId } from '../types/pinball';

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: '簡單',
    subtitle: '回彈力度強 · 掉落較緩慢',
    gravity: 540,
    triangleBumperImpulse: 760,
    sideBumperImpulse: 450,
    wallRestitution: 0.72,
    flipperSpeed: 18.5,
    flipperBoost: 820,
    maxBallSpeed: 1180,
    plungerMinSpeed: 900,
    plungerMaxSpeed: 1320,
  },
  normal: {
    id: 'normal',
    label: '正常',
    subtitle: '均衡彈力 · 標準掉落速度',
    gravity: 780,
    triangleBumperImpulse: 600,
    sideBumperImpulse: 440,
    wallRestitution: 0.68,
    flipperSpeed: 19.5,
    flipperBoost: 880,
    maxBallSpeed: 1360,
    plungerMinSpeed: 1080,
    plungerMaxSpeed: 1480,
  },
  hard: {
    id: 'hard',
    label: '困難',
    subtitle: '回彈力度強 · 掉落速度極快',
    gravity: 1140,
    triangleBumperImpulse: 820,
    sideBumperImpulse: 470,
    wallRestitution: 0.74,
    flipperSpeed: 21.5,
    flipperBoost: 980,
    maxBallSpeed: 1750,
    plungerMinSpeed: 1280,
    plungerMaxSpeed: 1720,
  },
};

export const DIFFICULTY_LIST: DifficultyConfig[] = [
  DIFFICULTIES.easy,
  DIFFICULTIES.normal,
  DIFFICULTIES.hard,
];
