import { useCallback, useEffect, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { AbandonConfirmModal } from './components/AbandonConfirmModal';
import { GameOverModal } from './components/GameOverModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { PauseModal } from './components/PauseModal';
import { PinballGameView } from './components/PinballGameView';
import { TitleSetupScreen } from './components/TitleSetupScreen';
import { PASTEL_THEMES, pickRandomThemeId } from './constants/themes';
import {
  AudioSettings,
  DifficultyId,
  GamePhase,
  PlayerProfile,
  ThemeId,
} from './types/pinball';
import {
  LeaderboardStore,
  loadAudioSettings,
  loadLeaderboards,
  loadSavedProfile,
  saveAudioSettings,
  saveLeaderboardScore,
  saveProfile,
} from './utils/storage';

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [profile, setProfile] = useState<PlayerProfile>(() => loadSavedProfile());
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal');
  const [themeId, setThemeId] = useState<ThemeId>(() => pickRandomThemeId());
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() =>
    loadAudioSettings()
  );
  const [leaderboards, setLeaderboards] = useState<LeaderboardStore>(() =>
    loadLeaderboards()
  );

  const [roundKey, setRoundKey] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [finalMaxCombo, setFinalMaxCombo] = useState(0);
  const [achievedRank, setAchievedRank] = useState<number | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const theme = PASTEL_THEMES[themeId];

  useEffect(() => {
    soundEngine.updateSettings(audioSettings);
    saveAudioSettings(audioSettings);
  }, [audioSettings]);

  useEffect(() => {
    const shouldPlayBgm = phase === 'PLAYING' && !showAbandonConfirm;
    soundEngine.setBgmPlaying(shouldPlayBgm);
  }, [phase, showAbandonConfirm]);

  const handleToggleBgm = useCallback(() => {
    soundEngine.unlock();
    setAudioSettings((prev) => ({ ...prev, bgmEnabled: !prev.bgmEnabled }));
  }, []);

  const handleToggleSfx = useCallback(() => {
    soundEngine.unlock();
    setAudioSettings((prev) => ({ ...prev, sfxEnabled: !prev.sfxEnabled }));
  }, []);

  const handleToggleAudioAll = useCallback(() => {
    soundEngine.unlock();
    setAudioSettings((prev) => {
      const anyOn = prev.bgmEnabled || prev.sfxEnabled;
      return { bgmEnabled: !anyOn, sfxEnabled: !anyOn };
    });
  }, []);

  const handleStartGame = useCallback((nextProfile: PlayerProfile) => {
    soundEngine.unlock();
    setProfile(nextProfile);
    saveProfile(nextProfile);
    setThemeId((prev) => pickRandomThemeId(prev));
    setLiveScore(0);
    setShowAbandonConfirm(false);
    setRoundKey((k) => k + 1);
    setPhase('PLAYING');
  }, []);

  const handleRoundEnd = useCallback(
    (score: number, maxCombo: number) => {
      const result = saveLeaderboardScore(profile, difficulty, score, maxCombo);
      setLeaderboards(result.store);
      setAchievedRank(result.rank);
      setCurrentEntryId(result.entryId);
      setFinalScore(score);
      setFinalMaxCombo(maxCombo);
      setPhase('GAME_OVER');
      soundEngine.playGameOver(result.rank !== null);
    },
    [profile, difficulty]
  );

  const handlePlayAgain = useCallback(() => {
    soundEngine.unlock();
    setThemeId((prev) => pickRandomThemeId(prev));
    setLiveScore(0);
    setRoundKey((k) => k + 1);
    setPhase('PLAYING');
  }, []);

  const handleBackToSetup = useCallback(() => {
    setShowAbandonConfirm(false);
    setThemeId((prev) => pickRandomThemeId(prev));
    setPhase('SETUP');
  }, []);

  const handlePause = useCallback(() => {
    setPhase((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev));
  }, []);

  const handleResume = useCallback(() => {
    soundEngine.unlock();
    setPhase('PLAYING');
  }, []);

  const handleRestartFromPause = useCallback(() => {
    soundEngine.unlock();
    setThemeId((prev) => pickRandomThemeId(prev));
    setLiveScore(0);
    setRoundKey((k) => k + 1);
    setPhase('PLAYING');
  }, []);

  const handleRequestAbandon = useCallback(() => {
    if (phase === 'PLAYING') {
      setShowAbandonConfirm(true);
    }
  }, [phase]);

  const handleConfirmAbandon = useCallback(() => {
    setShowAbandonConfirm(false);
    setThemeId((prev) => pickRandomThemeId(prev));
    setPhase('SETUP');
  }, []);

  return (
    <>
      {phase === 'SETUP' ? (
        <TitleSetupScreen
          initialProfile={profile}
          difficulty={difficulty}
          theme={theme}
          audioSettings={audioSettings}
          onStartGame={handleStartGame}
          onDifficultyChange={setDifficulty}
          onToggleBgm={handleToggleBgm}
          onToggleSfx={handleToggleSfx}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
        />
      ) : (
        <PinballGameView
          profile={profile}
          difficulty={difficulty}
          theme={theme}
          phase={showAbandonConfirm ? 'PAUSED' : phase}
          audioSettings={audioSettings}
          roundKey={roundKey}
          onPause={handlePause}
          onRequestAbandon={handleRequestAbandon}
          onToggleAudioAll={handleToggleAudioAll}
          onRoundEnd={handleRoundEnd}
          onScoreSnapshot={setLiveScore}
        />
      )}

      <PauseModal
        isOpen={phase === 'PAUSED' && !showAbandonConfirm}
        theme={theme}
        audioSettings={audioSettings}
        onResume={handleResume}
        onRestart={handleRestartFromPause}
        onAbandon={handleBackToSetup}
        onToggleBgm={handleToggleBgm}
        onToggleSfx={handleToggleSfx}
      />

      <AbandonConfirmModal
        isOpen={showAbandonConfirm}
        theme={theme}
        currentScore={liveScore}
        onCancel={() => setShowAbandonConfirm(false)}
        onConfirmAbandon={handleConfirmAbandon}
      />

      <GameOverModal
        isOpen={phase === 'GAME_OVER'}
        theme={theme}
        profile={profile}
        difficulty={difficulty}
        finalScore={finalScore}
        maxCombo={finalMaxCombo}
        achievedRank={achievedRank}
        currentEntryId={currentEntryId}
        topEntries={leaderboards[difficulty]}
        onPlayAgain={handlePlayAgain}
        onBackToSetup={handleBackToSetup}
      />

      <LeaderboardModal
        isOpen={showLeaderboard}
        initialDifficulty={difficulty}
        leaderboards={leaderboards}
        theme={theme}
        currentEntryId={currentEntryId}
        onClose={() => setShowLeaderboard(false)}
        onLeaderboardUpdate={setLeaderboards}
      />
    </>
  );
}
