export async function getToken(code) {
  const response = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return response.json();
}

export async function registerUser(instanceId, userId, username) {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId, username }),
  });
  return response.json();
}

export async function updateReadyStatus(instanceId, userId, isReady) {
  return fetch("/api/ready", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId, ready: isReady }),
  });
}

export async function getGameStatus(instanceId) {
  const response = await fetch(`/api/game-status?instanceId=${instanceId}`);
  return response.json();
}

export async function startGame(instanceId, userId) {
  return fetch("/api/start-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId })
  });
}

export async function getTrackList(instanceId, userId) {
  const response = await fetch(`/api/track-list?instanceId=${instanceId}&userId=${userId}`);
  return response.json();
}

export async function submitGuess(instanceId, userId, guess) {
  return fetch("/api/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instanceId,
      userId,
      guess,
      clientTimestamp: Date.now()
    }),
  });
}

export async function playTrack(fileName, instanceId, userId) {
  return fetch("/api/play-local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, instanceId, userId })
  });
}

export async function getCurrentTrack(instanceId) {
    const response = await fetch(`/api/current-track?instanceId=${instanceId}`);
    return response.json();
}

export async function logToServer(message, username) {
  return fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, user: username }),
  });
}