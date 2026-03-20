// Token -> { userId: string, expires: number }
const tokenCache = new Map<string, { userId: string, expires: number }>();
const TTL = 10 * 60 * 1000; // Cache for 10 minutes

export async function validateToken(token: string) {
  const now = Date.now();

  // 1. Check Cache First
  const cached = tokenCache.get(token);
  if (cached && cached.expires > now) {
    return cached.userId;
  }

  // 2. Check Mock Mode
  if (process.env.VITE_MOCK_MODE === 'true') {
    const mockId = token.split("_")[1] || "0";
    tokenCache.set(token, { userId: mockId, expires: now + TTL });
    return mockId;
  }

  // 3. Actual Discord Call
  try {
    const response = await fetch(`https://discord.com/api/users/@me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) return null;

    const discordUser = await response.json() as { id: string };
    const userId = discordUser.id;

    // Update Cache
    tokenCache.set(token, { userId, expires: now + TTL });
    return userId;
  } catch (error) {
    console.error("Discord Auth Error:", error);
    return null;
  }
}

export function invalidateToken(token: string) {
  return tokenCache.delete(token);
}