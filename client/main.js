import { DiscordSDK } from "@discord/embedded-app-sdk";
import * as backend from "./backend.js";
import { getAvatarUrl, getDisplayName } from "./helper.js";
import { GameState } from './constants.js';

import rocketLogo from '/rocket.png';
import "./style.css";

// Will eventually store the authenticated user's access_token
let auth;
let currentHostId = null;
let isHost = false;
let isReady = false;
let localLastRound = null;
let lastState = null;
let lastParticipantsSnapshot = null;
let gameNumber = 1;

const discordSdk = new DiscordSDK(
  import.meta.env.VITE_DISCORD_CLIENT_ID
);

let audioPlayer;
let volumeSlider;

const version = import.meta.env.VERSION; 
document.querySelector('.version').innerText = `Ver. ${version}`;

setupDiscordSdk().then(async () => {
  backend.logToServer("Discord SDK is authenticated", auth.user.username);

  // 1. Initial User Fetch
  const initialData = await discordSdk.commands.getInstanceConnectedParticipants();
  renderParticipants(initialData.participants);

  // 2. Subscribe to live updates
  discordSdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (event) => {
    console.log("Participants changed!", event.participants);
    renderParticipants(event.participants);
  });

  setInterval(async () => {
    const {
      state,
      hostId,
      readyUsers,
      currentRound,
      isFinalRound,
      currentGame,
      lastWinnerId
    } = await backend.getGameStatus(discordSdk.instanceId);

    isHost = String(auth.user.id) === String(hostId);
    isReady = readyUsers.includes(auth.user.id);
    if (!isHost) {
      document.querySelector('#btn-ready').textContent = isReady ? "I'm Ready! ✅" : "Ready Up";
      document.querySelector('#btn-ready').style.background = isReady ? "#3ba55e" : "";
    }
    currentHostId = hostId;
    if (gameNumber !== currentGame) {
      localLastRound = null;
      lastState = null;
      gameNumber = currentGame;
    }

    const pData = await discordSdk.commands.getInstanceConnectedParticipants();

    // 1. Always update participants
    renderParticipants(pData.participants, readyUsers, lastWinnerId);

    // 2. Handle State Transitions
    switch (state) {
      case GameState.LOBBY:
        handleLobbyUI(pData.participants, readyUsers, isHost);
        break;
      case GameState.TRACK_SELECTION:
        handleTrackSelectionUI(currentRound, isHost);
        break;
      case GameState.PLAYING:
        handlePlayingUI(currentRound, isHost);
        break;
      case GameState.ROUND_COMPLETED:
        handleRoundCompletedUI(pData.participants, isHost);
        break;
      case GameState.RESULTS:
        handleResultsUI(pData.participants, readyUsers, isFinalRound, isHost);
        break;
      case GameState.GAME_FINISHED:
        handleFinalResultsUI(pData.participants, isHost);
        break;
    }
  }, 500);

  // We can now make API calls within the scopes we requested in setupDiscordSDK()
  // Note: the access_token returned is a sensitive secret and should be treated as such
});

async function setupDiscordSdk() {
  await discordSdk.ready();
  console.log("Discord SDK is ready");

  // Authorize with Discord Client
  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: [
      "identify",
      "guilds",
      "applications.commands"
    ],
  });

  // Retrieve an access_token from your activity's server
  const { access_token } = await backend.getToken(code);

  // Authenticate with Discord client (using the access_token)
  auth = await discordSdk.commands.authenticate({
    access_token,
  });

  if (auth == null) {
    throw new Error("Authenticate command failed");
  }

  // Register with our backend
  await backend.registerUser(discordSdk.instanceId, auth.user.id, auth.user.username);

  document.querySelector('#btn-ready').onclick = toggleReady;

  document.querySelector('#game-guesser-form').onsubmit = async (e) => {
    e.preventDefault();
    await backend.submitGuess(discordSdk.instanceId, auth.user.id, document.querySelector('#guess-input').value);
  };

  document.querySelector('#btn-start').onclick = async () => {
    let rounds = document.querySelector('#rounds-input').value;
    let trackDuration = document.querySelector('#duration-input').value;
    await backend.startGame(discordSdk.instanceId, auth.user.id, rounds, trackDuration);
  };

  document.querySelector('#btn-next-round').onclick = async () => {
    await backend.startNextRound(discordSdk.instanceId, auth.user.id);
  };

  audioPlayer = document.querySelector('#global-player');
  volumeSlider = document.querySelector('#volume-slider');

  // Set initial volume to 50%
  audioPlayer.volume = 0.5;

  // Listen for slider changes
  volumeSlider.oninput = (e) => {
    const newVolume = e.target.value;
    audioPlayer.volume = newVolume;
  };
}

