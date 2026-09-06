import { getAvatarUrl, getDisplayName, Participant } from '@yasq/shared';
import { findUser, getGameDuration } from '../utils/helper';
import { DiscordAvatar } from './DiscordAvatar';

export const GameStatsSummary = ({ stats, participants }: { stats: any; participants: Participant[] }) => {
  const highestTimeBonus = stats.bestScoringRound?.timeBonusSum ?? 0;
  const leastTimeBonus = stats.leastScoringRound?.timeBonusSum ?? 0;

  const highestStreakUser = stats.highestStreak ? findUser(participants, stats.highestStreak.userId) : null;
  const fastestCorrectGuessUser = stats.fastestCorrectGuess
    ? findUser(participants, stats.fastestCorrectGuess.roundResults.userId)
    : null;

  const statItems = [
    {
      label: 'Duration',
      value: getGameDuration(stats.startTime, stats.endTime),
    },
    {
      label: 'Highest Streak',
      user: highestStreakUser,
      value: highestStreakUser ? `${getDisplayName(highestStreakUser)}` : 'None',
      subValue: stats.highestStreak ? `🔥 ${stats.highestStreak.streak}` : '',
    },
    {
      label: 'Best Round',
      value: stats.bestScoringRound ? `Round ${stats.bestScoringRound.roundResults[0]?.round || 'N/A'}` : 'N/A',
      subValue: `${highestTimeBonus} pts`,
    },
    {
      label: 'Least Round',
      value: stats.leastScoringRound ? `Round ${stats.leastScoringRound.roundResults[0]?.round || 'N/A'}` : 'N/A',
      subValue: `${leastTimeBonus} pts`,
    },
    {
      label: 'Fastest Correct Guess',
      user: fastestCorrectGuessUser,
      value: fastestCorrectGuessUser ? `${getDisplayName(fastestCorrectGuessUser)}` : 'None',
      subValue: stats.fastestCorrectGuess
        ? `${stats.fastestCorrectGuess.roundResults.time || 'N/A'}s (Round ${stats.fastestCorrectGuess.roundResults.round || 'N/A'})`
        : '',
    },
  ];

  return (
    <div className="game-stats">
      <h2>📊 Game Highlights</h2>
      <div className="game-stats-grid">
        {statItems.map((item, index) => {
          const userName = item.user ? getDisplayName(item.user) : '';
          const avatarUrl = item.user ? getAvatarUrl(item.user) : '';

          return (
            <div
              key={index}
              className="game-stat-item"
            >
              <span className="game-stat-label">{item.label}</span>
              <div className="game-stat-content">
                {item.user && (
                  <DiscordAvatar
                    src={avatarUrl}
                    userName={userName}
                    tiny={true}
                    hasTooltip={false}
                  />
                )}
                <strong className="game-stat-value">{item.value}</strong>
              </div>
              {item.subValue && <span className="game-stat-subvalue">{item.subValue}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
