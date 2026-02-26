import { useSignal, computed } from "@preact/signals";
import { auth } from "../main";
import { discordSdk } from "../main";
import * as backend from "../../backend.js";
import { getUserId } from "../../helper";
import { useEffect } from "preact/hooks";
import { Track } from "../types";

export const SelectionView = ({ isHost }: { isHost: boolean }) => {
  const tracks = useSignal<Track[]>([]);

  useEffect(() => {
    backend.getTrackList(discordSdk.instanceId, getUserId(auth.value)).then((data) => {
      tracks.value = data;
    });
  }, []);

  // Local UI state signals
  const searchTerm = useSignal("");
  const hidePlayed = useSignal(false);

  // Computed signal: This automatically re-filters whenever tracks, 
  // searchTerm, or hidePlayed changes.
  const filteredTracks = computed(() => {
    return tracks.value.filter(track => {
      const matchesSearch = 
        track.name.toLowerCase().includes(searchTerm.value.toLowerCase()) || 
        track.title.toLowerCase().includes(searchTerm.value.toLowerCase());
      
      const matchesPlayed = hidePlayed.value ? !track.played : true;
      return matchesSearch && matchesPlayed;
    });
  });

  if (!isHost) {
    return (
      <div>
        <h2>Waiting for host to select a track...</h2>
      </div>
    );
  }

  return (
    <div id="track-picker-container">
      <h2>Select the next track to challenge players:</h2>
      <div class="controls">
        <input type="text" id="track-search" placeholder="Search game or track name..." value={searchTerm.value}
          onInput={(e) => (searchTerm.value = (e.currentTarget as HTMLInputElement).value)} />
        <label>
          <input type="checkbox" id="hide-played" checked={hidePlayed.value}
            onChange={(e) => (hidePlayed.value = (e.currentTarget as HTMLInputElement).checked)} /> Hide played tracks
        </label>
      </div>

      <div className="grid-container" id="track-selection-grid">
        {filteredTracks.value.length === 0 ? (
          <p className="no-results">No tracks found matching your search.</p>
        ) : (
          filteredTracks.value.map(track => (
            <div key={track.file} className={`track-card ${track.played ? 'played' : ''}`}>
              <div className="cover-wrapper">
                <img 
                  src={`/game_covers/${track.file}.png`} 
                  alt={track.name} 
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/game_covers/default.png'; }}
                />
                {track.played && <span className="played-overlay">PLAYED</span>}
              </div>
              
              <div className="track-info">
                <span className="game-name">{track.name}</span>
                <span className="track-title"><i>{track.title}</i></span>
              </div>

              <button 
                className="select-btn" 
                disabled={track.played}
                onClick={async (e) => {
                  // Preact's way of preventing double-clicks: 
                  // The button becomes disabled because tracks.value will update
                  // or the state will change to 'PLAYING' via the backend call.
                  (e.currentTarget as HTMLButtonElement).disabled = true;
                  await backend.playTrack(track.file, discordSdk.instanceId, getUserId(auth.value));
                }}
              >
                {track.played ? 'Already Played' : 'Select Track'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};