function renderParticipants(participants, readyUsers = [], lastWinnerId = null) {
  const listContainer = document.querySelector('#participant-list');
  
  // Clear the current list
  listContainer.innerHTML = '';

  // Create a fragment to improve performance during DOM manipulation
  const fragment = document.createDocumentFragment();

  participants.forEach((p) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.margin = '10px 0';

    // Get the display name (nickname first, then username)
    const displayName = getDisplayName(p);

    // Create a small avatar
    const avatar = document.createElement('img');
    avatar.src = getAvatarUrl(p);
    avatar.style.width = '24px';
    avatar.style.borderRadius = '50%';
    avatar.style.marginRight = '8px';

    const nameTag = document.createElement('span');
    nameTag.textContent = displayName;

    // Add host label if this participant is the host
    // Or ready label if they are marked as ready
    if (p.id === currentHostId) {
      const hostLabel = document.createElement('span');
      hostLabel.className = 'badge host';
      hostLabel.textContent = 'HOST';
      nameTag.appendChild(hostLabel);
    } else if (readyUsers.includes(p.id)) {
      const readyLabel = document.createElement('span');
      readyLabel.className = 'badge ready';
      readyLabel.textContent = 'READY';
      nameTag.appendChild(readyLabel);
    }

    if (p.id === lastWinnerId) {
      const winnerLabel = document.createElement('span');
      winnerLabel.className = 'badge winner';
      winnerLabel.textContent = '👑';
      nameTag.appendChild(winnerLabel);
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(nameTag);
    fragment.appendChild(wrapper);
  });

  listContainer.appendChild(fragment);
}

async function toggleReady() {
  isReady = !isReady;
  await backend.updateReadyStatus(discordSdk.instanceId, auth.user.id, isReady);
}

function showLobbyHostUI() {
  const hostDiv = document.querySelector('#lobby-host-ui');
  if (hostDiv) hostDiv.style.display = 'block';
  const lobbyDiv = document.querySelector('#lobby-guesser-ui');
  if (lobbyDiv) lobbyDiv.style.display = 'none';
}

function showLobbyGuesserUI() {
  const lobbyDiv = document.querySelector('#lobby-guesser-ui');
  if (lobbyDiv) lobbyDiv.style.display = 'block';
  const hostDiv = document.querySelector('#lobby-host-ui');
  if (hostDiv) hostDiv.style.display = 'none';
}

