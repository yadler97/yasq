import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

import type { Playlist, Tag, Track } from '@yasq/shared';

import './style.css';

type Route =
  | { type: 'tracks-list'; page: number }
  | { type: 'tracks-new' }
  | { type: 'tracks-edit'; index: number }
  | { type: 'playlists-list'; page: number }
  | { type: 'playlists-new' }
  | { type: 'playlists-edit'; index: number };

export function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  // Parse current route from window.location path and search
  const parseRoute = (): Route => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const parts = path.split('/').filter(Boolean); // e.g. ['tracks'], ['playlists', 'new'], etc.

    const p = parseInt(params.get('page') || '1', 10);
    const page = isNaN(p) || p < 1 ? 1 : p;

    if (parts[0] === 'playlists') {
      if (parts[1] === 'new') return { type: 'playlists-new' };
      if (parts.length === 3 && parts[2] === 'edit') {
        const index = parseInt(parts[1], 10);
        return { type: 'playlists-edit', index: isNaN(index) ? 0 : index };
      }
      return { type: 'playlists-list', page };
    }

    // Default or /tracks routes
    if (parts[1] === 'new') return { type: 'tracks-new' };
    if (parts.length === 3 && parts[2] === 'edit') {
      const index = parseInt(parts[1], 10);
      return { type: 'tracks-edit', index: isNaN(index) ? 0 : index };
    }

    return { type: 'tracks-list', page };
  };

  const [route, setRoute] = useState<Route>(parseRoute);
  const pageSize = 5;
  const totalPages = Math.ceil(tracks.length / pageSize) || 1;
  const playlistTotalPages = Math.ceil(playlists.length / pageSize) || 1;

  // Sync route on browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Clamp pages if needed after data loads
  useEffect(() => {
    if (route.type === 'tracks-list' && tracks.length > 0 && route.page > totalPages) {
      navigate(`/tracks?page=${totalPages}`);
    }
    if (route.type === 'playlists-list' && playlists.length > 0 && route.page > playlistTotalPages) {
      navigate(`/playlists?page=${playlistTotalPages}`);
    }
  }, [tracks.length, totalPages, playlists.length, playlistTotalPages, route]);

  // Navigation helper
  const navigate = (url: string) => {
    window.history.pushState({}, '', url);
    setRoute(parseRoute());
  };

  // Track Form State
  const [title, setTitle] = useState('');
  const [game, setGame] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFilename, setAudioFilename] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverFilename, setCoverFilename] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);

  const addTagField = () => setTags([...tags, { type: '', value: '' }]);
  const removeTag = (index: number) => setTags(tags.filter((_, i) => i !== index));
  const updateTag = (index: number, field: 'type' | 'value', val: string) => {
    setTags(tags.map((t, i) => (i === index ? { ...t, [field]: val } : t)));
  };

  // Playlist Form State
  const [playlistName, setPlaylistName] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);

  const fetchTracks = async () => {
    const res = await fetch('/api/tracks');
    if (res.ok) setTracks(await res.json());
  };

  const fetchPlaylists = async () => {
    const res = await fetch('/api/playlists');
    if (res.ok) setPlaylists(await res.json());
  };

  useEffect(() => {
    fetchTracks();
    fetchPlaylists();
  }, []);

  // Populate form fields when navigating to edit routes
  useEffect(() => {
    if (route.type === 'tracks-edit' && tracks.length > 0) {
      const track = tracks[route.index];
      if (track) {
        setTitle(track.title);
        setGame(track.game);
        setAudioFilename(track.audio);
        setAudioFile(null);
        setCoverFilename(track.cover || '');
        setCoverFile(null);
        setTags(track.tags || []);
      }
    } else if (route.type === 'tracks-new') {
      setTitle('');
      setGame('');
      setAudioFile(null);
      setAudioFilename('');
      setCoverFile(null);
      setCoverFilename('');
      setTags([]);
    }

    if (route.type === 'playlists-edit' && playlists.length > 0) {
      const pl = playlists[route.index];
      if (pl) {
        setPlaylistName(pl.name);
        setSelectedTracks(pl.tracks);
      }
    } else if (route.type === 'playlists-new') {
      setPlaylistName('');
      setSelectedTracks([]);
    }
  }, [route, tracks, playlists]);

  // Track Handlers
  const submitTrack = async (e: Event) => {
    e.preventDefault();
    let filename = audioFilename;
    let coverName = coverFilename;

    // Upload audio file if selected
    if (audioFile) {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'X-File-Name': encodeURIComponent(audioFile.name) },
        body: audioFile,
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        filename = data.filename;
      }
    }

    // Upload cover image if selected
    if (coverFile) {
      const res = await fetch('/api/upload?type=cover', {
        method: 'POST',
        headers: { 'X-File-Name': encodeURIComponent(coverFile.name) },
        body: coverFile,
      });
      if (res.ok) {
        const data = await res.json();
        coverName = data.filename;
      }
    }

    const trackData = { title, game, audio: filename, cover: coverName, tags };
    const isEditing = route.type === 'tracks-edit';
    const url = isEditing ? `/api/tracks/${route.index}` : '/api/tracks';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackData),
    });

    if (res.ok) {
      fetchTracks();
      navigate('/tracks');
    }
  };

  const deleteTrack = async (absoluteIndex: number) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    const res = await fetch(`/api/tracks/${absoluteIndex}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) fetchTracks();
  };

  // Playlist Handlers
  const submitPlaylist = async (e: Event) => {
    e.preventDefault();
    const playlistData: Playlist = { name: playlistName, tracks: selectedTracks };
    const isEditing = route.type === 'playlists-edit';
    const url = isEditing ? `/api/playlists/${route.index}` : '/api/playlists';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlistData),
    });

    if (res.ok) {
      fetchPlaylists();
      navigate('/playlists');
    }
  };

  const deletePlaylist = async (absoluteIndex: number) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    const res = await fetch(`/api/playlists/${absoluteIndex}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) fetchPlaylists();
  };

  const toggleTrackInPlaylist = (audioFilename: string) => {
    if (selectedTracks.includes(audioFilename)) {
      setSelectedTracks(selectedTracks.filter(f => f !== audioFilename));
    } else {
      setSelectedTracks([...selectedTracks, audioFilename]);
    }
  };

  const currentPage = route.type === 'tracks-list' ? route.page : 1;
  const paginatedTracks = tracks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const currentPlaylistPage = route.type === 'playlists-list' ? route.page : 1;
  const paginatedPlaylists = playlists.slice((currentPlaylistPage - 1) * pageSize, currentPlaylistPage * pageSize);

  const getPageNumbers = (current: number, total: number) => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    range.forEach(i => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  const isTracksActive = route.type.startsWith('tracks');

  return (
    <div className="creator-wrapper">
      <header className="creator-header">
        <h2>YASQ Creator Dashboard</h2>
        <nav className="main-tabs">
          <button
            className={`secondary-btn ${isTracksActive ? 'active' : ''}`}
            onClick={() => navigate('/tracks')}
          >
            Tracks
          </button>

          <button
            className={`secondary-btn ${!isTracksActive ? 'active' : ''}`}
            onClick={() => navigate('/playlists')}
          >
            Playlists
          </button>
        </nav>
      </header>

      {/* TRACKS LIST VIEW */}
      {route.type === 'tracks-list' && (
        <>
          <div className="tab-actions">
            <button
              onClick={() => navigate('/tracks/new')}
              className="primary-btn"
            >
              + Add Track
            </button>
          </div>

          <div className="tracks-container">
            <div className="tracks-list">
              {tracks.length === 0 ? (
                <p>No tracks saved yet.</p>
              ) : (
                paginatedTracks.map((track, i) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + i;
                  return (
                    <div
                      key={absoluteIndex}
                      className="track-card"
                    >
                      {track.cover && (
                        <img
                          loading="lazy"
                          src={`/covers/${track.cover}`}
                          alt={`Cover of ${track.game}`}
                        />
                      )}
                      <div className="track-info">
                        <p>
                          <strong>{track.game}</strong>
                        </p>
                        <p>
                          <i>{track.title}</i>
                        </p>
                      </div>
                      <audio
                        controls
                        preload="none"
                        src={`/music/${track.audio}`}
                      />
                      <div className="card-actions">
                        <button
                          onClick={() => navigate(`/tracks/${absoluteIndex}/edit`)}
                          className="secondary-btn"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTrack(absoluteIndex)}
                          className="danger-btn"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="secondary-btn"
                  disabled={currentPage === 1}
                  onClick={() => navigate(`/tracks?page=${currentPage - 1}`)}
                >
                  ← Prev
                </button>

                <div className="page-numbers">
                  {getPageNumbers(currentPage, totalPages).map((page, index) =>
                    typeof page === 'number' ? (
                      <button
                        key={index}
                        className={`secondary-btn page-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => navigate(`/tracks?page=${page}`)}
                      >
                        {page}
                      </button>
                    ) : (
                      <span
                        key={index}
                        className="page-dots"
                      >
                        {page}
                      </span>
                    )
                  )}
                </div>

                <button
                  className="secondary-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => navigate(`/tracks?page=${currentPage + 1}`)}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* TRACKS FORM VIEW (NEW / EDIT) */}
      {(route.type === 'tracks-new' || route.type === 'tracks-edit') && (
        <>
          <div className="tab-actions">
            <button
              onClick={() => navigate('/tracks')}
              className="secondary-btn"
            >
              ← Back to List
            </button>
          </div>

          <form
            onSubmit={submitTrack}
            className="creator-form"
          >
            <h3>{route.type === 'tracks-edit' ? 'Edit Track' : 'Add New Track'}</h3>

            <div className="field">
              <label>Game Name</label>
              <input
                type="text"
                required
                value={game}
                onInput={e => setGame((e.target as HTMLInputElement).value)}
              />
            </div>

            <div className="field">
              <label>Track Title</label>
              <input
                type="text"
                required
                value={title}
                onInput={e => setTitle((e.target as HTMLInputElement).value)}
              />
            </div>

            <div className="field">
              <label>Audio File</label>
              <input
                type="file"
                accept="audio/*"
                required={route.type === 'tracks-new' && !audioFilename}
                onChange={e => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files[0]) {
                    setAudioFile(files[0]);
                    setAudioFilename(files[0].name);
                  }
                }}
              />
              {audioFilename && <small>Current audio file: {audioFilename}</small>}
            </div>

            <div className="field">
              <label>Cover Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files[0]) {
                    setCoverFile(files[0]);
                    setCoverFilename(files[0].name);
                  }
                }}
              />
              {coverFilename && <small>Current cover file: {coverFilename}</small>}
            </div>

            <div className="field">
              <label>Tags</label>
              {tags.map((tag, index) => (
                <div
                  key={index}
                  className="tag-row"
                >
                  <input
                    type="text"
                    placeholder="Type"
                    value={tag.type}
                    onInput={e => updateTag(index, 'type', (e.target as HTMLInputElement).value)}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={tag.value}
                    onInput={e => updateTag(index, 'value', (e.target as HTMLInputElement).value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="secondary-btn"
                onClick={addTagField}
              >
                + Add Tag
              </button>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-btn"
              >
                {route.type === 'tracks-edit' ? 'Update Track' : 'Save Track'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => navigate('/tracks')}
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}

      {/* PLAYLISTS LIST VIEW */}
      {route.type === 'playlists-list' && (
        <>
          <div className="tab-actions">
            <button
              onClick={() => navigate('/playlists/new')}
              className="primary-btn"
            >
              + Add Playlist
            </button>
          </div>

          <div className="playlists-container">
            {playlists.length === 0 ? (
              <p>No playlists created yet.</p>
            ) : (
              paginatedPlaylists.map((pl, i) => {
                const absoluteIndex = (currentPlaylistPage - 1) * pageSize + i;
                return (
                  <div
                    key={absoluteIndex}
                    className="track-card playlist-card"
                  >
                    <div className="track-info">
                      <p>
                        <strong>{pl.name}</strong>
                      </p>
                      <p>
                        <i>{pl.tracks.length} tracks included</i>
                      </p>
                    </div>
                    <div className="card-actions">
                      <button
                        onClick={() => navigate(`/playlists/${absoluteIndex}/edit`)}
                        className="secondary-btn"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePlaylist(absoluteIndex)}
                        className="danger-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {playlistTotalPages > 1 && (
              <div className="pagination">
                <button
                  className="secondary-btn"
                  disabled={currentPlaylistPage === 1}
                  onClick={() => navigate(`/playlists?page=${currentPlaylistPage - 1}`)}
                >
                  ← Prev
                </button>

                <div className="page-numbers">
                  {getPageNumbers(currentPlaylistPage, playlistTotalPages).map((page, index) =>
                    typeof page === 'number' ? (
                      <button
                        key={index}
                        className={`secondary-btn page-btn ${currentPlaylistPage === page ? 'active' : ''}`}
                        onClick={() => navigate(`/playlists?page=${page}`)}
                      >
                        {page}
                      </button>
                    ) : (
                      <span
                        key={index}
                        className="page-dots"
                      >
                        {page}
                      </span>
                    )
                  )}
                </div>

                <button
                  className="secondary-btn"
                  disabled={currentPlaylistPage === playlistTotalPages}
                  onClick={() => navigate(`/playlists?page=${currentPlaylistPage + 1}`)}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* PLAYLISTS FORM VIEW (NEW / EDIT) */}
      {(route.type === 'playlists-new' || route.type === 'playlists-edit') && (
        <>
          <div className="tab-actions">
            <button
              onClick={() => navigate('/playlists')}
              className="secondary-btn"
            >
              ← Back to Playlists
            </button>
          </div>

          <form
            onSubmit={submitPlaylist}
            className="creator-form"
          >
            <h3>{route.type === 'playlists-edit' ? 'Edit Playlist' : 'Add New Playlist'}</h3>

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
                {route.type === 'playlists-edit' ? 'Update Playlist' : 'Save Playlist'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => navigate('/playlists')}
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

render(<App />, document.getElementById('app')!);
