import React from 'react';
import { Play, RotateCcw, Flag, Volume2, VolumeX, Music } from 'lucide-react';
import { AudioSettings, ThemePalette } from '../types/pinball';

interface PauseModalProps {
  isOpen: boolean;
  theme: ThemePalette;
  audioSettings: AudioSettings;
  onResume: () => void;
  onRestart: () => void;
  onAbandon: () => void;
  onToggleBgm: () => void;
  onToggleSfx: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  theme,
  audioSettings,
  onResume,
  onRestart,
  onAbandon,
  onToggleBgm,
  onToggleSfx,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
      role="dialog"
      aria-modal="true"
      aria-label="遊戲暫停"
    >
      <div
        className="w-full max-w-sm rounded-2xl border shadow-xl p-5 space-y-5"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          color: theme.textPrimary,
        }}
      >
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight">遊戲已暫停</h2>
          <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
            目前背景主題：{theme.name}（每局隨機切換）
          </p>
        </div>

        {/* Audio Toggles */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleBgm}
            className="min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{
              backgroundColor: audioSettings.bgmEnabled ? theme.accentSoft : theme.pageBg,
              borderColor: audioSettings.bgmEnabled ? theme.accent : theme.cardBorder,
              color: audioSettings.bgmEnabled ? theme.accent : theme.textMuted,
            }}
          >
            <Music className="w-4 h-4" />
            <span>八音盒音樂：{audioSettings.bgmEnabled ? '開' : '關'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSfx}
            className="min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{
              backgroundColor: audioSettings.sfxEnabled ? theme.accentSoft : theme.pageBg,
              borderColor: audioSettings.sfxEnabled ? theme.accent : theme.cardBorder,
              color: audioSettings.sfxEnabled ? theme.accent : theme.textMuted,
            }}
          >
            {audioSettings.sfxEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span>撞擊音效：{audioSettings.sfxEnabled ? '開' : '關'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
            style={{
              backgroundColor: theme.accent,
              color: theme.accentText,
            }}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>繼續遊戲</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="min-h-[44px] px-3 py-2.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors hover:bg-black/5"
              style={{ borderColor: theme.cardBorder }}
            >
              <RotateCcw className="w-4 h-4" />
              <span>重新開始</span>
            </button>
            <button
              type="button"
              onClick={onAbandon}
              className="min-h-[44px] px-3 py-2.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors hover:bg-red-50 text-red-600"
              style={{ borderColor: theme.cardBorder }}
            >
              <Flag className="w-4 h-4" />
              <span>放棄本局</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
