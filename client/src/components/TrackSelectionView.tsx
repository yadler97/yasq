import { useSignal, computed, signal } from "@preact/signals";
import { auth } from "../main";
import { discordSdk } from "../main";
import * as backend from "../../backend.js";
import { getUserId } from "../../helper";
import { useEffect } from "preact/hooks";
import { Track, Playlist } from "../types";

const selectedPlaylistName = signal<string>("All");
const searchTerm = signal("");
const hidePlayed = signal(false);

export const SelectionView = ({ isHost }: { isHost: boolean }) => {
  const tracks = useSignal<Track[]>([]);
  const playlists = useSignal<Playlist[]>([]);

  useEffect(() => {
    backend.getTrackList(discordSdk.instanceId, getUserId(auth.value)).then((data) => {
      tracks.value = data.tracks;
      playlists.value = data.playlists;
    });
  }, []);

  // Computed signal: This automatically re-filters whenever tracks, 
  // searchTerm, or hidePlayed changes.
  const filteredTracks = computed(() => {
    return tracks.value.filter(track => {
      // Filter playlist
      let matchesPlaylist = true;
      if (selectedPlaylistName.value !== "All") {
        const activePlaylist = playlists.value.find(p => p.name === selectedPlaylistName.value);
        matchesPlaylist = activePlaylist ? activePlaylist.tracks.includes(track.file) : false;
      }

      // Filter search
      const matchesSearch = 
        track.name.toLowerCase().includes(searchTerm.value.toLowerCase()) || 
        track.title.toLowerCase().includes(searchTerm.value.toLowerCase());
      
      // Filter played status
      const matchesPlayed = hidePlayed.value ? !track.played : true;

      return matchesPlaylist && matchesSearch && matchesPlayed;
    });
  });

  if (!isHost) {
    return (
      <div class="centered">
        <h2>Waiting for host to select a track...</h2>
      </div>
    );
  }

  return (
    <div id="track-picker-container">
      <h2>Select the next track to challenge players:</h2>
      <div className="controls">
        <select 
          className="playlist-select"
          value={selectedPlaylistName.value} 
          onChange={(e) => (selectedPlaylistName.value = e.currentTarget.value)}
        >
          <option value="All">All Playlists</option>
          {playlists.value.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>

        <div className="search-wrapper">
          <input type="text" id="track-search" placeholder="Search game or track name..." value={searchTerm.value}
            onInput={(e) => (searchTerm.value = (e.currentTarget as HTMLInputElement).value)} />
          {searchTerm.value && (
            <button 
              className="clear-search-btn" 
              onClick={() => (searchTerm.value = "")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

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
                <span className="game-name">
                  <HighlightText text={track.name} highlight={searchTerm.value} />
                </span>
                <span className="track-title">
                  <i>
                    <HighlightText text={track.title} highlight={searchTerm.value} />
                  </i>
                </span>
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

const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <span>{text}</span>;

  // Split text by the highlight term, keeping the delimiter for case sensitivity
  const parts = text.split(new RegExp(`(${highlight})`, "gi"));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="search-highlight">{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
};