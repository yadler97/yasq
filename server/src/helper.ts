export async function validateToken(token: string) {
  if (process.env.VITE_MOCK_MODE === 'true') {
    return token.split("_")[1];
  }

  const response = await fetch(`https://discord.com/api/users/@me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) return null;
  
  const discordUser = await response.json() as { id: string };
  const userId = discordUser.id;

  return userId;
}