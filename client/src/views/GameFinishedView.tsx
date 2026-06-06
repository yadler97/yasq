import { useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";

import * as backend from "../utils/backend";
import { gameState, auth, discordSdk, participants } from "../main";
import { findUser, getAvatarUrl, getDisplayName, getUserId } from "../utils/helper";
import { NonDraggableImg } from "../components/NonDraggableImg";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";

export const FinalResultsView = ({ isHost }: { isHost: boolean }) => {
  const leaderboard = useSignal<any[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    backend.getFinalResults(discordSdk.instanceId).then((data) => {
      leaderboard.value = data.leaderboard;
    });
  }, []);

  const handleReady = async () => {
    setHasInteracted(true);

    await backend.updateReadyStatus(
      auth.value.access_token,
      discordSdk.instanceId,
      !gameState.value.readyUsers.includes(getUserId(auth.value))
    );
  };

  const handleDownload = () => {
    setIsDownloading(true);
    backend.downloadResultsImage(discordSdk.instanceId, discordSdk);
    setIsDownloading(false);
  };

  useKeyboardShortcut({ key: "r", altKey: true }, () => {
    if (!isHost) handleReady();
  });

  const playersExcludingHost = participants.value.filter(p => p.id !== gameState.value.hostId);
  const readyCount = gameState.value.readyUsers.length;
  const allPlayersReady = playersExcludingHost.length > 0 &&
                          playersExcludingHost.every(p => gameState.value.readyUsers.includes(p.id));

  const handleRestart = async (e: MouseEvent) => {
    const btn = e.currentTarget as HTMLButtonElement;
    btn.disabled = true;
    await backend.restartGame(auth.value.access_token, discordSdk.instanceId);
  };

  return (
    <div className="final-leaderboard centered">
      <h1 className="results-title">🏆 Final Results</h1>

      <div className="leaderboard-container">
        {leaderboard.value.map((player, index) => {
          const user = findUser(participants.value, player.userId);

          const total = leaderboard.value.length;
          const staggerIndex = (total - 1) - index;
          const delay = staggerIndex * 1.5;
          const isWinner = index === 0;

          return (
            <div
              key={player.userId}
              className="player-wrapper"
              style={{ animationDelay: `${delay}s` }}
            >
              <div
                className={`player-card ${isWinner ? 'winner' : ''}`}
                style={{ animationDelay: `${delay + 0.4}s` }}
              >
                <div className="player-main-info">
                  <div className="rank">#{index + 1}</div>
                  <NonDraggableImg src={getAvatarUrl(user)} className="avatar-small" />
                  <div className="name">{isWinner ? '👑 ' : ''}{getDisplayName(user)}</div>
                  <div className="total-score">{player.totalScore} pts</div>
                </div>

                <div className="history-grid">
                  <div className="history-label">Round Breakdown:</div>
                  <div className="round-bubbles">
                    {player.roundHistory.map((r: any) => (
                      <div
                        key={r.round}
                        className={`round-bubble ${r.scoreValue > 0 ? 'correct' : 'incorrect'} ${r.isFirst ? 'first' : ''}`}
                        title={`Round ${r.round}: ${r.guess || 'No guess'}`}
                      >
                        {r.points}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isHost ? (
        <div>
          <div className='export-section'>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading...' : '📥 Download Results Image'}
            </button>
          </div>

          <button
            id="btn-restart"
            disabled={!allPlayersReady}
            onClick={handleRestart}
          >
            {allPlayersReady
              ? "Play Again"
              : `Waiting... (${readyCount}/${playersExcludingHost.length})`}
          </button>
        </div>
      ) : (
        <div className='shortcut-badge-btn-wrapper'>
          <button
            className={`ready-btn ${gameState.value.readyUsers.includes(getUserId(auth.value)) ? 'ready' : ''} ${hasInteracted ? 'interacted' : ''}`}
            id="btn-ready"
            onClick={handleReady}
          >
            {gameState.value.readyUsers.includes(getUserId(auth.value)) ? "I'm Ready! ✅" : "Ready for New Game"}
          </button>
          <span className="shortcut-badge">
            <kbd>Alt</kbd>+<kbd>R</kbd>
          </span>
        </div>
      )}
    </div>
  );
};