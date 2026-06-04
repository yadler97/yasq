import { Participant } from "./types";

const userCache = new Map<string, Participant>();

export function findUser(participants: Participant[], userId: string): Participant {
  const realUser = participants.find(p => p.id === userId);

  // Return user if present in game
  if (realUser) {
    userCache.set(userId, realUser);
    return realUser;
  }

  // Lookup cache if not present in game
  return userCache.get(userId) || { id: "0", username: "Unknown" };
}

export function getAvatarUrl(participant: Participant) {
  return participant.avatar
    ? `https://cdn.discordapp.com/avatars/${participant.id}/${participant.avatar}.png?size=32`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(participant.id) >> 22n) % 6}.png`;
}

export function getDisplayName(participant: Participant) {
  return participant.nickname || participant.global_name || participant.username;
}

export function getUserId(auth: any) {
  if (!auth || !auth.user) {
    return null;
  }
  return auth.user.id;
}

export function capitalize(str: string) {
  return str.toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}