import { Joker } from "./constants";

export async function getToken(code: string) {
  const response = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return response.json();
}

export async function registerUser(instanceId: string, userId: string, username: string) {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId, username }),
  });
  return response.json();
}

export async function updateReadyStatus(instanceId: string, userId: string, isReady: boolean) {
  return fetch("/api/ready", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId, ready: isReady }),
  });
}

export async function assignNewHost(instanceId: string, userId: string, newHostId: string) {
  return fetch("/api/assign-host", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId, newHostId }),
  });
}

export async function getGameStatus(instanceId: string) {
  const response = await fetch(`/api/game-status?instanceId=${instanceId}`);
  return response.json();
}

export async function setupGame(instanceId: string, userId: string, rounds: number = 5, trackDuration: number = 30, enabledJokers: Joker[] = []) {
  return fetch("/api/setup-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      instanceId,
      userId,
      rounds,
      trackDuration,
      enabledJokers: Array.isArray(enabledJokers) ? enabledJokers : [...enabledJokers]
    }),
  });
}

export async function startGame(instanceId: string, userId: string) {
  return fetch("/api/start-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId }),
  });
}

export async function getTrackList(instanceId: string, userId: string) {
  const response = await fetch(`/api/track-list?instanceId=${instanceId}&userId=${userId}`);
  return response.json();
}

export async function submitGuess(instanceId: string, userId: string, guess: string) {
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

export async function getGuesses(instanceId: string, userId: string) {
  const response = await fetch(`/api/get-guesses?instanceId=${instanceId}&userId=${userId}`);
  return response.json();
}

export async function submitRoundResults(instanceId: string, userId: string, corrections: Record<string, number>) {
  return fetch("/api/submit-round-results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId, corrections }),
  });
}

export async function getRoundResults(instanceId: string, userId: string) {
  const response = await fetch(`/api/get-results?instanceId=${instanceId}&userId=${userId}`);
  return response.json();
}

export async function startNextRound(instanceId: string, userId: string) {
  return fetch("/api/start-next-round", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId })
  });
}

export async function getFinalResults(instanceId: string) {
  const response = await fetch(`/api/get-final-results?instanceId=${instanceId}`);
  return response.json();
}

export async function restartGame(instanceId: string, userId: string) {
  return fetch("/api/restart-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId })
  });
}

export async function getAvailableJokers(instanceId: string, userId: string) {
  const response = await fetch(`/api/get-available-jokers?instanceId=${instanceId}&userId=${userId}`);
  return response.json();
}

export async function useJoker(instanceId: string, userId: string, jokerType: Joker) {
  const response = await fetch("/api/use-joker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, userId, jokerType }),
  });
  return response.json();
}

export async function playTrack(fileName: string, instanceId: string, userId: string) {
  return fetch("/api/play-local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, instanceId, userId })
  });
}

export async function getCurrentTrack(instanceId: string) {
    const response = await fetch(`/api/current-track?instanceId=${instanceId}`);
    return response.json();
}

export async function logToServer(message: string, username: string) {
  return fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, user: username }),
  });
}