function renderHostChangeUI(participants) {
  const listContainer = document.querySelector('#dropdown-list');
  const header = document.querySelector('#dropdown-header');
  const transferBtn = document.querySelector('#btn-confirm-transfer');
  
  // Toggle menu visibility
  header.onclick = (e) => {
    e.stopPropagation();
    const isVisible = listContainer.style.display === 'block';
    listContainer.style.display = isVisible ? 'none' : 'block';
  };

  // Close menu if clicking anywhere else
  window.onclick = () => { listContainer.style.display = 'none'; };

  const currentSnapshot = participants.map(p => p.id).sort().join(',');

  if (listContainer && currentSnapshot !== lastParticipantsSnapshot) {
    lastParticipantsSnapshot = currentSnapshot;
    const playersExcludingHost = participants.filter(p => p.id !== currentHostId);

    if (playersExcludingHost.length === 0) {
      listContainer.innerHTML = `
        <div class="dropdown-item dropdown-item-empty">
          No other players in room
        </div>
      `;
    } else {
      listContainer.innerHTML = playersExcludingHost.map(p => {
        const avatarUrl = getAvatarUrl(p);
        const displayName = getDisplayName(p);

        return `
          <div class="dropdown-item" data-id="${p.id}" data-name="${displayName}" data-avatar="${avatarUrl}">
            <img src="${avatarUrl}" class="avatar-tiny" />
            <span>${displayName}</span>
          </div>
        `;
      }).join('');

      // Handle Selecting a Player
      listContainer.querySelectorAll('.dropdown-item').forEach(item => {
        item.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          const { id, name, avatar } = item.dataset;

          header.innerHTML = `
            <img src="${avatar}" class="avatar-tiny" />
            <span>${name}</span>
          `;

          transferBtn.dataset.selectedId = id;
          transferBtn.disabled = false;
          listContainer.style.display = 'none';
        };
      });
    }
  }

  // Handle the actual Transfer Button Click
  transferBtn.onclick = async () => {
    const newHostId = transferBtn.dataset.selectedId;
    if (!newHostId) return;

    transferBtn.textContent = "Transferring...";
    transferBtn.disabled = true;

    try {
      await backend.assignNewHost(discordSdk.instanceId, auth.user.id, newHostId);
      header.textContent = "Select a player...";
      lastParticipantsSnapshot = ""; 
    } catch (err) {
      console.error(err);
      transferBtn.textContent = "Error!";
      setTimeout(() => { 
        transferBtn.textContent = "Transfer 👑"; 
        transferBtn.disabled = false; 
      }, 2000);
    }
  };
}

function handleLobbyUI(participants, readyUsers, isHost) {
  document.querySelector('#lobby').style.display = 'block';
  document.querySelector('#results').style.display = 'none';
  if (isHost) {
    showLobbyHostUI();
    renderHostChangeUI(participants);
  } else {
    showLobbyGuesserUI();
  }

  const startBtn = document.querySelector('#btn-start');
  if (!startBtn) return;

  const playersExcludingHost = participants.filter(p => p.id !== currentHostId);
  // Ensure there is at least 1 player and they are all ready
  const allPlayersReady = playersExcludingHost.length > 0 && 
                   playersExcludingHost.every(p => readyUsers.includes(p.id));

  startBtn.disabled = !allPlayersReady;
  startBtn.textContent = allPlayersReady 
    ? "Start Game" 
    : `Waiting... (${readyUsers.length}/${playersExcludingHost.length})`;
}

async function handleTrackSelectionUI(currentRound, isHost) {
  document.querySelector('#lobby').style.display = 'none';
  document.querySelector('#results').style.display = 'none';
  document.querySelector('#selection').style.display = 'block';

  document.querySelector('#selection-guesser-ui').style.display = isHost ? 'none' : 'block';
  document.querySelector('#selection-host-ui').style.display = isHost ? 'block' : 'none';

  if (isHost && localLastRound !== currentRound) {
    renderHostTrackPicker();
    localLastRound = currentRound;
  }
}

async function handlePlayingUI(currentRound, isHost) {
  document.querySelector('#game-arena').style.display = 'block';
  document.querySelector('#selection').style.display = 'none';

  // Toggle visibility based on role
  document.querySelector('#game-guesser-ui').style.display = isHost ? 'none' : 'block';
  document.querySelector('#game-host-ui').style.display = isHost ? 'block' : 'none';

  document.querySelector('#round-display').textContent = `Round ${currentRound}`;

  syncMusic(audioPlayer);
}

async function renderHostTrackPicker() {
  const list = document.querySelector('#track-selection-list');
  list.innerHTML = 'Loading tracks...';

  try {
    const tracks = await backend.getTrackList(discordSdk.instanceId, auth.user.id);

    list.innerHTML = ''; // Clear loading text

    tracks.forEach(track => {
      const btn = document.createElement('button');
      btn.textContent = track.name;

      if (track.played) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
      }

      btn.onclick = async () => {
        const allButtons = list.querySelectorAll('button');
        allButtons.forEach(b => {
          b.disabled = true;
          b.style.opacity = "0.5";
          b.style.cursor = "not-allowed";
        });

        // Logic: Host picks track -> Backend updates trackInfo -> All clients sync
        await backend.playTrack(track.file, discordSdk.instanceId, auth.user.id);
        
        // Feedback for host
        btn.style.background = "#3ba55e";
        console.log(`Now playing: ${track.name}`);
      };
      list.appendChild(btn);
    });
  } catch (err) {
    console.error("Failed to load track list:", err);
    list.innerHTML = 'Error loading tracks. Check public/tracks.json';
  }
}

