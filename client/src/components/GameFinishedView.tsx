import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import * as backend from "../../backend.js";
import { auth, discordSdk, participants } from "../main.js";
import { getAvatarUrl, getDisplayName, getUserId } from "../../helper.js";

export const FinalResultsView = ({ isHost }: { isHost: boolean }) => {
  const leaderboard = useSignal<any[]>([]);

  useEffect(() => {
    backend.getFinalResults(discordSdk.instanceId).then((data) => {
      leaderboard.value = data.leaderboard;
    });
  }, []);

  const handleRestart = async (e: MouseEvent) => {
    const btn = e.currentTarget as HTMLButtonElement;
    btn.disabled = true;
    await backend.restartGame(discordSdk.instanceId, getUserId(auth.value));
  };

  return (
    <div className="final-leaderboard">
      <h1 className="results-title">🏆 Final Results</h1>

      <div className="leaderboard-container">
        {leaderboard.value.map((player, index) => {
          const discordUser = participants.value.find(p => p.id === player.userId) || 
                              { username: 'Unknown' };

          const isWinner = index === 0;

          return (
            <div key={player.userId} className={`player-card ${isWinner ? 'winner' : ''}`}>
              <div className="player-main-info">
                <div className="rank">#{index + 1}</div>
                <img src={getAvatarUrl(discordUser)} className="avatar-small" />
                <div className="name">{isWinner ? '👑 ' : ''}{getDisplayName(discordUser)}</div>
                <div className="total-score">{player.totalScore} pts</div>
              </div>

              <div className="history-grid">
                <div className="history-label">Round Breakdown:</div>
                <div className="round-bubbles">
                  {player.roundHistory.map((r: any) => (
                    <div 
                      key={r.round}
                      className={`round-bubble ${r.isCorrect ? 'correct' : 'incorrect'} ${r.isFirst ? 'first' : ''}`} 
                      title={`Round ${r.round}: ${r.guess || 'No guess'}`}
                    >
                      {r.points}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isHost ? (
        <button id="btn-restart" onClick={handleRestart}>Play Again</button>
      ) : (
        <p className="waiting-msg">Waiting for host to restart...</p>
      )}
    </div>
  );
};