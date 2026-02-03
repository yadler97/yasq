import { DiscordSDK } from "@discord/embedded-app-sdk";

import rocketLogo from '/rocket.png';
import "./style.css";

// Will eventually store the authenticated user's access_token
let auth;
let currentHostId = null;

const discordSdk = new DiscordSDK(
  import.meta.env.VITE_DISCORD_CLIENT_ID
);

let audioPlayer;
let volumeSlider;

setupDiscordSdk().then(async () => {
  logToServer("Discord SDK is authenticated");

  // 1. Initial User Fetch
  const initialData = await discordSdk.commands.getInstanceConnectedParticipants();
  renderParticipants(initialData.participants);

  // 2. Subscribe to live updates
  discordSdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (event) => {
    console.log("Participants changed!", event.participants);
    renderParticipants(event.participants);
  });

  appendVoiceChannelName();
  appendGuildAvatar();

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
  const response = await fetch("/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
    }),
  });
  const { access_token } = await response.json();

  // Authenticate with Discord client (using the access_token)
  auth = await discordSdk.commands.authenticate({
    access_token,
  });

  if (auth == null) {
    throw new Error("Authenticate command failed");
  }

  // Register with our backend
  const registration = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instanceId: discordSdk.instanceId,
      userId: auth.user.id,
      username: auth.user.username
    }),
  }).then(res => res.json());

  currentHostId = registration.hostId;

  if (registration.isHost) {
    showHostUI();
  }

  audioPlayer = document.querySelector('#global-player');
  volumeSlider = document.querySelector('#volume-slider');

  // Set initial volume to 50%
  audioPlayer.volume = 0.5;

  // Listen for slider changes
  volumeSlider.oninput = (e) => {
    const newVolume = e.target.value;
    audioPlayer.volume = newVolume;
  };

  document.querySelector('#sync-audio').onclick = () => {
    syncMusic(audioPlayer);
    setInterval(() => syncMusic(audioPlayer), 5000);
    document.querySelector('#sync-audio').textContent = "Syncing...";
  };
}

async function appendVoiceChannelName() {
  const app = document.querySelector('#app');

  let activityChannelName = 'Unknown';

  // Requesting the channel in GDMs (when the guild ID is null) requires
  // the dm_channels.read scope which requires Discord approval.
  if (discordSdk.channelId != null && discordSdk.guildId != null) {
    // Over RPC collect info about the channel
    const channel = await discordSdk.commands.getChannel({channel_id: discordSdk.channelId});
    if (channel.name != null) {
      activityChannelName = channel.name;
    }
  }

  // Update the UI with the name of the current voice channel
  const textTagString = `Activity Channel: "${activityChannelName}"`;
  const textTag = document.createElement('p');
  textTag.textContent = textTagString;
  app.appendChild(textTag);
}

async function appendGuildAvatar() {
  const app = document.querySelector('#app');

  // 1. From the HTTP API fetch a list of all of the user's guilds
  const guilds = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
    headers: {
      // NOTE: we're using the access_token provided by the "authenticate" command
      Authorization: `Bearer ${auth.access_token}`,
      'Content-Type': 'application/json',
    },
  }).then((response) => response.json());

  // 2. Find the current guild's info, including it's "icon"
  const currentGuild = guilds.find((g) => g.id === discordSdk.guildId);

  // 3. Append to the UI an img tag with the related information
  if (currentGuild != null) {
    const guildImg = document.createElement('img');
    guildImg.setAttribute(
      'src',
      // More info on image formatting here: https://discord.com/developers/docs/reference#image-formatting
      `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.webp?size=128`
    );
    guildImg.setAttribute('width', '128px');
    guildImg.setAttribute('height', '128px');
    guildImg.setAttribute('style', 'border-radius: 50%;');
    app.appendChild(guildImg);

    const guildP = document.createElement('p');
    guildP.textContent = currentGuild.name;
    app.appendChild(guildP);
  }
}

function renderParticipants(participants) {
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
    if (p.id === currentHostId) {
      const hostLabel = document.createElement('span');
      hostLabel.className = 'host-label';
      hostLabel.textContent = 'HOST';
      nameTag.appendChild(hostLabel);
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(nameTag);
    fragment.appendChild(wrapper);
  });

  listContainer.appendChild(fragment);
}

function showHostUI() {
  const hostDiv = document.querySelector('#host-controls');
  if (hostDiv) {
    hostDiv.style.display = 'block';
    
    // Create a play button for the host
    const playBtn = document.createElement('button');
    playBtn.textContent = "▶️ Play track001.mp3 for everyone";
    playBtn.onclick = async () => {
      await fetch("/api/play-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "track001.mp3",
          instanceId: discordSdk.instanceId,
          userId: auth.user.id
        })
      });
      // After setting the track on server, start playing locally
      syncMusic(audioPlayer);
    };
    hostDiv.appendChild(playBtn);

    const playBtn2 = document.createElement('button');
    playBtn2.textContent = "▶️ Play track002.mp3 for everyone";
    playBtn2.onclick = async () => {
      await fetch("/api/play-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "track002.mp3",
          instanceId: discordSdk.instanceId,
          userId: auth.user.id
        })
      });
      // After setting the track on server, start playing locally
      syncMusic(audioPlayer);
    };
    hostDiv.appendChild(playBtn2);
    
    logToServer("Host UI initialized with Play controls.");
  }
}

async function syncMusic(player) {
  try {
    const response = await fetch(`/api/current-track?instanceId=${discordSdk.instanceId}`);
    const data = await response.json();
    
    if (!data.url) return;

    // Check if we need to load a new source
    if (player.src !== window.location.origin + data.url) {
      player.src = data.url;
    }
    
    // Sync timing
    const serverTimeMs = data.startTime;
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

async function logToServer(message) {
  await fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      message, 
      user: auth.user.username
    }),
  });
}

document.querySelector('#app').innerHTML = `
  <div class="container">
    <div>
      <img src="${rocketLogo}" class="logo" alt="Discord" />
      <h1>Welcome to YASQ!</h1>
      
      <div id="host-controls" style="display: none;">
        <button id="admin-button">Start Game</button>
      </div>
      <div id="music-controls">
        <button id="sync-audio">Join Audio Circle</button>
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
