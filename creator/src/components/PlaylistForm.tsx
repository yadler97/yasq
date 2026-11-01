import type { Track } from '@yasq/shared';

interface PlaylistFormProps {
  isEditing: boolean;
  playlistName: string;
  setPlaylistName: (val: string) => void;
  tracks: Track[];
  selectedTracks: string[];
  toggleTrackInPlaylist: (audio: string) => void;
  onSubmit: (e: Event) => void;
  onCancel: () => void;
}

export function PlaylistForm({
  isEditing,
  playlistName,
  setPlaylistName,
  tracks,
  selectedTracks,
  toggleTrackInPlaylist,
  onSubmit,
  onCancel,
}: PlaylistFormProps) {
  return (
    <>
      <div className="tab-actions">
        <button
          onClick={onCancel}
          className="secondary-btn"
        >
          ← Back to Playlists
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="creator-form"
      >
        <h3>{isEditing ? 'Edit Playlist' : 'Add New Playlist'}</h3>

        <div className="field">
          <label>Playlist Name</label>
          <input
            type="text"
            required
            value={playlistName}
            onInput={e => setPlaylistName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="field">
          <label>Select Tracks ({selectedTracks.length} selected)</label>
          <div className="playlist-track-selector">
            {tracks.map((t, idx) => (
              <label
                key={idx}
                className="playlist-track-item"
              >
                <input
                  type="checkbox"
                  checked={selectedTracks.includes(t.audio)}
                  onChange={() => toggleTrackInPlaylist(t.audio)}
                />
                <span>
                  <strong>{t.game}</strong> - {t.title} <small>({t.audio})</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="primary-btn"
          >
            {isEditing ? 'Update Playlist' : 'Save Playlist'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
