import { useSignal } from '@preact/signals';

import { RadioGroup } from './RadioGroup';
import { NonDraggableImg } from './NonDraggableImg';
import { ALL_JOKER_ICONS } from './Icons';
import { capitalize } from '../utils/helper';

export const HowToPlay = ({ isHost }: { isHost: boolean }) => {
  const activeTab = useSignal<'player' | 'host'>(isHost ? 'host' : 'player');

  return (
    <div>
      <RadioGroup<string>
        groupId="how-to-play-tabs"
        name="how-to-play-view"
        options={[
          { label: 'For Players', value: 'player' },
          { label: 'For Hosts', value: 'host' },
        ]}
        value={activeTab.value}
        onChange={val => (activeTab.value = val as 'player' | 'host')}
      />

      {activeTab.value === 'player' && (
        <div className="instructions-tab-content">
          <div className="instruction-step">
            <NonDraggableImg
              src="/how-to-play-player-1.png"
              alt="Guessing interface preview"
            />
            <div>
              <h3>🎵 Guess the Game</h3>
              <p>Listen to the audio track and guess the correct game as quick as possible!</p>
              <p>
                You can either submit your guess by clicking the <strong>Submit Guess</strong> button or by pressing{' '}
                <kbd>Enter</kbd>.
              </p>
              <p>If you don't answer in time, you will get zero points!</p>
              <p>
                Note: If the audio is too loud or quiet, you can adjust the volume via the controls in the bottom-right
                corner.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <NonDraggableImg
              src="/how-to-play-player-2.png"
              alt="Time bonuses and streaks preview"
            />
            <div>
              <h3>⚡ Time Bonuses & Streaks</h3>
              <p>
                Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum
                dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent
                luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Lorem ipsum dolor sit amet,
                consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam
                erat volutpat.{' '}
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <NonDraggableImg
              src="/how-to-play-player-3.png"
              alt="Jokers preview"
            />
            <div>
              <h3>❓ Jokers</h3>
              <p>Depending on the game settings, you have the following jokers to help you:</p>
              <ul>
                {ALL_JOKER_ICONS.map(Icon => {
                  return (
                    <li
                      key={Icon.jokerType}
                      className="joker-list-item"
                    >
                      <div className="joker-indicator">
                        <Icon size={20} />
                      </div>
                      <div>
                        <strong>{capitalize(Icon.jokerType)}: </strong>
                        <span>{Icon.description}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="instruction-step">
            <NonDraggableImg
              src="/how-to-play-player-4.png"
              alt="Final results preview"
            />
            <div>
              <h3>🏆 Final Results</h3>
              <p></p>
            </div>
          </div>
        </div>
      )}

      {activeTab.value === 'host' && (
        <div className="instructions-tab-content">
          <div className="instruction-step">
            <NonDraggableImg
              src="/how-to-play-host-1.png"
              alt="Host setup configuration preview"
            />
            <div>
              <h3>⚙️ Game Setup</h3>
              <p>As host you have to set the rules before the game starts:</p>
              <ul>
                <li>
                  <div>
                    <strong>Number of Rounds</strong>
                    <span>Each round consists of a distinct track that players have to guess.</span>
                  </div>
                </li>
                <li>
                  <div>
                    <strong>Max Guess Time</strong>
                    <span>
                      The time players have to submit their answer. After the time expires, the round will end
                      automatically.
                    </span>
                  </div>
                </li>
                <li>
                  <div>
                    <strong>Active Jokers</strong>
                  </div>
                </li>
              </ul>
              <p>You can also fine-tune the rules by opening the Advanced Settings:</p>
              <ul>
                <li>
                  <div>
                    <strong>Time Bonus</strong>
                  </div>
                </li>
                <li>
                  <div>
                    <strong>First Correct Answer Bonus</strong>
                  </div>
                </li>
                <li>
                  <div>
                    <strong>Streak Bonus</strong>
                  </div>
                </li>
                <li>
                  <div>
                    <strong>Achievement Bonus</strong>
                  </div>
                </li>
              </ul>
              <p>
                You can also transfer the host role to another player. You will then participate in the game as player.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <NonDraggableImg
              src="/how-to-play-host-2.png"
              alt="Track selection preview"
            />
            <div>
              <h3>🎵 Track Selection</h3>
              <p>For each round, you have to select a track, for which players have to guess the game of origin.</p>
              <p>
                You can filter tracks by tags and playlists (if present), order tracks alphabetically and search for
                keywords in game or track title. You can also filter out previously played tracks.
              </p>
              <p>If you can not decide, you can choose a random track from the current filtered track list.</p>
              <p>Note: Every track can only be played once per game!</p>
            </div>
          </div>

          <div className="instruction-step">
            <NonDraggableImg
              src="/how-to-play-host-3.png"
              alt="Review answers preview"
            />
            <div>
              <h3>📋 Review Answers</h3>
              <p>If every player has answered or time is up, you have to review the players' answers.</p>
              <p>
                You can mark each answer as <strong className="highlight correct">Correct</strong>,{' '}
                <strong className="highlight partial">Partial</strong>, or{' '}
                <strong className="highlight wrong">Wrong</strong>. Correct answers will give full points, partially
                correct answers half points and wrong answers zero points. Players who did not submit a guess in time
                will be listed at the bottom and will automatically receive zero points.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
