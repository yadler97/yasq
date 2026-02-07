import { DiscordSDK } from "@discord/embedded-app-sdk";
import * as backend from "./backend.js";
import { GameState } from './constants.js';

import rocketLogo from '/rocket.png';
import "./style.css";

// Will eventually store the authenticated user's access_token
let auth;
let currentHostId = null;
let isReady = false;
let registration;
let localLastRound = null;
let lastState = null;

const discordSdk = new DiscordSDK(
  import.meta.env.VITE_DISCORD_CLIENT_ID
);

let audioPlayer;
let volumeSlider;

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
    const { state, readyUsers, currentRound } = await backend.getGameStatus(discordSdk.instanceId);
    const pData = await discordSdk.commands.getInstanceConnectedParticipants();

    // 1. Always update participants
    renderParticipants(pData.participants, readyUsers);

    // 2. Handle State Transitions
    switch (state) {
      case GameState.LOBBY:
        handleLobbyUI(pData.participants, readyUsers, registration.isHost);
        break;
      case GameState.TRACK_SELECTION:
        handleTrackSelectionUI(currentRound, registration.isHost);
        break;
      case GameState.PLAYING:
        handlePlayingUI(currentRound, registration.isHost);
        break;
      case GameState.ROUND_COMPLETED:
        handleRoundCompletedUI(pData.participants, registration.isHost);
        break;
      case GameState.RESULTS:
        handleResultsUI(pData.participants, readyUsers, registration.isHost);
        break;
      case GameState.GAME_FINISHED:
        // TODO: Show final results screen
        break;
    }
  }, 1000);

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
  registration = await backend.registerUser(discordSdk.instanceId, auth.user.id, auth.user.username);

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

  currentHostId = registration.hostId;

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

