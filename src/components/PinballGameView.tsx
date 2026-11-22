import React, { useEffect, useRef, useState } from 'react';
import {
  Pause,
  Flag,
  Volume2,
  VolumeX,
  ArrowUpCircle,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { DIFFICULTIES } from '../constants/difficulties';
import { PinballSimulation } from '../engine/pinballPhysics';
import { TABLE_HEIGHT, TABLE_WIDTH } from '../engine/tableGeometry';
import {
  AudioSettings,
  DifficultyId,
  GamePhase,
  GameStatsSnapshot,
  PlayerProfile,
  ThemePalette,
} from '../types/pinball';
import { PastelBackdropPattern } from './PastelBackdropPattern';

interface PinballGameViewProps {
  profile: PlayerProfile;
  difficulty: DifficultyId;
  theme: ThemePalette;
  phase: GamePhase;
  audioSettings: AudioSettings;
  roundKey: number;
  onPause: () => void;
  onRequestAbandon: () => void;
  onToggleAudioAll: () => void;
  onRoundEnd: (finalScore: number, maxCombo: number) => void;
  onScoreSnapshot?: (score: number) => void;
}

const INITIAL_STATS: GameStatsSnapshot = {
  score: 0,
  ballsRemaining: 3,
  currentBallNumber: 1,
  comboCount: 0,
  comboMultiplier: 1,
  maxCombo: 0,
  ballPhase: 'READY_TO_LAUNCH',
  chargeRatio: 0,
  holeSwapRemainingSec: 10,
  lastEventText: null,
};

export const PinballGameView: React.FC<PinballGameViewProps> = ({
  profile,
  difficulty,
  theme,
  phase,
  audioSettings,
  roundKey,
  onPause,
  onRequestAbandon,
  onToggleAudioAll,
  onRoundEnd,
  onScoreSnapshot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<PinballSimulation | null>(null);
  const phaseRef = useRef<GamePhase>(phase);
  const themeRef = useRef<ThemePalette>(theme);
  const pointerRolesRef = useRef<Map<number, 'left' | 'right' | 'plunger'>>(new Map());

  const [stats, setStats] = useState<GameStatsSnapshot>(INITIAL_STATS);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase !== 'PLAYING') {
      simRef.current?.releaseAllInputs();
      pointerRolesRef.current.clear();
    }
  }, [phase]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const diffConfig = DIFFICULTIES[difficulty];
    const sim = new PinballSimulation(
      diffConfig,
      (snapshot) => {
        setStats(snapshot);
        onScoreSnapshot?.(snapshot.score);
      },
      (finalScore, maxCombo) => {
        onRoundEnd(finalScore, maxCombo);
      }
    );
    simRef.current = sim;
    setStats(INITIAL_STATS);

    return () => {
      sim.releaseAllInputs();
    };
  }, [roundKey, difficulty, onRoundEnd, onScoreSnapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const syncCanvasResolution = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(TABLE_WIDTH * dpr);
      const targetH = Math.round(TABLE_HEIGHT * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasResolution();

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const sim = simRef.current;
      if (sim) {
        if (phaseRef.current === 'PLAYING') {
          sim.step(rawDt, themeRef.current);
        }
        syncCanvasResolution();
        sim.render(ctx, themeRef.current);
      }

      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'PLAYING') return;
      const sim = simRef.current;
      if (!sim) return;

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onPause();
        return;
      }

      soundEngine.unlock();

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        sim.setFlipperPressed('left', true);
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'd' ||
        e.key === 'D' ||
        e.key === '/' ||
        e.key === 'm' ||
        e.key === 'M'
      ) {
        e.preventDefault();
        sim.setFlipperPressed('right', true);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        sim.quickLaunch();
      } else if (e.key === 'ArrowDown' && !e.repeat) {
        e.preventDefault();
        sim.startPlungerCharge();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (!sim) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'z' || e.key === 'Z') {
        sim.setFlipperPressed('left', false);
      } else if (
        e.key === 'ArrowRight' ||
        e.key === 'd' ||
        e.key === 'D' ||
        e.key === '/' ||
        e.key === 'm' ||
        e.key === 'M'
      ) {
        sim.setFlipperPressed('right', false);
      } else if (e.key === 'ArrowDown') {
        sim.releasePlunger();
      }
    };

    const handleBlur = () => {
      simRef.current?.releaseAllInputs();
      pointerRolesRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onPause]);

  const syncPointerFlippers = () => {
    const sim = simRef.current;
    if (!sim) return;
    let leftActive = false;
    let rightActive = false;
    for (const role of pointerRolesRef.current.values()) {
      if (role === 'left') leftActive = true;
      if (role === 'right') rightActive = true;
    }
    sim.setFlipperPressed('left', leftActive);
    sim.setFlipperPressed('right', rightActive);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== 'PLAYING') return;
    const canvas = canvasRef.current;
    const sim = simRef.current;
    if (!canvas || !sim) return;

    soundEngine.unlock();
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const logicalX = ((e.clientX - rect.left) / rect.width) * TABLE_WIDTH;
    const logicalY = ((e.clientY - rect.top) / rect.height) * TABLE_HEIGHT;

    if (stats.ballPhase === 'READY_TO_LAUNCH' && logicalX >= 352 && logicalY >= 460) {
      pointerRolesRef.current.set(e.pointerId, 'plunger');
      sim.startPlungerCharge();
      return;
    }

    const side: 'left' | 'right' = logicalX < 192 ? 'left' : 'right';
    pointerRolesRef.current.set(e.pointerId, side);
    syncPointerFlippers();
  };

  const handleCanvasPointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const role = pointerRolesRef.current.get(e.pointerId);
    if (!role) return;
    pointerRolesRef.current.delete(e.pointerId);

    if (role === 'plunger') {
      simRef.current?.releasePlunger();
    } else {
      syncPointerFlippers();
    }
  };

  const isAudioOn = audioSettings.bgmEnabled || audioSettings.sfxEnabled;

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden flex flex-col select-none transition-colors duration-300"
      style={{ backgroundColor: theme.pageBg, color: theme.textPrimary }}
    >
      <PastelBackdropPattern theme={theme} />

      {/* Compact Top HUD Bar */}
      <header
        className="relative z-10 shrink-0 w-full border-b px-2.5 sm:px-5 py-1.5"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Player & 3-Ball Status */}
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold truncate max-w-[110px] sm:max-w-[160px]">
                {profile.name}
              </div>
              <div className="text-[11px] flex items-center gap-1.5" style={{ color: theme.textMuted }}>
                <span>{DIFFICULTIES[difficulty].label}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1" aria-label={`剩餘 ${stats.ballsRemaining} 顆彈珠`}>
                  {[0, 1, 2].map((idx) => {
                    const active = idx < stats.ballsRemaining;
                    return (
                      <span
                        key={idx}
                        className="inline-block w-2.5 h-2.5 rounded-full border"
                        style={{
                          backgroundColor: active ? theme.accent : 'transparent',
                          borderColor: active ? theme.accent : theme.cardBorder,
                        }}
                      />
                    );
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Live Score & Combo Multiplier */}
          <div className="text-center shrink-0">
            <div
              className="text-xl sm:text-2xl font-extrabold font-mono-num leading-none"
              style={{ color: theme.accent }}
            >
              {stats.score.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold mt-0.5 h-4 flex items-center justify-center gap-1.5">
              {stats.comboCount >= 2 ? (
                <span style={{ color: theme.accent }}>
                  連續撞擊 ×{stats.comboMultiplier}
                </span>
              ) : (
                <span style={{ color: theme.textMuted }}>
                  第 {stats.currentBallNumber} / 3 顆 · 洞口切換{' '}
                  <span className="font-mono-num">{stats.holeSwapRemainingSec}s</span>
                </span>
              )}
            </div>
          </div>

          {/* Audio, Pause & Abandon Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleAudioAll}
              className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-colors hover:bg-black/5"
              title={isAudioOn ? '靜音' : '開啟聲音'}
              aria-label={isAudioOn ? '靜音' : '開啟聲音'}
            >
              {isAudioOn ? (
                <Volume2 className="w-4 h-4" style={{ color: theme.textPrimary }} />
              ) : (
                <VolumeX className="w-4 h-4" style={{ color: theme.textMuted }} />
              )}
            </button>

            <button
              type="button"
              onClick={onPause}
              className="min-h-[44px] px-2.5 sm:px-3 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors hover:bg-black/5"
              style={{ borderColor: theme.cardBorder }}
              aria-label="暫停遊戲"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">暫停</span>
            </button>

            <button
              type="button"
              onClick={onRequestAbandon}
              className="min-h-[44px] px-2.5 sm:px-3 rounded-xl border text-xs font-bold flex items-center gap-1 text-red-600 transition-colors hover:bg-red-50"
              style={{ borderColor: theme.cardBorder }}
              aria-label="放棄本局"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">放棄</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Pinball Arena Viewport */}
      <main className="relative z-10 flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 gap-6">
        {/* Desktop Side Legend */}
        <aside
          className="hidden lg:flex w-64 flex-col gap-4 rounded-2xl border p-5 self-center"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
          }}
        >
          <div>
            <div className="text-xs font-bold" style={{ color: theme.accent }}>
              {theme.name} · {theme.motifLabel}
            </div>
            <h2 className="text-base font-bold mt-1">操作指南</h2>
          </div>

          <div className="space-y-2.5 text-xs" style={{ color: theme.textMuted }}>
            <div className="flex justify-between gap-2">
              <span className="font-semibold" style={{ color: theme.textPrimary }}>左敲擊桿</span>
              <span>點擊左側 / ← / A</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="font-semibold" style={{ color: theme.textPrimary }}>右敲擊桿</span>
              <span>點擊右側 / → / D</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="font-semibold" style={{ color: theme.textPrimary }}>發射彈珠</span>
              <span>拉桿蓄力 / 空白鍵</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="font-semibold" style={{ color: theme.textPrimary }}>暫停</span>
              <span>Esc / P</span>
            </div>
          </div>

          <div
            className="pt-3 border-t space-y-1.5 text-xs leading-relaxed"
            style={{ borderColor: theme.cardBorder, color: theme.textMuted }}
          >
            <div className="font-bold" style={{ color: theme.textPrimary }}>
              機關與雙洞輪替（每 10 秒更換）
            </div>
            <div>倒三角撞擊點：10 / 20 / 50 分</div>
            <div>連續命中倍率：×1.5 → ×2 → ×2.5 → ×3</div>
            <div style={{ color: theme.warpOuter }} className="font-semibold">
              迴轉洞：吸入後從上方左／中／右隨機重新進入
            </div>
            <div className="text-red-600 font-medium">
              消失洞與底部缺口：該顆彈珠結束
            </div>
          </div>
        </aside>

        {/* Isolated Canvas Playfield Container */}
        <div className="relative h-full max-h-[760px] aspect-[7/12] max-w-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onPointerDown={handleCanvasPointerDown}
            onPointerUp={handleCanvasPointerUpOrCancel}
            onPointerCancel={handleCanvasPointerUpOrCancel}
            className="w-full h-full rounded-2xl border shadow-md touch-none cursor-pointer block"
            style={{ borderColor: theme.tableWallStroke }}
          />

          {/* Quick Launch CTA when waiting for launch */}
          {stats.ballPhase === 'READY_TO_LAUNCH' && phase === 'PLAYING' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-5 flex flex-col items-center gap-2 px-4">
              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  simRef.current?.quickLaunch();
                }}
                className="pointer-events-auto min-h-[46px] px-5 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-transform active:scale-95"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.accentText,
                }}
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>發射第 {stats.currentBallNumber} 顆彈珠</span>
              </button>
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.88)',
                  color: theme.textPrimary,
                }}
              >
                或長按右側拉桿蓄力放開
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