async function syncMusic(player) {
  try {
    const { url, startTime, endTime } = await backend.getCurrentTrack(discordSdk.instanceId);

    if (!url) return;

    const countdownOverlay = document.querySelector('#countdown-overlay');
    const countdownNumber = document.querySelector('#countdown-number');
    const progressBar = document.querySelector('#progress-bar');

    const now = Date.now();
    const totalDuration = endTime - startTime;
    const timePassed = now - startTime;

    // 1. Countdown Phase (before startTime)
    if (timePassed < 0) {
      const remainingSeconds = Math.abs(Math.ceil(timePassed / 1000));

      countdownOverlay.style.display = 'flex';
      countdownNumber.innerText = remainingSeconds > 0 ? remainingSeconds : "GO!";

      // Ensure player is paused and ready at the start
      player.pause();
      player.currentTime = 0;
      if (player.src !== window.location.origin + url) player.src = url;

      progressBar.style.width = '100%';
      return; // Don't play the track until the countdown finishes
    }

    // 2. Playing Phase
    countdownOverlay.style.display = 'none';

    let percentage = 100 - (timePassed / totalDuration * 100);
    percentage = Math.max(0, Math.min(100, percentage));
    progressBar.style.width = `${percentage}%`;

    if (percentage < 20) {
      progressBar.style.backgroundColor = '#f04747'; // Red
    } else {
      progressBar.style.backgroundColor = '#5865f2'; // Blurple
    }

    // Check if we need to load a new source
    if (player.src !== window.location.origin + url) {
      player.src = url;
    }

    // Sync timing
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    // If we are more than 2 seconds out of sync, snap to server time
    if (Math.abs(player.currentTime - elapsedSeconds) > 2) {
      player.currentTime = elapsedSeconds;
    }

    if (player.paused) {
      player.play().catch(e => console.log("Waiting for user interaction..."));
    }

    if (lastState !== GameState.PLAYING) {
      const input = document.querySelector('#guess-input');
      if (document.activeElement !== input && !input.disabled) {
          input.focus();
      }
      lastState = GameState.PLAYING;
    }
  } catch (err) {
    console.error("Sync error:", err);
  }
}