function renderParticipants(participants, readyUsers = []) {
  const listContainer = document.querySelector('#participant-list');
  
  // Clear the current list
  listContainer.innerHTML = '';

  // Create a fragment to improve performance during DOM manipulation
  const fragment = document.createDocumentFragment();

  participants.forEach((p) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.margin = '5px 0';

    // Get the display name (nickname first, then username)
    const displayName = p.nickname || p.username;

    // Create a small avatar
    const avatar = document.createElement('img');
    const avatarHash = p.avatar;
    avatar.src = avatarHash 
      ? `https://cdn.discordapp.com/avatars/${p.id}/${avatarHash}.webp?size=32`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(p.id) % 5}.png`;
    avatar.style.width = '24px';
    avatar.style.borderRadius = '50%';
    avatar.style.marginRight = '8px';

    const nameTag = document.createElement('span');
    nameTag.textContent = displayName;

    // Add host label if this participant is the host
    // Or ready label if they are marked as ready
    if (p.id === currentHostId) {
      const hostLabel = document.createElement('span');
      hostLabel.className = 'host-badge';
      hostLabel.textContent = 'HOST';
      nameTag.appendChild(hostLabel);
    } else if (readyUsers.includes(p.id)) {
      const readyLabel = document.createElement('span');
      readyLabel.className = 'ready-badge';
      readyLabel.textContent = 'READY';
      nameTag.appendChild(readyLabel);
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(nameTag);
    fragment.appendChild(wrapper);
  });

  listContainer.appendChild(fragment);
}

async function toggleReady() {
  isReady = !isReady;
  const btn = document.querySelector('#btn-ready');
  btn.textContent = isReady ? "I'm Ready! ✅" : "Ready Up";
  btn.style.background = isReady ? "#3ba55e" : "";

  await backend.updateReadyStatus(discordSdk.instanceId, auth.user.id, isReady);
}

function showLobbyHostUI() {
  const hostDiv = document.querySelector('#lobby-host-ui');
  if (hostDiv) hostDiv.style.display = 'block';
}

function showLobbyGuesserUI() {
  const lobbyDiv = document.querySelector('#lobby-guesser-ui');
  if (lobbyDiv) lobbyDiv.style.display = 'block';
}

function handleLobbyUI(participants, readyUsers, isHost) {
  if (isHost) {
    showLobbyHostUI();
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

  // 1. Sync Music
  syncMusic(audioPlayer);

  // 3. Guesser-Specific: Reset input on new round
  //if (!isHost && localLastRound !== currentRound) {
  //  resetGuesserInput();
  //  localLastRound = currentRound;
  //}

  // const input = document.querySelector('#guess-input');
  // if (document.activeElement !== input && !input.disabled) {
  //   input.focus();
  // }
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

    const now = Date.now();
    const totalDuration = endTime - startTime;
    const timePassed = now - startTime;

    let percentage = 100 - (timePassed / totalDuration * 100);
    percentage = Math.max(0, Math.min(100, percentage));

    const progressBar = document.querySelector('#progress-bar');
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
    const serverTimeMs = startTime;
    const elapsedSeconds = (Date.now() - serverTimeMs) / 1000;
    
    // If we are more than 2 seconds out of sync, snap to server time
    if (Math.abs(player.currentTime - elapsedSeconds) > 2) {
      player.currentTime = elapsedSeconds;
    }
    
    if (player.paused) {
      player.play().catch(e => console.log("Waiting for user interaction..."));
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
    const data = await backend.getGuesses(discordSdk.instanceId, auth.user.id);

    const findUser = (id) => participants.find(p => p.id === id) || { username: 'Unknown', avatar: null };

    container.innerHTML = `
      <h2>Round ${data.round} Results</h2>
      <p>The correct answer was: <strong>${data.answer}</strong></p>
      <ul id="guess-list">
        ${Object.entries(data.guesses).map(([userId, guess]) => {
          const user = findUser(userId);
          const avatarUrl = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`;

          return `
            <li class="guess-item">
              <img src="${avatarUrl}" class="avatar-small" alt="${user.username}" />
              <span class="username">${user.username}</span>
              <span class="guess-text">"${guess.text}"</span>
              <label class="checkbox-container">
                <input type="checkbox" class="correct-checkbox" data-user-id="${userId}" />
                Mark Correct
              </label>
            </li>
          `;
        }).join('')}
      </ul>
      <button id="btn-submit-corrected-results">Submit Corrected Results</button>
    `;

    document.querySelector('#btn-submit-corrected-results').onclick = async () => {
      const checkboxes = document.querySelectorAll('.correct-checkbox');

      const corrections = {};
      checkboxes.forEach(cb => {
        const userId = cb.getAttribute('data-user-id');
        corrections[userId] = cb.checked; 
      });

      await backend.submitRoundResults(discordSdk.instanceId, auth.user.id, corrections);
    };
  } else {
    container.innerHTML = `<h2>Waiting for host to correct answers...</h2>`;
  }
}

async function handleResultsUI(participants, readyUsers, isHost) {
  const container = document.querySelector('#results');
  container.style.display = 'block';
  document.querySelector('#game-arena').style.display = 'none';
  document.querySelector('#lobby').style.display = 'block';

  if (lastState === GameState.ROUND_COMPLETED) {
    isReady = false; // Reset ready status for next round
    document.querySelector('#btn-ready').textContent = "Ready Up";
    document.querySelector('#btn-ready').style.background = "";
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
    startBtn.textContent = allPlayersReady 
      ? "Next Round" 
      : `Waiting... (${readyUsers.length}/${playersExcludingHost.length})`;
  } else {
    const data = await backend.getRoundResults(discordSdk.instanceId, auth.user.id);

    container.innerHTML = `
      <h2>Round ${data.round} Results</h2>
      <p>Your guess: <strong>"${data.guess?.text || 'No guess submitted'}"</strong></p>
      <p>${data.guess?.isCorrect ? "Correct! 🎉" : "Incorrect. 😢"}</p>
    `;

    showLobbyGuesserUI();
  }
}

document.querySelector('#app').innerHTML = `
  <div class="container">
    <div>
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
    <div>
      <h3>Participating Players:</h3>
      <div id="participant-list">
        
      </div>
    </div>
  </div>
`;
