export const generatePlayers = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i}`,
    username: `MockPlayer${i}`
  }));
};