async function handleRoundCompletedUI(participants, isHost) {
  const container = document.querySelector('#results');
  container.style.display = 'block';
  document.querySelector('#game-arena').style.display = 'none';

  if (lastState === GameState.ROUND_COMPLETED) return; // Prevent duplicate rendering
  lastState = GameState.ROUND_COMPLETED;

  if (isHost) {
    const { round, answer, guesses, timedOut } = await backend.getGuesses(discordSdk.instanceId, auth.user.id);

    const findUser = (id) => participants.find(p => p.id === id) || { username: 'Unknown', avatar: null };

    container.innerHTML = `
      <h2>Round ${round} Results</h2>
      <p>The correct answer was: <strong>${answer}</strong></p>
      <div id="guess-list">
        ${Object.entries(guesses).map(([userId, guess]) => {
          const user = findUser(userId);
          const displayName = getDisplayName(user);
          const avatarUrl = getAvatarUrl(user);

          return `
            <div class="guess-item" data-user-id="${userId}">
              <div class="user-info">
                <img src="${avatarUrl}" class="avatar-small" alt="${displayName}" />
                <span class="username">${displayName}</span>
                <span class="guess-text">"${guess.text}"</span>
              </div>
              
              <div class="button-group">
                <input type="radio" id="wrong-${userId}" name="score-${userId}" value="0" checked>
                <label for="wrong-${userId}" class="btn-radio wrong">Wrong</label>

                <input type="radio" id="partial-${userId}" name="score-${userId}" value="0.5">
                <label for="partial-${userId}" class="btn-radio partial">Partial</label>

                <input type="radio" id="correct-${userId}" name="score-${userId}" value="1">
                <label for="correct-${userId}" class="btn-radio correct">Correct</label>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${timedOut.length > 0 ? `
        <div class="timed-out-section">
          <p>No Guess submitted:
            ${timedOut.map(userId => {
              const user = findUser(userId);
              return user ? getDisplayName(user) : 'Unknown';
            }).join(', ')}
          </p>
        </div>
      ` : ''}
      <button id="btn-submit-reviewed-results">Submit Reviewed Results</button>
    `;

    document.querySelector('#btn-submit-reviewed-results').onclick = async () => {
      const corrections = {};
      document.querySelectorAll('.guess-item').forEach(item => {
        const userId = item.getAttribute('data-user-id');
        const selectedValue = item.querySelector(`input[name="score-${userId}"]:checked`).value;
        corrections[userId] = parseFloat(selectedValue);
      });

      await backend.submitRoundResults(discordSdk.instanceId, auth.user.id, corrections);
    };
  } else {
    container.innerHTML = `<h2>Waiting for host to review answers...</h2>`;
  }
}

async function handleResultsUI(participants, readyUsers, isFinalRound, isHost) {
  const container = document.querySelector('#results');
  container.style.display = 'block';
  document.querySelector('#game-arena').style.display = 'none';
  document.querySelector('#lobby').style.display = 'block';

  if (lastState === GameState.ROUND_COMPLETED) {
    document.querySelector('#guess-input').value = "";
    document.querySelector('#progress-bar').style.width = `0%`;
    document.querySelector('#progress-bar').style.backgroundColor = '#5865f2';
  }
  lastState = GameState.RESULTS;

  if (isHost) {
    container.innerHTML = `<h2>Waiting for players to review results...</h2>`;

    const startBtn = document.querySelector('#btn-next-round');
    if (!startBtn) return;

    document.querySelector('#lobby-host-ui-next-round').style.display = 'block';
    document.querySelector('#lobby-host-ui').style.display = 'none';

    const playersExcludingHost = participants.filter(p => p.id !== currentHostId);
    // Ensure there is at least 1 player and they are all ready
    const allPlayersReady = playersExcludingHost.length > 0 && 
                    playersExcludingHost.every(p => readyUsers.includes(p.id));

    startBtn.disabled = !allPlayersReady;
    let buttonText = isFinalRound ? "Show Final Results" : "Next Round";
    startBtn.textContent = allPlayersReady 
      ? buttonText 
      : `Waiting... (${readyUsers.length}/${playersExcludingHost.length})`;
  } else {
    const data = await backend.getRoundResults(discordSdk.instanceId, auth.user.id);

    container.innerHTML = `
      <div class="round-result-summary">
        <h2>Round ${data.round} Results</h2>
        <p>Your guess: <strong>${data.result?.guess || 'No guess submitted'}</strong></p>
        <p>${data.result?.isCorrect ? "Correct! 🎉" : "Incorrect. 😢"}</p>
        <p>You earned <strong>${data.result?.points || 0}</strong> points this round.</p>
        <p>The correct answer was: <strong>${data.correctAnswer}</strong></p>
      </div>
    `;

    showLobbyGuesserUI();
  }
}

async function handleFinalResultsUI(participants, isHost) {
  const resultsContainer = document.querySelector('#results');

  document.querySelector('#lobby').style.display = 'none';
  document.querySelector('#lobby-host-ui-next-round').style.display = 'none';
  resultsContainer.style.display = 'block';

  if (lastState === GameState.GAME_FINISHED) return; // Prevent duplicate rendering
  lastState = GameState.GAME_FINISHED;

  const { leaderboard } = await backend.getFinalResults(discordSdk.instanceId);

  resultsContainer.innerHTML = `
    <div class="final-leaderboard">
      <h1 class="results-title">🏆 Final Results</h1>
      
      <div class="leaderboard-container">
        ${leaderboard.map((player, index) => {
          const discordUser = participants.find(p => p.id === player.userId) || 
                              { username: player.userId || 'Unknown' };
          return renderPlayerRow(player, index, discordUser);
        }).join('')}
      </div>

      ${isHost ? '<button id="btn-restart">Play Again</button>' : '<p class="waiting-msg">Waiting for host to restart...</p>'}
    </div>
  `;

  if (isHost) {
    document.querySelector('#btn-restart').onclick = () => backend.restartGame(discordSdk.instanceId, auth.user.id);
  }
}

function renderPlayerRow(player, index, discordUser) {
  const isWinner = index === 0;
  const avatarUrl = getAvatarUrl(discordUser);
  const displayName = getDisplayName(discordUser);

  return `
    <div class="player-card ${isWinner ? 'winner' : ''}">
      <div class="player-main-info">
        <div class="rank">#${index + 1}</div>
        <img src="${avatarUrl}" class="avatar-small" alt="${displayName}" />
        <div class="name">${isWinner ? '👑 ' : ''}${displayName}</div>
        <div class="total-score">${player.totalScore} pts</div>
      </div>
      
      <div class="history-grid">
        <div class="history-label">Round Breakdown:</div>
        <div class="round-bubbles">
          ${player.roundHistory.map(r => {
            const isFirstClass = r.isFirst ? 'first' : '';
            const statusClass = r.isCorrect ? 'correct' : 'incorrect';

            return `
              <div class="round-bubble ${statusClass} ${isFirstClass}" title="Round ${r.round}: ${r.guess}">
                ${r.points}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

document.querySelector('#app').innerHTML = `
  <div class="container">
    <div class="game-area">
      <img src="${rocketLogo}" class="logo" alt="Discord" />
      <h1>Welcome to YASQ!</h1>

      <div id="results" style="display: none;">
      </div>

      <div id="lobby">
        <div id="lobby-host-ui" style="display: none;">
          <div class="host-settings">
            <label class="setting-item">
              <span>Number of Rounds</span>
              <input type="number" id="rounds-input" min="1" max="20" value="5" />
            </label>
            <label class="setting-item">
              <span>Track Duration (sec)</span>
              <input type="number" id="duration-input" min="10" max="120" value="30" />
            </label>
            <button id="btn-start">Start Game</button>
            <div class="setting-group">
              <div class="setting-item">
                <label for="host-dropdown" class="setting-label"><span>Transfer Host</span></label>
                <div class="transfer-controls-row">
                  <div class="custom-dropdown" id="host-dropdown">
                    <div class="dropdown-header" id="dropdown-header">Select a player...</div>
                    <div class="dropdown-list" id="dropdown-list" style="display: none;">
                      </div>
                  </div>
                  <button id="btn-confirm-transfer" disabled>Transfer</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="lobby-host-ui-next-round" style="display: none;">
          <button id="btn-next-round">Next Round</button>
        </div>
        <div id="lobby-guesser-ui" style="display: none;">
          <button id="btn-ready" class="lobby-btn">Ready Up</button>
        </div>
      </div>

      <div id="selection" style="display: none;">
        <div id="selection-guesser-ui" style="display: none;">
          <h2>Waiting for host to select a track...</h2>
        </div>

        <div id="selection-host-ui" style="display: none;">
          <h2>Select the next track to challenge players:</h2>
          <div id="track-selection-list">
          </div>
        </div>
      </div>

      <div id="game-arena" style="display: none;">
        <h2 id="round-display"></h2>

        <div id="game-guesser-ui" style="display: none;">
          <div id="countdown-overlay" style="display: none;">
            <div id="countdown-number">3</div>
          </div>
          <form id="game-guesser-form">
            <input type="text" id="guess-input" placeholder="Enter game title..." />
            <button type="submit" id="btn-submit">Submit Guess</button>
          </form>
        </div>

        <div id="game-host-ui" style="display: none;">
          <h2>Waiting for players to submit their guesses...</h2>
        </div>

        <div id="progress-container">
          <div id="progress-bar"></div>
        </div>
      </div>

      <div id="music-controls">
        <div style="margin-top: 10px;">
          <label for="volume-slider" style="font-size: 0.8em; display: block;">Volume</label>
          <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0.5" style="width: 100px;">
        </div>
        <audio id="global-player"></audio>
      </div>
    </div>
    <div class="sidebar">
      <h3>Participating Players</h3>
      <div id="participant-list">
        
      </div>
    </div>
  </div>
`;
