import React, { useEffect, useState } from 'react';
import { Trophy, X, Trash2 } from 'lucide-react';
import { DIFFICULTIES, DIFFICULTY_LIST } from '../constants/difficulties';
import { DifficultyId, ThemePalette } from '../types/pinball';
import {
  LeaderboardStore,
  clearLeaderboardDifficulty,
  formatGenderLabel,
} from '../utils/storage';

interface LeaderboardModalProps {
  isOpen: boolean;
  initialDifficulty: DifficultyId;
  leaderboards: LeaderboardStore;
  theme: ThemePalette;
  currentEntryId?: string | null;
  onClose: () => void;
  onLeaderboardUpdate: (next: LeaderboardStore) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  initialDifficulty,
  leaderboards,
  theme,
  currentEntryId,
  onClose,
  onLeaderboardUpdate,
}) => {
  const [selectedDiff, setSelectedDiff] = useState<DifficultyId>(initialDifficulty);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedDiff(initialDifficulty);
      setConfirmClear(false);
    }
  }, [isOpen, initialDifficulty]);

  if (!isOpen) return null;

  const entries = leaderboards[selectedDiff] || [];

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    const next = clearLeaderboardDifficulty(selectedDiff);
    onLeaderboardUpdate(next);
    setConfirmClear(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
      role="dialog"
      aria-modal="true"
      aria-label="單機排行榜"
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-xl overflow-hidden"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          color: theme.textPrimary,
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: theme.cardBorder }}
        >
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5" style={{ color: theme.accent }} />
            <h2 className="text-lg font-bold tracking-tight">單機排行榜（前 5 名）</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors hover:bg-black/5"
            aria-label="關閉排行榜"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Difficulty Tabs */}
          <div
            className="grid grid-cols-3 gap-1.5 p-1 rounded-xl"
            style={{ backgroundColor: theme.pageBg }}
          >
            {DIFFICULTY_LIST.map((diff) => {
              const active = selectedDiff === diff.id;
              return (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => {
                    setSelectedDiff(diff.id);
                    setConfirmClear(false);
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
                  style={{
                    backgroundColor: active ? theme.accent : 'transparent',
                    color: active ? theme.accentText : theme.textMuted,
                  }}
                >
                  {diff.label}
                </button>
              );
            })}
          </div>

          <div className="text-xs flex items-center justify-between" style={{ color: theme.textMuted }}>
            <span>
              {DIFFICULTIES[selectedDiff].label}模式 · {DIFFICULTIES[selectedDiff].subtitle}
            </span>
          </div>

          {/* Entries List */}
          {entries.length === 0 ? (
            <div
              className="py-10 px-4 text-center rounded-xl border border-dashed"
              style={{ borderColor: theme.cardBorder, color: theme.textMuted }}
            >
              <p className="text-sm font-medium">目前尚無「{DIFFICULTIES[selectedDiff].label}」難度紀錄</p>
              <p className="text-xs mt-1">完成一輪 3 顆彈珠對局即可登上排行榜</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: theme.cardBorder }}>
              {entries.map((entry, idx) => {
                const isCurrent = Boolean(currentEntryId && entry.id === currentEntryId);
                return (
                  <div
                    key={entry.id}
                    className="py-3 px-2 rounded-lg flex items-center justify-between gap-3"
                    style={{
                      borderColor: theme.cardBorder,
                      backgroundColor: isCurrent ? theme.accentSoft : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono-num shrink-0"
                        style={{
                          backgroundColor: idx === 0 ? theme.accent : theme.pageBg,
                          color: idx === 0 ? theme.accentText : theme.textPrimary,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-1 min-w-0">
                          <span className="truncate">{entry.name}</span>
                          {isCurrent && (
                            <span className="text-xs font-bold shrink-0" style={{ color: theme.accent }}>
                              （本次）
                            </span>
                          )}
                        </div>
                        <div className="text-xs flex items-center gap-1.5" style={{ color: theme.textMuted }}>
                          <span>{formatGenderLabel(entry.gender)}</span>
                          <span aria-hidden="true">·</span>
                          <span>最高連擊 {entry.maxCombo}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold font-mono-num" style={{ color: theme.accent }}>
                        {entry.score.toLocaleString()}
                      </div>
                      <div className="text-[11px]" style={{ color: theme.textMuted }}>
                        {new Date(entry.createdAt).toLocaleDateString('zh-TW', {
                          month: 'numeric',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {entries.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors hover:bg-black/5"
                style={{ color: confirmClear ? '#DC2626' : theme.textMuted }}
              >
                <Trash2 className="w-4 h-4" />
                <span>{confirmClear ? '再按一次確認清除' : '清除此難度紀錄'}</span>
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98]"
              style={{
                backgroundColor: theme.accent,
                color: theme.accentText,
              }}
            >
              確定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
