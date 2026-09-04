import { getDisplayName, Participant } from '@yasq/shared';
import { findUser, getGameDuration } from '../utils/helper';

export const GameStatsSummary = ({ stats, participants }: { stats: any; participants: Participant[] }) => {
  const highestPoints = stats.bestScoringRound
    ? stats.bestScoringRound.roundResults.reduce((sum: number, r: any) => sum + (r.points || 0), 0)
    : 0;

  const highestStreakUser = stats.highestStreak ? findUser(participants, stats.highestStreak.userId) : null;

  const statItems = [
    {
      label: 'Duration',
      value: getGameDuration(stats.startTime, stats.endTime),
    },
    {
      label: 'Highest Streak',
      value:
        stats.highestStreak && highestStreakUser
          ? `${getDisplayName(highestStreakUser)} (${stats.highestStreak.streak})`
          : 'None',
    },
    {
      label: 'Best Round',
      value: stats.bestScoringRound ? `Round ${stats.bestScoringRound.roundResults[0]?.round || 'N/A'}` : 'N/A',
      subValue: `${highestPoints} pts`,
    },
  ];

  return (
    <div className="game-stats">
      <h2>📊 Game Highlights</h2>
      <div className="game-stats-grid">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="game-stat-item"
          >
            <span className="game-stat-label">{item.label}</span>
            <strong className="game-stat-value">{item.value}</strong>
            {item.subValue && <span className="game-stat-subvalue">{item.subValue}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
