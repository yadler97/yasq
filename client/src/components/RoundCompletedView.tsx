import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import * as backend from "../../backend.js";
import { auth, discordSdk, participants } from "../main.js";
import { getAvatarUrl, getDisplayName, getUserId } from "../../helper.js";

interface ReviewData {
  round: number;
  answer: string;
  guesses: Record<string, { text: string }>;
  timedOut: string[];
}

export const HostReviewView = ({ isHost }: { isHost: boolean }) => {
  const reviewData = useSignal<ReviewData | null>(null);
  const corrections = useSignal<Record<string, number>>({});

  useEffect(() => {
    if (isHost) {
      backend.getGuesses(discordSdk.instanceId, getUserId(auth.value))
        .then(data => {
          reviewData.value = data;
          // Pre-populate corrections with 0 (Wrong) for everyone who guessed
          const initial: Record<string, number> = {};
          Object.keys(data.guesses).forEach(uid => initial[uid] = 0);
          corrections.value = initial;
        });
    }
  }, [isHost]);

  if (!isHost) {
    return <div id="results"><h2>Waiting for host to review answers...</h2></div>;
  }

  if (!reviewData.value) return <div id="results"><h2>Loading guesses...</h2></div>;

  const handleSubmit = async (e: MouseEvent) => {
    const btn = e.currentTarget as HTMLButtonElement;
    btn.disabled = true;
    await backend.submitRoundResults(discordSdk.instanceId, getUserId(auth.value), corrections.value);
  };

  const findUser = (id: string) => participants.value.find(p => p.id === id);

  return (
    <div id="results" style={{ display: 'block' }}>
      <h2>Round {reviewData.value.round} Results</h2>
      <p>The correct answer was: <strong>{reviewData.value.answer}</strong></p>
      
      <div id="guess-list">
        {Object.entries(reviewData.value.guesses).map(([userId, guess]) => {
          const user = findUser(userId);
          const displayName = user ? getDisplayName(user) : 'Unknown';
          const avatarUrl = user ? getAvatarUrl(user) : '';

          return (
            <div key={userId} className="guess-item">
              <div className="user-info">
                <img src={avatarUrl} className="avatar-small" alt={displayName} />
                <span className="username">{displayName}</span>
                <span className="guess-text">"{guess.text}"</span>
              </div>
              
              <div className="button-group">
                <input type="radio" id={`wrong-${userId}`} name={`score-${userId}`} value="0" checked
                  onChange={() => { corrections.value = { ...corrections.value, [userId]: 0 }; }} />
                <label for={`wrong-${userId}`} class="btn-radio wrong">Wrong</label>

                <input type="radio" id={`partial-${userId}`} name={`score-${userId}`} value="0.5"
                  onChange={() => { corrections.value = { ...corrections.value, [userId]: 0.5 }; }} />
                <label for={`partial-${userId}`} class="btn-radio partial">Partial</label>

                <input type="radio" id={`correct-${userId}`} name={`score-${userId}`} value="1"
                  onChange={() => { corrections.value = { ...corrections.value, [userId]: 1 }; }} />
                <label for={`correct-${userId}`} class="btn-radio correct">Correct</label>
              </div>
            </div>
          );
        })}
      </div>

      {reviewData.value.timedOut.length > 0 && (
        <div className="timed-out-section">
          <p>No Guess submitted: {
            reviewData.value.timedOut.map(id => {
              const u = findUser(id);
              return u ? getDisplayName(u) : 'Unknown';
            }).join(', ')
          }</p>
        </div>
      )}

      <button id="btn-submit-reviewed-results" onClick={handleSubmit}>
        Submit Reviewed Results
      </button>
    </div>
  );
};