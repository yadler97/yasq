import { Participant } from "./src/types";

export function getAvatarUrl(participant: Participant) {
  return participant.avatar
    ? `https://cdn.discordapp.com/avatars/${participant.id}/${participant.avatar}.png?size=32`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(participant.id) % 5}.png`;
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
  return str.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}