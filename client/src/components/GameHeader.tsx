import { signal } from '@preact/signals';

import { GameState } from '@yasq/shared';
import { gameState } from '../main';

export const isLocalSettingsOpen = signal(false);

export const GameHeader = () => {
  const { state, currentRound, gameSettings } = gameState.value;

  const renderHeaderContent = () => {
    switch (state) {
      case GameState.TRACK_SELECTION:
      case GameState.PLAYING:
      case GameState.HOST_REVIEW:
      case GameState.ROUND_RESULTS:
        return `Round ${currentRound} of ${gameSettings.rounds}`;
      default:
        return 'YASQ';
    }
  };

  return (
    <header className="game-header-stats">
      <p className="round-indicator">{renderHeaderContent()}</p>
      <button
        type="button"
        className="local-settings-btn"
        onClick={() => (isLocalSettingsOpen.value = true)}
      >
        ⚙️
      </button>
    </header>
  );
};
