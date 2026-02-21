export const generatePlayers = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i}`,
    username: `MockPlayer${i}`
  }));
};