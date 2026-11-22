import React from 'react';
import { RotateCcw, Home, Trophy } from 'lucide-react';
import { DIFFICULTIES } from '../constants/difficulties';
import {
  DifficultyId,
  LeaderboardEntry,
  PlayerProfile,
  ThemePalette,
} from '../types/pinball';
import { formatGenderLabel } from '../utils/storage';

interface GameOverModalProps {
  isOpen: boolean;
  theme: ThemePalette;
  profile: PlayerProfile;
  difficulty: DifficultyId;
  finalScore: number;
  maxCombo: number;
  achievedRank: number | null;
  currentEntryId: string | null;
  topEntries: LeaderboardEntry[];
  onPlayAgain: () => void;
  onBackToSetup: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  theme,
  profile,
  difficulty,
  finalScore,
  maxCombo,
  achievedRank,
  currentEntryId,
  topEntries,
  onPlayAgain,
  onBackToSetup,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="遊戲結束結算"
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-xl p-5 space-y-5 my-auto"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          color: theme.textPrimary,
        }}
      >
        <div className="text-center space-y-1.5">
          <div className="text-xs font-medium" style={{ color: theme.textMuted }}>
            {profile.name} · {formatGenderLabel(profile.gender)} ·{' '}
            {DIFFICULTIES[difficulty].label}模式
          </div>
          <h2 className="text-xl font-bold tracking-tight">本輪對局結束</h2>
          <div
            className="text-4xl font-extrabold font-mono-num pt-1"
            style={{ color: theme.accent }}
          >
            {finalScore.toLocaleString()}
          </div>
          <div className="text-xs flex items-center justify-center gap-3" style={{ color: theme.textMuted }}>
            <span>最高連續撞擊 {maxCombo} 次</span>
            <span aria-hidden="true">·</span>
            {achievedRank !== null ? (
              <span className="font-bold" style={{ color: theme.accent }}>
                榮登第 {achievedRank} 名
              </span>
            ) : (
              <span>未進入前 5 名</span>
            )}
          </div>
        </div>

        {/* Inline Top 5 Leaderboard for this difficulty */}
        <div
          className="rounded-xl border p-3.5 space-y-2.5"
          style={{ backgroundColor: theme.pageBg, borderColor: theme.cardBorder }}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" style={{ color: theme.accent }} />
              <span>{DIFFICULTIES[difficulty].label}難度 Top 5</span>
            </span>
            <span style={{ color: theme.textMuted }}>單機紀錄</span>
          </div>

          <div className="divide-y" style={{ borderColor: theme.cardBorder }}>
            {topEntries.map((entry, idx) => {
              const isCurrent = entry.id === currentEntryId;
              return (
                <div
                  key={entry.id}
                  className="py-2 px-2 rounded-lg flex items-center justify-between gap-2 text-xs"
                  style={{
                    backgroundColor: isCurrent ? theme.accentSoft : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center font-bold font-mono-num shrink-0"
                      style={{
                        backgroundColor: idx === 0 ? theme.accent : theme.cardBg,
                        color: idx === 0 ? theme.accentText : theme.textPrimary,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-semibold truncate">{entry.name}</span>
                    {isCurrent && (
                      <span className="font-bold shrink-0" style={{ color: theme.accent }}>
                        （本次）
                      </span>
                    )}
                    <span className="shrink-0" style={{ color: theme.textMuted }}>
                      {formatGenderLabel(entry.gender)}
                    </span>
                  </div>
                  <span
                    className="font-bold font-mono-num shrink-0"
                    style={{ color: isCurrent ? theme.accent : theme.textPrimary }}
                  >
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onBackToSetup}
            className="min-h-[48px] px-4 py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-black/5"
            style={{ borderColor: theme.cardBorder }}
          >
            <Home className="w-4 h-4" />
            <span>返回設定</span>
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="min-h-[48px] px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            style={{
              backgroundColor: theme.accent,
              color: theme.accentText,
            }}
          >
            <RotateCcw className="w-4 h-4" />
            <span>再玩一局</span>
          </button>
        </div>
      </div>
    </div>
  );
};
