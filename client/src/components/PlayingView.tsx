import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import * as backend from "../../backend.js";
import { gameState, auth, discordSdk, audioPlayer } from "../main.js";
import { getUserId } from "../../helper.js";
import { POLLING_INTERVAL } from "../../constants.js";

export const ArenaView = ({ isHost }: { isHost: boolean }) => {
  const hasSubmitted = useSignal(false);
  const countdown = useSignal<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const roundStarted = countdown.value === null;
    const canFocus = !isHost && !hasSubmitted.value && inputRef.current;

    if (roundStarted && canFocus) {
      inputRef.current?.focus();
    }
  }, [countdown.value]);

  useEffect(() => {
    const sync = async () => {
      try {
        const { url, startTime, endTime } = await backend.getCurrentTrack(discordSdk.instanceId);
        if (!url) return;

        const now = Date.now();
        const totalDurationMs = endTime - startTime;
        const timePassedMs = now - startTime;
        
        const progressBar = document.getElementById('progress-bar');

        // 1. Countdown Phase (before startTime)
        if (timePassedMs < 0) {
          const remainingSeconds = Math.abs(Math.ceil(timePassedMs / 1000));
          countdown.value = remainingSeconds > 0 ? remainingSeconds : null;

          // Ensure player is paused and ready at the start
          audioPlayer.pause();
          audioPlayer.currentTime = 0;
          if (audioPlayer.src !== window.location.origin + url) audioPlayer.src = url;

          if (progressBar) {
            progressBar.style.width = '100%';
          }
          return; // Don't play the track until the countdown finishes
        }

        // 2. Playing Phase
        countdown.value = null;
        let percentage = 100 - (timePassedMs / totalDurationMs * 100);
        percentage = Math.max(0, Math.min(100, percentage));

        if (progressBar) {
          progressBar.style.width = `${percentage}%`;
          progressBar.style.backgroundColor = percentage < 20 ? '#f04747' : '#5865f2';
        }

        // Check if we need to load a new source
        if (audioPlayer.src !== window.location.origin + url) {
          audioPlayer.src = url;
        }

        // Sync timing
        const elapsedSeconds = timePassedMs / 1000;
        
        // If we are more than 2 seconds out of sync, snap to server time
        if (Math.abs(audioPlayer.currentTime - elapsedSeconds) > 2) {
          audioPlayer.currentTime = elapsedSeconds;
        }

        if (audioPlayer.paused) {
          audioPlayer.play().catch(() => {});
        }

      } catch (err) {
        console.error("Arena sync error:", err);
      }
    };

    const interval = setInterval(sync, POLLING_INTERVAL);
    return () => {
      clearInterval(interval);
    };
  }, [isHost]);

  return (
    <div id="game-arena">
      <h2 id="round-display">Round {gameState.value.currentRound}</h2>

      {countdown.value !== null && (
        <div id="countdown-overlay">
          <div id="countdown-number">{countdown.value}</div>
        </div>
      )}

      {isHost ? (
        <div id="game-host-ui">
          <h2>Waiting for players to submit their guesses...</h2>
        </div>
      ) : (
        <div id="game-guesser-ui">
          {!hasSubmitted.value ? (
            <form 
              id="game-guesser-form" 
              class="game-guesser-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const input = form.elements.namedItem('guess-input') as HTMLInputElement;
                const guess = input.value.trim();
                if (!guess) return;

                hasSubmitted.value = true;
                await backend.submitGuess(discordSdk.instanceId, getUserId(auth.value), guess);
              }}
            >
              <input 
                type="text"
                ref={inputRef}
                id="guess-input"
                name="guess-input"
                placeholder="Enter game title..."
                autoFocus
                autoComplete="off"
              />
              <button type="submit" id="btn-submit">Submit Guess</button>
            </form>
          ) : (
            <div className="waiting-container">
              <p className="waiting-msg" id="waiting-msg">Guess submitted! Waiting for others...</p>
            </div>
          )}
        </div>
      )}

      <div id="progress-container">
        <div id="progress-bar"></div>
      </div>
    </div>
  );
};