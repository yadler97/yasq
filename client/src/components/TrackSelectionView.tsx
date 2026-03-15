import { useSignal, computed, signal, Signal } from "@preact/signals";
import { useEffect } from "preact/hooks";

import { auth } from "../main";
import { discordSdk } from "../main";
import * as backend from "../utils/backend";
import { Track, Playlist } from "../utils/types";

const selectedPlaylistName = signal<string>("All");
const selectedTags = signal<Record<string, string[]>>({});
const searchTerm = signal("");
const hidePlayed = signal(false);

export const SelectionView = ({ isHost }: { isHost: boolean }) => {
  const tracks = useSignal<Track[] | null>(null);
  const playlists = useSignal<Playlist[]>([]);

  useEffect(() => {
    if (!isHost) return;

    backend.getTrackList(auth.value.access_token, discordSdk.instanceId).then((data) => {
      tracks.value = data.tracks;
      playlists.value = data.playlists;
    });
  }, [isHost]);

  // Computed signal: This automatically re-filters whenever tracks, 
  // selectedPlaylistName, searchTerm, or hidePlayed changes.
  const baseFilteredTracks = computed(() => {
    if (!tracks.value) return [];

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

  const filteredTracks = computed(() => {
    const activeCategories = Object.entries(selectedTags.value)
      .filter(([_, vals]) => vals.length > 0);

    if (activeCategories.length === 0) return baseFilteredTracks.value;

    return baseFilteredTracks.value.filter(track => 
      activeCategories.every(([type, selectedVals]) => 
        track.tags.some(t => t.type === type && selectedVals.includes(t.value))
      )
    );
  });

  const selectRandom = async () => {
    // Only pick from tracks that are currently visible and NOT played
    const eligibleTracks = filteredTracks.value.filter(t => !t.played);
    if (eligibleTracks.length === 0) return;

    const randomTrack = eligibleTracks[Math.floor(Math.random() * eligibleTracks.length)];
    await backend.playTrack(auth.value.access_token, randomTrack.file, discordSdk.instanceId);
  };

  const availableTagsByType = computed(() => {
    const groups: Record<string, string[]> = {};
    tracks.value?.forEach(track => {
      track.tags.forEach(tag => {
        if (!groups[tag.type]) groups[tag.type] = [];
        if (!groups[tag.type].includes(tag.value)) groups[tag.type].push(tag.value);
      });
    });
    return groups;
  });

  const reachableTags = computed(() => {
    const currentFilters = selectedTags.value;
    const categories = Object.keys(availableTagsByType.value);
    const validTags = new Map<string, number>();

    categories.forEach(catToSkip => {
      const otherFilters = Object.entries(currentFilters)
        .filter(([type, vals]) => type !== catToSkip && vals.length > 0);

      const reachableInCat = baseFilteredTracks.value.filter(track => 
        otherFilters.every(([type, selectedVals]) => 
          track.tags.some(t => t.type === type && selectedVals.includes(t.value))
        )
      );

      reachableInCat.forEach(track => {
        track.tags.forEach(tag => {
          if (tag.type === catToSkip) {
            validTags.set(tag.value, (validTags.get(tag.value) || 0) + 1);
          }
        });
      });
    });

    return validTags;
  });

  if (!isHost) {
    return (
      <div class="centered">
        <h2>Waiting for host to select a track...</h2>
      </div>
    );
  }

  if (tracks.value === null) {
    return (
      <div class="centered">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div id="track-picker-container">
      <h2>Select the next track to challenge players:</h2>
      <div className="controls">
        {playlists.value.length > 0 && (
          <SimpleDropdown 
            options={["All", ...playlists.value.map(p => p.name)]}
            value={selectedPlaylistName.value}
            onChange={(val) => (selectedPlaylistName.value = val)}
          />
        )}

        <TagFilterDropdown 
          availableTags={availableTagsByType.value}
          selectedTags={selectedTags}
          reachableTags={reachableTags.value}
        />

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

        <button
          disabled={filteredTracks.value.filter(t => !t.played).length === 0}
          onClick={selectRandom}
          title="Select a random track from the current list"
        >
          🎲 Random
        </button>

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
                  await backend.playTrack(auth.value.access_token, track.file, discordSdk.instanceId);
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

export const TagFilterDropdown = ({
  availableTags,
  selectedTags,
  reachableTags
}: {
  availableTags: Record<string, string[]>,
  selectedTags: Signal<Record<string, string[]>>,
  reachableTags: Map<string, number>
}) => {
  const isOpen = useSignal(false);

  const toggleTag = (type: string, value: string) => {
    const current = { ...selectedTags.value };
    const typeFilters = current[type] || [];
    
    if (typeFilters.includes(value)) {
      current[type] = typeFilters.filter(v => v !== value);
    } else {
      current[type] = [...typeFilters, value];
    }
    selectedTags.value = current;
  };

  const activeCount = Object.values(selectedTags.value).flat().length;

  return (
    <div className="filter-dropdown">
      <button 
        className={`dropdown-trigger ${activeCount > 0 ? 'active' : ''}`}
        onClick={() => (isOpen.value = !isOpen.value)}
      >
        {activeCount > 0 ? `Filters (${activeCount})` : 'Filter by Tags'}
        <span className={`arrow ${isOpen.value ? 'up' : 'down'}`}>▼</span>
      </button>

      {isOpen.value && (
        <>
          <div className="dropdown-overlay" onClick={() => (isOpen.value = false)} />
          <div className="dropdown-menu">
            <div className="scrollbar-container">
              {Object.entries(availableTags).map(([type, values]) => (
                <div key={type} className="dropdown-group">
                  <div className="group-header">{type}</div>
                  {values.sort().map(val => {
                    const isSelected = selectedTags.value[type]?.includes(val);
                    const count = reachableTags.get(val) || 0;
                    const isDisabled = !isSelected && !reachableTags.has(val);

                    return (
                      <label key={val} className={`dropdown-item ${isDisabled ? 'disabled' : ''}`}>
                        <div className="item-label-group">
                          <input 
                            type="checkbox" 
                            disabled={isDisabled}
                            checked={isSelected || false}
                            onChange={() => toggleTag(type, val)}
                          />
                          <span style={{ opacity: isDisabled ? 0.5 : 1 }}>{val}</span>
                        </div>
                        <span className="tag-count">{count}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const SimpleDropdown = ({ 
  options, 
  value, 
  onChange 
}: { 
  options: string[], 
  value: string, 
  onChange: (val: string) => void 
}) => {
  const isOpen = useSignal(false);
  const isFiltering = value !== "All";

  return (
    <div className="filter-dropdown">
      <button 
        className={`dropdown-trigger ${isFiltering ? 'active' : ''}`}
        onClick={() => (isOpen.value = !isOpen.value)}
      >
        <span>{value === "All" ? "All Playlists" : value}</span>
        <span className={`arrow ${isOpen.value ? 'up' : 'down'}`}>▼</span>
      </button>

      {isOpen.value && (
        <>
          <div className="dropdown-overlay" onClick={() => (isOpen.value = false)} />
          <div className="dropdown-menu">
            <div className="scrollbar-container">
              {options.map(opt => (
                <div 
                  key={opt} 
                  className={`dropdown-item single-select ${value === opt ? 'active' : ''}`}
                  onClick={() => {
                    onChange(opt);
                    isOpen.value = false;
                  }}
                >
                  {opt === "All" ? "All Playlists" : opt}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};