import {
  AudioSettings,
  DifficultyId,
  Gender,
  LeaderboardEntry,
  PlayerProfile,
} from '../types/pinball';

const LEADERBOARD_KEY = 'pastel_pinball_leaderboard_v1';
const PROFILE_KEY = 'pastel_pinball_profile_v1';
const AUDIO_KEY = 'pastel_pinball_audio_v1';

export type LeaderboardStore = Record<DifficultyId, LeaderboardEntry[]>;

const EMPTY_LEADERBOARD: LeaderboardStore = {
  easy: [],
  normal: [],
  hard: [],
};

// Allows Chinese (CJK Unified Ideographs), English letters, digits, and internal spaces
const VALID_NAME_REGEX = /^[\u4e00-\u9fffA-Za-z0-9 ]+$/;

export function validatePlayerName(rawName: string): {
  valid: boolean;
  trimmed: string;
  error?: string;
} {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return { valid: false, trimmed, error: '請輸入玩家姓名' };
  }
  if (trimmed.length > 12) {
    return { valid: false, trimmed, error: '姓名長度請勿超過 12 個字元' };
  }
  if (!VALID_NAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      trimmed,
      error: '姓名僅限輸入中文、英文或數字',
    };
  }
  return { valid: true, trimmed };
}

export function loadLeaderboards(): LeaderboardStore {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return { easy: [], normal: [], hard: [] };
    const parsed = JSON.parse(raw) as Partial<LeaderboardStore>;
    return {
      easy: Array.isArray(parsed.easy) ? parsed.easy.slice(0, 5) : [],
      normal: Array.isArray(parsed.normal) ? parsed.normal.slice(0, 5) : [],
      hard: Array.isArray(parsed.hard) ? parsed.hard.slice(0, 5) : [],
    };
  } catch {
    return { ...EMPTY_LEADERBOARD };
  }
}

export function saveLeaderboardScore(
  profile: PlayerProfile,
  difficulty: DifficultyId,
  score: number,
  maxCombo: number
): { store: LeaderboardStore; entryId: string; rank: number | null } {
  const store = loadLeaderboards();
  const entryId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newEntry: LeaderboardEntry = {
    id: entryId,
    name: profile.name,
    gender: profile.gender,
    score,
    maxCombo,
    difficulty,
    createdAt: Date.now(),
  };

  const updatedList = [...store[difficulty], newEntry]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.createdAt - b.createdAt;
    })
    .slice(0, 5);

  const nextStore: LeaderboardStore = {
    ...store,
    [difficulty]: updatedList,
  };

  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(nextStore));
  } catch {
    // Ignore quota errors
  }

  const index = updatedList.findIndex((item) => item.id === entryId);
  return {
    store: nextStore,
    entryId,
    rank: index >= 0 ? index + 1 : null,
  };
}

export function clearLeaderboardDifficulty(difficulty: DifficultyId): LeaderboardStore {
  const store = loadLeaderboards();
  const nextStore: LeaderboardStore = {
    ...store,
    [difficulty]: [],
  };
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(nextStore));
  } catch {
    // Ignore storage errors
  }
  return nextStore;
}

export function loadSavedProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { name: '', gender: 'female' };
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const gender: Gender =
      parsed.gender === 'male' || parsed.gender === 'female' || parsed.gender === 'other'
        ? parsed.gender
        : 'female';
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      gender,
    };
  } catch {
    return { name: '', gender: 'female' };
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors
  }
}

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_KEY);
    if (!raw) return { bgmEnabled: true, sfxEnabled: true };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      bgmEnabled: parsed.bgmEnabled !== false,
      sfxEnabled: parsed.sfxEnabled !== false,
    };
  } catch {
    return { bgmEnabled: true, sfxEnabled: true };
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function formatGenderLabel(gender: Gender): string {
  switch (gender) {
    case 'male':
      return '男';
    case 'female':
      return '女';
    default:
      return '其他';
  }
}
