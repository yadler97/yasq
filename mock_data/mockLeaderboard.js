export const mockLeaderboard = {
  entries: [
    {
      userId: '1',
      totalScore: 585,
      roundHistory: [
        { round: 1, guess: "Xenoblade 2", points: 234, scoreValue: 1.0, isFirst: true, time: "1.5" },
        { round: 2, guess: "Persona 5", points: 216, scoreValue: 1.0, isFirst: true, time: "6.0" },
        { round: 3, guess: "Final Fantasy VII", points: 135, scoreValue: 1.0, isFirst: false, time: "6.0" }
      ]
    },
    {
      userId: '2',
      totalScore: 421,
      roundHistory: [
        { round: 1, guess: "Xeno 2", points: 110, scoreValue: 1.0, isFirst: false, time: "27.0" },
        { round: 2, guess: "Persona 4", points: 75, scoreValue: 0.5, isFirst: false, time: "15.0" },
        { round: 3, guess: "FF7", points: 236, scoreValue: 1.0, isFirst: true, time: "0.5" }
      ]
    },
    {
      userId: '3',
      totalScore: 0,
      roundHistory: [
        { round: 1, guess: "No guess submitted", points: 0, scoreValue: 0, isFirst: false, time: "30.0" },
        { round: 2, guess: "No guess submitted", points: 0, scoreValue: 0, isFirst: false, time: "30.0" },
        { round: 3, guess: "No guess submitted", points: 0, scoreValue: 0, isFirst: false, time: "30.0" }
      ]
    }
  ]
};