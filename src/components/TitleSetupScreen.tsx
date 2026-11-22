import React, { useState } from 'react';
import { Play, Trophy, Music, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { DIFFICULTY_LIST } from '../constants/difficulties';
import {
  AudioSettings,
  DifficultyId,
  Gender,
  PlayerProfile,
  ThemePalette,
} from '../types/pinball';
import { validatePlayerName } from '../utils/storage';
import { PastelBackdropPattern } from './PastelBackdropPattern';

interface TitleSetupScreenProps {
  initialProfile: PlayerProfile;
  difficulty: DifficultyId;
  theme: ThemePalette;
  audioSettings: AudioSettings;
  onStartGame: (profile: PlayerProfile) => void;
  onDifficultyChange: (id: DifficultyId) => void;
  onToggleBgm: () => void;
  onToggleSfx: () => void;
  onOpenLeaderboard: () => void;
}

const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: 'female', label: '女' },
  { id: 'male', label: '男' },
  { id: 'other', label: '其他' },
];

export const TitleSetupScreen: React.FC<TitleSetupScreenProps> = ({
  initialProfile,
  difficulty,
  theme,
  audioSettings,
  onStartGame,
  onDifficultyChange,
  onToggleBgm,
  onToggleSfx,
  onOpenLeaderboard,
}) => {
  const [name, setName] = useState(initialProfile.name);
  const [gender, setGender] = useState<Gender>(initialProfile.gender);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validatePlayerName(name);
    if (!check.valid) {
      setErrorMsg(check.error || '請輸入有效的玩家姓名');
      return;
    }
    setErrorMsg(null);
    onStartGame({ name: check.trimmed, gender });
  };

  return (
    <div
      className="relative min-h-[100dvh] w-full flex flex-col justify-center items-center px-4 py-5 md:px-8 md:py-8 transition-colors duration-300"
      style={{ backgroundColor: theme.pageBg, color: theme.textPrimary }}
    >
      <PastelBackdropPattern theme={theme} />
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.02fr_1fr] gap-6 items-stretch">
        {/* Left Column: Title Hero & Illustrated Pinball Table Key Art */}
        <section
          className="rounded-2xl border p-5 md:p-7 flex flex-col justify-between gap-5"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-xs font-semibold tracking-wide"
                style={{ color: theme.accent }}
              >
                粉彩桌遊系列 · 每輪 3 顆彈珠
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onToggleBgm}
                  className="min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-colors hover:bg-black/5"
                  style={{
                    borderColor: theme.cardBorder,
                    color: audioSettings.bgmEnabled ? theme.accent : theme.textMuted,
                    backgroundColor: audioSettings.bgmEnabled ? theme.accentSoft : 'transparent',
                  }}
                  aria-label={audioSettings.bgmEnabled ? '關閉八音盒音樂' : '開啟八音盒音樂'}
                  title="切換八音盒背景音樂"
                >
                  <Music className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onToggleSfx}
                  className="min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-colors hover:bg-black/5"
                  style={{
                    borderColor: theme.cardBorder,
                    color: audioSettings.sfxEnabled ? theme.accent : theme.textMuted,
                    backgroundColor: audioSettings.sfxEnabled ? theme.accentSoft : 'transparent',
                  }}
                  aria-label={audioSettings.sfxEnabled ? '關閉撞擊音效' : '開啟撞擊音效'}
                  title="切換撞擊音效"
                >
                  {audioSettings.sfxEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Bespoke inline SVG Title Lockup */}
            <div className="flex items-center gap-3.5">
              <svg
                width="52"
                height="52"
                viewBox="0 0 56 56"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="3"
                  width="50"
                  height="50"
                  rx="16"
                  fill={theme.tableBgBottom}
                  stroke={theme.tableWallStroke}
                  strokeWidth="2.5"
                />
                <circle cx="19" cy="21" r="6" fill={theme.bumper10Fill} stroke={theme.bumper10Stroke} strokeWidth="2" />
                <circle cx="37" cy="21" r="6" fill={theme.bumper20Fill} stroke={theme.bumper20Stroke} strokeWidth="2" />
                <circle cx="28" cy="34" r="7" fill={theme.bumper50Fill} stroke={theme.bumper50Stroke} strokeWidth="2" />
                <path
                  d="M15 44L24 47M41 44L32 47"
                  stroke={theme.flipperFill}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="28" cy="12" r="3.5" fill="#FFFFFF" stroke={theme.accent} strokeWidth="1.5" />
              </svg>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-balance">
                  粉彩彈珠台
                </h1>
                <p className="text-xs md:text-sm mt-0.5" style={{ color: theme.textMuted }}>
                  Pastel Pinball · 隨機淺淡粉彩主題 × 動態雙洞機關
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Table Anatomy Preview SVG */}
          <div
            className="rounded-xl border p-4 flex items-center gap-4"
            style={{
              backgroundColor: theme.tableBgTop,
              borderColor: theme.cardBorder,
            }}
          >
            <svg
              viewBox="0 0 140 195"
              className="w-24 sm:w-28 shrink-0"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="4"
                width="132"
                height="187"
                rx="28"
                fill={theme.tableBgBottom}
                stroke={theme.tableWallStroke}
                strokeWidth="3"
              />
              {/* Inverted triangle dashed guide */}
              <polygon
                points="44,62 92,62 68,96"
                fill="none"
                stroke={theme.tableWallStroke}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* 10 / 20 / 50 Bumpers */}
              <circle cx="44" cy="62" r="10.5" fill={theme.bumper10Fill} stroke={theme.bumper10Stroke} strokeWidth="2" />
              <text x="44" y="65" textAnchor="middle" fontSize="8" fontWeight="700" fill={theme.textPrimary}>10</text>
              <circle cx="92" cy="62" r="10.5" fill={theme.bumper20Fill} stroke={theme.bumper20Stroke} strokeWidth="2" />
              <text x="92" y="65" textAnchor="middle" fontSize="8" fontWeight="700" fill={theme.textPrimary}>20</text>
              <circle cx="68" cy="96" r="11.5" fill={theme.bumper50Fill} stroke={theme.bumper50Stroke} strokeWidth="2" />
              <text x="68" y="99" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#FFFFFF">50</text>
              {/* Side bumpers */}
              <circle cx="25" cy="112" r="6.5" fill={theme.sideBumperFill} stroke={theme.sideBumperStroke} strokeWidth="1.5" />
              <circle cx="111" cy="112" r="6.5" fill={theme.sideBumperFill} stroke={theme.sideBumperStroke} strokeWidth="1.5" />
              {/* Example active dynamic holes (1 warp + 1 vanish) */}
              <circle cx="22" cy="44" r="5.5" fill={theme.warpOuter} stroke={theme.warpRim} strokeWidth="1.5" />
              <circle cx="115" cy="136" r="5.5" fill={theme.sinkholeOuter} stroke={theme.sinkholeRim} strokeWidth="1.5" />
              {/* Flippers */}
              <line x1="36" y1="164" x2="58" y2="173" stroke={theme.flipperFill} strokeWidth="6" strokeLinecap="round" />
              <line x1="100" y1="164" x2="78" y2="173" stroke={theme.flipperFill} strokeWidth="6" strokeLinecap="round" />
              {/* Launch lane */}
              <line x1="122" y1="56" x2="122" y2="184" stroke={theme.tableWallStroke} strokeWidth="2" />
              <circle cx="129" cy="166" r="4" fill="#FFFFFF" stroke={theme.accent} strokeWidth="1.5" />
            </svg>

            <div className="space-y-2 text-xs leading-relaxed">
              <div className="font-bold text-sm">檯面計分與機關規則</div>
              <ul className="space-y-1.5" style={{ color: theme.textMuted }}>
                <li>
                  <span className="font-semibold" style={{ color: theme.textPrimary }}>
                    倒三角撞擊點：
                  </span>
                  分別為 10 / 20 / 50 分，連續敲擊累積倍率加成。
                </li>
                <li>
                  <span className="font-semibold" style={{ color: theme.textPrimary }}>
                    隨機雙洞（10 秒更換）：
                  </span>
                  於上方左右各 2、下方左右各 1 共 6 處隨機出現 2 個；其中 1 個為「消失洞」（彈珠結束），另 1 個為「迴轉洞」（彈珠自上方左、中、右隨機重新進入）。
                </li>
                <li>
                  <span className="font-semibold" style={{ color: theme.textPrimary }}>
                    底部敲擊桿：
                  </span>
                  點選左右敲擊桿或螢幕兩側彈回彈珠，漏接即結束該顆彈珠。
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="min-h-[44px] px-4 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-black/5"
              style={{ borderColor: theme.cardBorder }}
            >
              <Trophy className="w-4 h-4" style={{ color: theme.accent }} />
              <span>查看各難度 Top 5 排行榜</span>
            </button>
          </div>
        </section>

        {/* Right Column: Player Profile & Difficulty Setup Form */}
        <section
          className="rounded-2xl border p-5 md:p-7 flex flex-col justify-between"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Name & Gender */}
              <div className="space-y-3">
                <div>
                  <label htmlFor="player-name" className="block text-xs font-bold mb-1.5">
                    玩家姓名（中文、英文或數字）
                  </label>
                  <input
                    id="player-name"
                    type="text"
                    value={name}
                    maxLength={12}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="例如：小晴、Alex99"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none transition-colors"
                    style={{
                      backgroundColor: theme.pageBg,
                      borderColor: errorMsg ? '#DC2626' : theme.cardBorder,
                      color: theme.textPrimary,
                    }}
                  />
                  {errorMsg && (
                    <p className="text-xs text-red-600 font-medium mt-1.5" role="alert">
                      {errorMsg}
                    </p>
                  )}
                </div>

                <div>
                  <span className="block text-xs font-bold mb-1.5">性別</span>
                  <div className="grid grid-cols-3 gap-2">
                    {GENDER_OPTIONS.map((g) => {
                      const active = gender === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGender(g.id)}
                          className="min-h-[44px] px-3 py-2 rounded-xl border text-sm font-semibold transition-all"
                          style={{
                            backgroundColor: active ? theme.accentSoft : theme.pageBg,
                            borderColor: active ? theme.accent : theme.cardBorder,
                            color: active ? theme.accent : theme.textMuted,
                          }}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Difficulty Selection */}
              <div className="space-y-1.5">
                <span className="block text-xs font-bold">遊戲難易度</span>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_LIST.map((diff) => {
                    const active = difficulty === diff.id;
                    return (
                      <button
                        key={diff.id}
                        type="button"
                        onClick={() => onDifficultyChange(diff.id)}
                        className="min-h-[60px] p-2.5 rounded-xl border text-left transition-all flex flex-col justify-center"
                        style={{
                          backgroundColor: active ? theme.accentSoft : theme.pageBg,
                          borderColor: active ? theme.accent : theme.cardBorder,
                        }}
                      >
                        <div
                          className="text-sm font-bold"
                          style={{ color: active ? theme.accent : theme.textPrimary }}
                        >
                          {diff.label}
                        </div>
                        <div
                          className="text-[11px] leading-tight mt-0.5"
                          style={{ color: theme.textMuted }}
                        >
                          {diff.id === 'easy'
                            ? '強回彈 · 緩降'
                            : diff.id === 'normal'
                              ? '標準均衡手感'
                              : '強回彈 · 極速'}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs pt-0.5" style={{ color: theme.textMuted }}>
                  {DIFFICULTY_LIST.find((d) => d.id === difficulty)?.subtitle}
                </p>
              </div>

              {/* Random Background Notice (No manual selection needed) */}
              <div
                className="rounded-xl border px-3.5 py-3 flex items-center gap-2.5 text-xs"
                style={{
                  backgroundColor: theme.pageBg,
                  borderColor: theme.cardBorder,
                  color: theme.textMuted,
                }}
              >
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: theme.accent }} />
                <span>
                  內建甜美、太空、科學、奇幻共 8 款淺淡背景，開局隨機出現（預覽：{theme.name} · {theme.motifLabel}）
                </span>
              </div>
            </div>

            {/* Start CTA */}
            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                className="w-full min-h-[52px] px-6 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.accentText,
                }}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>開始遊戲</span>
              </button>

              <p
                className="text-[11px] text-center leading-relaxed"
                style={{ color: theme.textMuted }}
              >
                點擊左右半側或鍵盤方向鍵控制敲擊桿 · 長按右側拉桿蓄力或點擊快捷發射 · Esc 暫停
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
