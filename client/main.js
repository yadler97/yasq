import { DiscordSDK } from "@discord/embedded-app-sdk";

import rocketLogo from '/rocket.png';
import "./style.css";

// Will eventually store the authenticated user's access_token
let auth;

const discordSdk = new DiscordSDK(
  import.meta.env.VITE_DISCORD_CLIENT_ID
);

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

  if (registration.isHost) {
    showHostUI();
  }
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
  listContainer.innerHTML = '<h3>Users in Activity:</h3>';

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
    logToServer("UI updated for Host permissions.");
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
  <div>
    <img src="${rocketLogo}" class="logo" alt="Discord" />
    <h1>Hello, World!</h1>
    <div id="participant-list"></div>
    <div id="host-controls" style="display: none;">
       <button id="admin-button">Start Game</button>
    </div>
  </div>
`;
