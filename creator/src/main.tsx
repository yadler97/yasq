import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

import type { Playlist, Tag, Track } from '@yasq/shared';

import './style.css';

export function App() {
  // Tracks State
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackView, setTrackView] = useState<'list' | 'form'>('list');
  const [editingTrackIndex, setEditingTrackIndex] = useState<number | null>(null);

  // Playlists State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistView, setPlaylistView] = useState<'list' | 'form'>('list');
  const [editingPlaylistIndex, setEditingPlaylistIndex] = useState<number | null>(null);

  // Helper to read initial tab from URL
  const getInitialTab = (): 'tracks' | 'playlists' => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    return t === 'playlists' ? 'playlists' : 'tracks';
  };

  // Helper to read initial page from URL
  const getInitialPage = () => {
    const params = new URLSearchParams(window.location.search);
    const p = parseInt(params.get('page') || '1', 10);
    return isNaN(p) || p < 1 ? 1 : p;
  };

  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists'>(getInitialTab);
  const [currentPage, setCurrentPage] = useState(getInitialPage);

  const pageSize = 5;
  const totalPages = Math.ceil(tracks.length / pageSize) || 1;

  useEffect(() => {
    if (tracks.length > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [tracks.length, totalPages]);

  // Sync state when browser back/forward buttons are used
  useEffect(() => {
    const handlePopState = () => setCurrentPage(getInitialPage());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL query parameters when tab or page changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (activeTab === 'playlists') {
      params.set('tab', 'playlists');
      params.delete('page'); // page parameter isn't needed on playlists tab
    } else {
      params.delete('tab'); // default tab is tracks, keep URL clean
      if (currentPage === 1) {
        params.delete('page');
      } else {
        params.set('page', currentPage.toString());
      }
    }

    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? `?` + newSearch : ''}`;
    window.history.pushState({ tab: activeTab, page: currentPage }, '', newUrl);
  }, [activeTab, currentPage]);

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

  // Track Handlers
  const resetTrackForm = () => {
    setTitle('');
    setGame('');
    setAudioFile(null);
    setAudioFilename('');
    setCoverFile(null);
    setCoverFilename('');
    setTags([]);
    setEditingTrackIndex(null);
  };

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
    const url = editingTrackIndex !== null ? `/api/tracks/${editingTrackIndex}` : '/api/tracks';
    const method = editingTrackIndex !== null ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackData),
    });

    if (res.ok) {
      resetTrackForm();
      fetchTracks();
      setTrackView('list');
    }
  };

  const startEditTrack = (absoluteIndex: number) => {
    const track = tracks[absoluteIndex];
    setTitle(track.title);
    setGame(track.game);
    setAudioFilename(track.audio);
    setAudioFile(null);
    setCoverFilename(track.cover || '');
    setCoverFile(null);
    setTags(track.tags || []);
    setEditingTrackIndex(absoluteIndex);
    setTrackView('form');
  };

  const deleteTrack = async (absoluteIndex: number) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    const res = await fetch(`/api/tracks/${absoluteIndex}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) fetchTracks();
  };

  // Playlist Handlers
  const resetPlaylistForm = () => {
    setPlaylistName('');
    setSelectedTracks([]);
    setEditingPlaylistIndex(null);
  };

  const submitPlaylist = async (e: Event) => {
    e.preventDefault();
    const playlistData: Playlist = { name: playlistName, tracks: selectedTracks };
    const url = editingPlaylistIndex !== null ? `/api/playlists/${editingPlaylistIndex}` : '/api/playlists';
    const method = editingPlaylistIndex !== null ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlistData),
    });

    if (res.ok) {
      resetPlaylistForm();
      fetchPlaylists();
      setPlaylistView('list');
    }
  };

  const startEditPlaylist = (index: number) => {
    const pl = playlists[index];
    setPlaylistName(pl.name);
    setSelectedTracks(pl.tracks);
    setEditingPlaylistIndex(index);
    setPlaylistView('form');
  };

  const deletePlaylist = async (index: number) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    const res = await fetch(`/api/playlists/${index}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) fetchPlaylists();
  };

  const toggleTrackInPlaylist = (audioFilename: string) => {
    if (selectedTracks.includes(audioFilename)) {
      setSelectedTracks(selectedTracks.filter(f => f !== audioFilename));
    } else {
      setSelectedTracks([...selectedTracks, audioFilename]);
    }
  };

  const paginatedTracks = tracks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
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

  return (
    <div className="creator-wrapper">
      <header className="creator-header">
        <h2>YASQ Creator Dashboard</h2>
        <nav className="main-tabs">
          <button
            className={`secondary-btn ${activeTab === 'tracks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracks')}
          >
            Tracks
          </button>

          <button
            className={`secondary-btn ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            Playlists
          </button>
        </nav>
      </header>

      {/* TRACKS TAB */}
      {activeTab === 'tracks' && (
        <>
          <div className="tab-actions">
            {trackView === 'list' ? (
              <button
                onClick={() => {
                  resetTrackForm();
                  setTrackView('form');
                }}
                className="primary-btn"
              >
                + Add Track
              </button>
            ) : (
              <button
                onClick={() => setTrackView('list')}
                className="secondary-btn"
              >
                ← Back to List
              </button>
            )}
          </div>

          {trackView === 'form' ? (
            <form
              onSubmit={submitTrack}
              className="creator-form"
            >
              <h3>{editingTrackIndex !== null ? 'Edit Track' : 'Add New Track'}</h3>

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
                  required={editingTrackIndex === null && !audioFilename}
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
                  {editingTrackIndex !== null ? 'Update Track' : 'Save Track'}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    resetTrackForm();
                    setTrackView('list');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
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
                            onClick={() => startEditTrack(absoluteIndex)}
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
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  >
                    ← Prev
                  </button>

                  <div className="page-numbers">
                    {getPageNumbers().map((page, index) =>
                      typeof page === 'number' ? (
                        <button
                          key={index}
                          className={`secondary-btn page-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => setCurrentPage(page)}
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
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* PLAYLISTS TAB */}
      {activeTab === 'playlists' && (
        <>
          <div className="tab-actions">
            {playlistView === 'list' ? (
              <button
                onClick={() => {
                  resetPlaylistForm();
                  setPlaylistView('form');
                }}
                className="primary-btn"
              >
                + Add Playlist
              </button>
            ) : (
              <button
                onClick={() => setPlaylistView('list')}
                className="secondary-btn"
              >
                ← Back to Playlists
              </button>
            )}
          </div>

          {playlistView === 'form' ? (
            <form
              onSubmit={submitPlaylist}
              className="creator-form"
            >
              <h3>{editingPlaylistIndex !== null ? 'Edit Playlist' : 'Add New Playlist'}</h3>

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
                  {editingPlaylistIndex !== null ? 'Update Playlist' : 'Save Playlist'}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    resetPlaylistForm();
                    setPlaylistView('list');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="playlists-container">
              {playlists.length === 0 ? (
                <p>No playlists created yet.</p>
              ) : (
                playlists.map((pl, index) => (
                  <div
                    key={index}
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
                        onClick={() => startEditPlaylist(index)}
                        className="secondary-btn"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePlaylist(index)}
                        className="danger-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

render(<App />, document.getElementById('app')!);
