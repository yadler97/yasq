import { MAX_VOLUME } from "../../constants";
import { getAvatarUrl, getDisplayName } from "../../helper";
import { audioPlayer, gameState, participants, volume } from "../main";

export const Sidebar = ({ }) => (
  <div className="sidebar">
    <div className="sidebar-box participants">
      <h3>Participating Players</h3>
      <div id="participant-list">
        {participants.value.map((p) => {
          const isPlayerHost = p.id === gameState.value.hostId;
          const isPlayerReady = gameState.value.readyUsers.includes(p.id);
          const isLastWinner = p.id === gameState.value.lastWinnerId;

          return (
            <div key={p.id} className="player-entry">
              <img src={getAvatarUrl(p)} className="avatar-tiny" />
              <div className="player-info-container">
                <span className="player-name">{getDisplayName(p)}</span>
                <div className="badge-container">
                  {isPlayerHost && <span className="badge host">HOST</span>}
                  {isPlayerReady && <span className="badge ready">READY</span>}
                  {isLastWinner && <span className="badge winner">👑</span>}
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
          <label for="volume-slider">Volume</label>
          <input type="range" id="volume-slider" min="0" max="1" step="0.01" value={volume.value} onInput={(e) => {
            const target = e.currentTarget as HTMLInputElement;
            const val = parseFloat(target.value);
            volume.value = val;
            audioPlayer.volume = val * MAX_VOLUME;
          }} />
        </div>
        <audio id="global-player"></audio>
      </div>
    </div>
  </div>
);