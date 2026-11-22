import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ThemePalette } from '../types/pinball';

interface AbandonConfirmModalProps {
  isOpen: boolean;
  theme: ThemePalette;
  currentScore: number;
  onCancel: () => void;
  onConfirmAbandon: () => void;
}

export const AbandonConfirmModal: React.FC<AbandonConfirmModalProps> = ({
  isOpen,
  theme,
  currentScore,
  onCancel,
  onConfirmAbandon,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
      role="dialog"
      aria-modal="true"
      aria-label="放棄遊戲確認"
    >
      <div
        className="w-full max-w-sm rounded-2xl border shadow-xl p-5 space-y-4"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
          color: theme.textPrimary,
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">確定要放棄本局嗎？</h2>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textMuted }}>
              目前累計分數為{' '}
              <span className="font-mono-num font-bold" style={{ color: theme.textPrimary }}>
                {currentScore.toLocaleString()}
              </span>{' '}
              分。放棄後將直接結束本輪並返回設定畫面，本局成績不會計入排行榜。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors hover:bg-black/5"
            style={{ borderColor: theme.cardBorder }}
          >
            繼續遊玩
          </button>
          <button
            type="button"
            onClick={onConfirmAbandon}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold transition-colors hover:bg-red-700"
          >
            確定放棄
          </button>
        </div>
      </div>
    </div>
  );
};
