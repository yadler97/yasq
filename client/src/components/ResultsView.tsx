import { useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import * as backend from "../../backend.js";
import { gameState, auth, discordSdk, participants } from "../main.js";
import { capitalize, getUserId } from "../../helper.js";

export const RoundResultsView = ({ isHost }: { isHost: boolean }) => {
  const roundData = useSignal<any>(null);

  const [hasInteracted, setHasInteracted] = useState(false);

  const handleReady = async () => {
    setHasInteracted(true);

    await backend.updateReadyStatus(
      auth.value.access_token,
      discordSdk.instanceId,
      !gameState.value.readyUsers.includes(getUserId(auth.value))
    )
  };

  useEffect(() => {
    // Players fetch their specific result; Host just waits
    if (!isHost) {
      backend.getRoundResults(discordSdk.instanceId, getUserId(auth.value))
        .then(data => {
          roundData.value = data;
        });
    }
  }, [isHost]);

  // Logic for the Host's "Next Round" button
  const playersExcludingHost = participants.value.filter(p => p.id !== gameState.value.hostId);
  const readyCount = gameState.value.readyUsers.length;
  const allPlayersReady = playersExcludingHost.length > 0 && 
                          playersExcludingHost.every(p => gameState.value.readyUsers.includes(p.id));

  const handleNextRound = async () => {
    await backend.startNextRound(auth.value.access_token, discordSdk.instanceId);
  };

  if (isHost) {
    return (
      <div id="results" className="centered">
        <h2>Waiting for players to review results...</h2>
        <div id="lobby-host-ui-next-round">
          <button 
            id="btn-next-round" 
            disabled={!allPlayersReady}
            onClick={handleNextRound}
          >
            {allPlayersReady 
              ? (gameState.value.isFinalRound ? "Show Final Results" : "Next Round")
              : `Waiting... (${readyCount}/${playersExcludingHost.length})`
            }
          </button>
        </div>
      </div>
    );
  }

  if (!roundData.value) return <div id="results"><h2>Loading results...</h2></div>;

  const statusClass = roundData.value.result?.isCorrect ? 'correct' : 'incorrect';

  return (
    <div id="results" className="centered">
      <div className="round-result-summary">
        <h2>Round {roundData.value.round} Results</h2>
        <div className="track-details">
          <img src={roundData.value.gameCover} alt={`Cover of ${roundData.value.correctAnswer}`} />
          <div>
            <p><strong>{roundData.value.correctAnswer}</strong></p>
            <p><i>{roundData.value.trackTitle}</i></p>
            <div className="tags-container left">
              {roundData.value.tags.map((tag: any) => (
                <span key={tag.type} title={capitalize(tag.type)} className="tag-badge">
                  {tag.value}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="own-results">
          <p className={`result ${statusClass}`}>
            {roundData.value.result?.isCorrect ? "Correct! 🎉" : "Incorrect. 😢"}
          </p>
          <p>Your guess: <strong>{roundData.value.result?.guess || 'No guess submitted'}</strong></p>
          <p>You earned <strong>
            <RollingNumber target={roundData.value.result?.points || 0} />
          </strong> points this round.</p>
        </div>
      </div>

      <div>
        <button 
          className={`lobby-btn ${gameState.value.readyUsers.includes(getUserId(auth.value)) ? 'ready' : ''} ${hasInteracted ? 'interacted' : ''}`}
          onClick={handleReady}
        >
          {gameState.value.readyUsers.includes(getUserId(auth.value)) ? "I'm Ready! ✅" : "Ready Up"}
        </button>
      </div>
    </div>
  );
};

export const RollingNumber = ({ target }: { target: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 second animation
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (makes it slow down at the end)
      const easeOutQuad = (t: number) => t * (2 - t);
      const currentCount = Math.floor(easeOutQuad(progress) * target);

      setDisplayValue(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target]);

  return <span>{displayValue}</span>;
};