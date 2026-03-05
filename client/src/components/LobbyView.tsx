import * as backend from "../../backend.js";
import { participants, discordSdk, auth, gameState } from "../main";
import { getUserId } from "../../helper.js";
import { getJokerDisplayName } from "./JokerIcons.js";

export const LobbyView = ({ isHost }: { isHost: boolean }) => {
  const playersExcludingHost = participants.value.filter(p => p.id !== gameState.value.hostId);
  const readyUsers = playersExcludingHost.filter(p => gameState.value.readyUsers.includes(p.id)).length;
  const allPlayersReady = playersExcludingHost.length > 0 && readyUsers === playersExcludingHost.length;

  const handleStart = async () => {
    await backend.startGame(auth.value.access_token, discordSdk.instanceId);
  };

  const handleReady = async () => {
    await backend.updateReadyStatus(
      auth.value.access_token,
      discordSdk.instanceId,
      !gameState.value.readyUsers.includes(getUserId(auth.value))
    )
  };

  return (
    <div id="lobby" className="centered">
      <div className="settings-info">
        <h2>Game Settings</h2>
        <span>📋 <strong>{gameState.value.rounds}</strong> Rounds</span>
        <span>⏱️ <strong>{gameState.value.trackDuration / 1000}s</strong> Track Duration</span>
        <span>
          ❓ <strong>Jokers:</strong> {
            gameState.value.enabledJokers.length > 0 
              ? gameState.value.enabledJokers.map(getJokerDisplayName).join(", ")
              : "None"
          }
        </span>
      </div>

      <div className="lobby-footer">
        {isHost ? (
          <button id="btn-start" disabled={!allPlayersReady} onClick={handleStart}>
            {allPlayersReady ? "Start Game" : `Waiting... (${readyUsers}/${playersExcludingHost.length})`}
          </button>
        ) : (
          <div id="lobby-guesser-ui">
            <button
              className={`lobby-btn ${gameState.value.readyUsers.includes(getUserId(auth.value)) ? 'ready' : ''}`}
              id="btn-ready"
              onClick={handleReady}
            >
              {gameState.value.readyUsers.includes(getUserId(auth.value)) ? "I'm Ready! ✅" : "Ready Up"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};