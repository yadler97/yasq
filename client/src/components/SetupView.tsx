import { useSignal } from "@preact/signals";
import * as backend from "../../backend.js";
import { participants, discordSdk, auth, gameState } from "../main";
import { getUserId, getDisplayName, getAvatarUrl } from "../../helper.js";

export const SetupView = ({ isHost }: { isHost: boolean }) => {
  const roundCount = useSignal(5);
  const trackDuration = useSignal(30);
  const isSubmitting = useSignal(false);

  const handleConfirmSettings = async () => {
    isSubmitting.value = true;
    try {
      await backend.setupGame(
        discordSdk.instanceId, 
        getUserId(auth.value), 
        roundCount.value, 
        trackDuration.value
      );
    } catch (e) {
      console.error("Setup failed:", e);
      isSubmitting.value = false;
    }
  };

  return (
    <div className="view-container centered">
      <img src="/rocket.png" className="logo" alt="Discord" />
      <h1>Welcome to YASQ!</h1>

      {!isHost ? (
        <div id="waiting-setup-msg">
          <h2>Waiting for host to setup game...</h2>
        </div>
      ) : (
        <div className="host-settings" id="host-settings">
          <h2>Game Setup</h2>
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

          <button id="btn-start" disabled={isSubmitting.value} onClick={handleConfirmSettings}>
            {isSubmitting.value ? "Saving..." : "Confirm"}
          </button>

          <div className="setting-group">
            <HostTransferDropdown />
          </div>
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