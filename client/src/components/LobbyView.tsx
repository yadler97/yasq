import { useSignal } from "@preact/signals";
import * as backend from "../../backend.js";
import { discordSdk } from "../main";
import { participants, gameState, auth } from "../main";
import { getAvatarUrl, getDisplayName, getUserId } from "../../helper.js";

export const LobbyView = ({ isHost }: { isHost: boolean }) => {
  const playersExcludingHost = participants.value.filter(p => p.id !== gameState.value.hostId);
  const readyUsers = playersExcludingHost.filter(p => gameState.value.readyUsers.includes(p.id)).length;
  const allPlayersReady = playersExcludingHost.length > 0 && readyUsers === playersExcludingHost.length;

  const roundCount = useSignal(5);
  const trackDuration = useSignal(30);

  const handleStart = async () => {
    await backend.startGame(discordSdk.instanceId, getUserId(auth.value), roundCount.value, trackDuration.value);
  };

  return (
    <div id="lobby">
      {isHost ? (
        <div id="lobby-host-ui" className="host-settings">
          <label className="setting-item">
            <span>Number of Rounds</span>
            <input type="number" id="rounds-input" min="1" max="20" value={roundCount.value}
              onInput={(e) => (roundCount.value = e.currentTarget.valueAsNumber)} />
          </label>
          <label className="setting-item">
            <span>Track Duration (sec)</span>
            <input type="number" id="duration-input" min="10" max="120" value={trackDuration.value}
              onInput={(e) => (trackDuration.value = e.currentTarget.valueAsNumber)} />
          </label>

          <button id="btn-start" disabled={!allPlayersReady} onClick={handleStart}>
            {allPlayersReady ? "Start Game" : `Waiting... (${readyUsers}/${playersExcludingHost.length})`}
          </button>

          <div className="setting-group">
            <HostTransferDropdown />
          </div>
        </div>
      ) : (
        <div id="lobby-guesser-ui">
          <button
            className={`lobby-btn ${gameState.value.readyUsers.includes(getUserId(auth.value)) ? 'ready' : ''}`}
            id="btn-ready"
            onClick={() => backend.updateReadyStatus(
              discordSdk.instanceId,
              getUserId(auth.value),
              !gameState.value.readyUsers.includes(getUserId(auth.value))
            )}
          >
            {gameState.value.readyUsers.includes(getUserId(auth.value)) ? "I'm Ready! ✅" : "Ready Up"}
          </button>
        </div>
      )}
    </div>
  );
};

export const HostTransferDropdown = () => {
  const isOpen = useSignal(false);
  const selectedPlayer = useSignal<{id: string, name: string, avatar: string} | null>(null);
  const isTransferring = useSignal(false);

  const players = participants.value.filter(p => p.id !== gameState.value.hostId);

  const performTransfer = async () => {
    if (!selectedPlayer.value) return;
    isTransferring.value = true;
    try {
      await backend.assignNewHost(discordSdk.instanceId, getUserId(auth.value), selectedPlayer.value.id);
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      isTransferring.value = false;
      selectedPlayer.value = null;
    }, 2000);
  };

  return (
    <div className="setting-item">
      <label for="host-dropdown" className="setting-label"><span>Transfer Host</span></label>
      <div className="transfer-controls-row">
        <div className="custom-dropdown" id="host-dropdown" onClick={() => isOpen.value = !isOpen.value}>
          <div className="dropdown-header">
            {selectedPlayer.value ? (
              <><img src={selectedPlayer.value.avatar} className="avatar-tiny" /><span>{selectedPlayer.value.name}</span></>
            ) : "Select a player..."}
          </div>
          
          {isOpen.value && (
            <div className="dropdown-list" id="dropdown-list" style={{ display: 'block' }}>
              {players.length === 0 ? (
                <div className="dropdown-item dropdown-item-empty">No other players</div>
              ) : players.map(p => (
                <div 
                  data-id={p.id}
                  key={p.id} 
                  className="dropdown-item" 
                  onClick={(e) => {
                    e.stopPropagation();
                    selectedPlayer.value = { id: p.id, name: getDisplayName(p), avatar: getAvatarUrl(p) };
                    isOpen.value = false;
                  }}
                >
                  <img src={getAvatarUrl(p)} className="avatar-tiny" />
                  <span>{getDisplayName(p)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          id="btn-confirm-transfer"
          disabled={!selectedPlayer.value || isTransferring.value}
          onClick={performTransfer}
        >
          {isTransferring.value ? "Transferring..." : "Transfer"}
        </button>
      </div>
    </div>
  );
};