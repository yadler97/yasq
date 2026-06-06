import { MAX_VOLUME } from "@yasq/shared";
import { getAvatarUrl, getDisplayName } from "../utils/helper";
import { gainNode, gameState, participants, volume } from "../main";
import { NonDraggableImg } from "./NonDraggableImg";

export const Sidebar = () => (
  <div className="sidebar">
    <div className="sidebar-box participants">
      <h3>Participating Players</h3>
      <div id="participant-list">
        {participants.value.map((p) => {
          const isPlayerHost = p.id === gameState.value.hostId;
          const isPlayerReady = gameState.value.readyUsers.includes(p.id);
          const hasPlayerGuessed = gameState.value.guessedPlayers.includes(p.id);
          const isLastWinner = p.id === gameState.value.lastWinnerId;

          const brokenStreak = gameState.value.lostStreaks?.[p.id] || 0;
          const activeStreak = gameState.value.streaks?.[p.id] || 0;
          const streakToDisplay = brokenStreak > 0 ? brokenStreak : activeStreak;
          const isStreakBroken = brokenStreak > 0;

          return (
            <div key={p.id} className="player-entry">
              <NonDraggableImg src={getAvatarUrl(p)} className="avatar-tiny" />
              <div className="player-info-container">
                <span className="player-name">{getDisplayName(p)}</span>
                <div className="badge-container">
                  {isPlayerHost && <span className="badge host">HOST</span>}
                  {isLastWinner && <span className="badge winner">👑</span>}
                  {streakToDisplay > 0 && (
                    <span
                      className={`badge streak streak-tier-${Math.min(Math.ceil(streakToDisplay / 2), 4)} ${isStreakBroken ? "broken" : ""}`}
                      data-streak={streakToDisplay}
                    >
                      🔥 {streakToDisplay}
                    </span>
                  )}
                  {isPlayerReady && <span className="badge ready">READY</span>}
                  {hasPlayerGuessed && <span className="badge guessed">GUESSED</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    <div className="sidebar-box">
      <div id="music-controls">
        <div>
          <label htmlFor="volume-slider">Volume</label>
          <input type="range" id="volume-slider" min="0" max="1" step="0.01" value={volume.value} onInput={(e) => {
            const target = e.currentTarget as HTMLInputElement;
            const val = parseFloat(target.value);
            volume.value = val;
            gainNode.gain.value = val * MAX_VOLUME;
          }} />
        </div>
      </div>
    </div>
  </div>
);