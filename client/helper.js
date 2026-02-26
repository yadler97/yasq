export function getAvatarUrl(participant) {
  return participant.avatar
    ? `https://cdn.discordapp.com/avatars/${participant.id}/${participant.avatar}.png?size=32`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(participant.id) % 5}.png`;
}

export function getDisplayName(participant) {
  return participant.nickname || participant.username;
}

export function getUserId(auth) {
  if (!auth || !auth.user) {
    return null;
  }
  return auth.user.id;
}