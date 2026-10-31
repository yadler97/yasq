import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

import type { Tag, Track } from '@yasq/shared';

import './style.css';

export function App() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Helper to read page from URL query params
  const getInitialPage = () => {
    const params = new URLSearchParams(window.location.search);
    const p = parseInt(params.get('page') || '1', 10);
    return isNaN(p) || p < 1 ? 1 : p;
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const pageSize = 5;

  // Sync state when browser back/forward buttons are used
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getInitialPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL query parameter when currentPage changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (currentPage === 1) {
      params.delete('page');
    } else {
      params.set('page', currentPage.toString());
    }
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? `?` + newSearch : ''}`;
    window.history.pushState({ page: currentPage }, '', newUrl);
  }, [currentPage]);

  // Form state
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

  const fetchTracks = async () => {
    const res = await fetch('/api/tracks');
    if (res.ok) {
      const data = await res.json();
      setTracks(data);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  const resetForm = () => {
    setTitle('');
    setGame('');
    setAudioFile(null);
    setAudioFilename('');
    setCoverFile(null);
    setCoverFilename('');
    setTags([]);
    setEditingIndex(null);
  };

  const openAddForm = () => {
    resetForm();
    setView('form');
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

    const url = editingIndex !== null ? `/api/tracks/${editingIndex}` : '/api/tracks';
    const method = editingIndex !== null ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackData),
    });

    if (res.ok) {
      resetForm();
      fetchTracks();
      setView('list');
    }
  };

  const startEdit = (absoluteIndex: number) => {
    const track = tracks[absoluteIndex];
    setTitle(track.title);
    setGame(track.game);
    setAudioFilename(track.audio);
    setAudioFile(null);
    setCoverFilename(track.cover || '');
    setCoverFile(null);
    setTags(track.tags || []);
    setEditingIndex(absoluteIndex);
    setView('form');
  };

  const deleteTrack = async (absoluteIndex: number) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    const res = await fetch(`/api/tracks/${absoluteIndex}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      // Adjust current page if we delete the last item on the current page
      const newTotalPages = Math.ceil((tracks.length - 1) / pageSize) || 1;
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
      fetchTracks();
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(tracks.length / pageSize) || 1;
  const paginatedTracks = tracks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Pagination helper to generate visible page numbers
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show around current page
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
        {view === 'list' ? (
          <button
            onClick={openAddForm}
            className="primary-btn"
          >
            + Add Track
          </button>
        ) : (
          <button
            onClick={() => setView('list')}
            className="secondary-btn"
          >
            ← Back to List
          </button>
        )}
      </header>

      {view === 'form' ? (
        <form
          onSubmit={submitTrack}
          className="creator-form"
        >
          <h3>{editingIndex !== null ? 'Edit Track' : 'Add New Track'}</h3>

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
              required={editingIndex === null && !audioFilename}
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
              {editingIndex !== null ? 'Update Track' : 'Save Track'}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                resetForm();
                setView('list');
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
                        onClick={() => startEdit(absoluteIndex)}
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
    </div>
  );
}

render(<App />, document.getElementById('app')!);
