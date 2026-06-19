import { useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";

import * as backend from "../utils/backend";
import { gameState, auth, discordSdk, participants, isMac } from "../main";
import { findUser, getActionKeyLabel, getUserId } from "../utils/helper";
import { NonDraggableImg } from "../components/NonDraggableImg";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import { getAvatarUrl, getDisplayName } from "@yasq/shared";

export const FinalResultsView = ({ isHost }: { isHost: boolean }) => {
  const leaderboard = useSignal<any[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [hasPosted, setHasPosted] = useState(false);
  const [channels, setChannels] = useState<{id: string, name: string, category: string}[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [activeTooltipType, setActiveTooltipType] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTooltipType) return;

    const closeAllTooltips = () => setActiveTooltipType(null);

    window.addEventListener("touchstart", closeAllTooltips);
    window.addEventListener("click", closeAllTooltips);
    window.addEventListener("scroll", closeAllTooltips, true);

    return () => {
      window.removeEventListener("touchstart", closeAllTooltips);
      window.removeEventListener("click", closeAllTooltips);
      window.removeEventListener("scroll", closeAllTooltips, true);
    };
  }, [activeTooltipType]);

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

  const handlePostToChannel = async () => {
    setIsPosting(true);
    try {
      const response = await backend.postResultsToDiscordChannel(discordSdk.instanceId, selectedChannel)

      if (response.ok) {
        setHasPosted(true);
      } else {
        console.error("Failed to post results package.");
      }
    } catch (error) {
      console.error("Error running post routine:", error);
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    backend.getChannels(discordSdk.guildId!)
      .then(data => setChannels(data));
  }, []);

  useKeyboardShortcut({ key: "R", altKey: !isMac, metaKey: isMac }, () => {
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
                style={{ animationDelay: `${delay + 0.4}s`, zIndex: (1000 - index) }}
              >
                {isWinner && <div className="shimmer-layer" />}
                <div className="player-main-info">
                  <div className="rank">#{index + 1}</div>
                  <NonDraggableImg src={getAvatarUrl(user)} className="avatar-small" />
                  <div className="name">{isWinner ? '👑 ' : ''}{getDisplayName(user)}</div>
                  <div className="total-score">{player.totalScore} pts</div>
                </div>

                <div className="history-grid">
                  <div className="history-label">Round Breakdown:</div>
                  <div className="round-bubbles">
                    {player.roundHistory.map((r: any) => {
                      const tooltipId = `round-${player.userId}-${r.round}`; // Unique ID per bubble
                      const isTooltipOpen = activeTooltipType === tooltipId;

                      const measureBubbleBounds = (el: HTMLDivElement | null) => {
                        if (!el) return;
                        const rect = el.getBoundingClientRect();
                        el.style.setProperty('--bubble-x', `${rect.left}px`);
                        // computed styles of the tooltip with a width dynamically adjusted to fit the text
                        const computedStyle = window.getComputedStyle(el, '::after');
                        el.style.setProperty('--tooltip-width', computedStyle.width);
                      };

                      return (
                        <div
                          key={r.round}
                          className={`round-bubble ${r.scoreValue > 0 ? 'correct' : 'incorrect'} ${r.isFirst ? 'first' : ''} ${isTooltipOpen ? "show-tooltip" : ""}`}
                          data-tooltip={`Round ${r.round}: ${r.guess || 'No guess'}`}

                          // Measure actual position and width of current bubble when tapped/hovered on
                          onMouseEnter={(e) => measureBubbleBounds(e.currentTarget as HTMLDivElement)}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            measureBubbleBounds(e.currentTarget as HTMLDivElement);
                            setActiveTooltipType(isTooltipOpen ? null : tooltipId);
                          }}
                        >
                          {r.points}
                        </div>
                      );
                    })}
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

            <select
              value={selectedChannel}
              disabled={channels.length === 0 || isPosting || hasPosted}
              onChange={(e) => {
                const target = e.target as HTMLSelectElement;
                setSelectedChannel(target.value);
              }}
            >
              {channels.length === 0 ? (
                <option value="">No channels available</option>
              ) : (
                <>
                  <option value="">Select a channel...</option>
                  {channels.map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.category ? `${channel.category} > ` : ""}#{channel.name}
                    </option>
                  ))}
                </>
              )}
            </select>

            <button
              onClick={handlePostToChannel}
              disabled={isPosting || hasPosted || !selectedChannel}
            >
              {hasPosted
                ? '✅ Posted to Channel'
                : (isPosting ? 'Posting to Discord...' : '💬 Post Directly to Channel')}
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
            <kbd>{getActionKeyLabel(isMac)}</kbd>+<kbd>R</kbd>
          </span>
        </div>
      )}
    </div>
  );
};