import { useSignal } from '@preact/signals';

import { RadioGroup } from './RadioGroup';
import { NonDraggableImg } from './NonDraggableImg';

export const HowToPlay = () => {
  const activeTab = useSignal<'player' | 'host'>('player');

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
              src="/images/instructions-guess.svg"
              alt="Guessing interface preview"
            />
            <div>
              <h3>🎵 Guess the Track</h3>
              <p>
                Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut
                labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et
                ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum
                dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore
                magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet
                clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit
                amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna
                aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita
                kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.{' '}
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <NonDraggableImg
              src="/images/instructions-time-bonus.svg"
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
              src="/images/instructions-jokers.svg"
              alt="Jokers preview"
            />
            <div>
              <h3>❓ Jokers</h3>
              <p>
                Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip
                ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie
                consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim
                qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab.value === 'host' && (
        <div className="instructions-tab-content">
          <div className="instruction-step">
            <NonDraggableImg
              src="/images/instructions-setup.svg"
              alt="Host setup configuration preview"
            />
            <div>
              <h3>⚙️ Game Setup</h3>
              <p></p>
            </div>
          </div>

          <div className="instruction-step">
            <NonDraggableImg
              src="/images/instructions-track-selection.svg"
              alt="Track selection preview"
            />
            <div>
              <h3>🎵 Track Selection</h3>
              <p></p>
            </div>
          </div>

          <div className="instruction-step">
            <NonDraggableImg
              src="/images/instructions-review-answers.svg"
              alt="Review answers preview"
            />
            <div>
              <h3>📋 Review Answers</h3>
              <p></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
