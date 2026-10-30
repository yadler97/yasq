import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { Tag, Track } from '@yasq/shared';

export function App() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  const startEdit = (index: number) => {
    const track = tracks[index];
    setTitle(track.title);
    setGame(track.game);
    setAudioFilename(track.audio);
    setAudioFile(null);
    setCoverFilename(track.cover || '');
    setCoverFile(null);
    setTags(track.tags || []);
    setEditingIndex(index);
    setView('form');
  };

  const deleteTrack = async (index: number) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    const res = await fetch(`/api/tracks/${index}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      fetchTracks();
    }
  };

  return (
    <div className="creator-wrapper">
      <header className="creator-header">
        <h2>Creator Dashboard</h2>
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
        <div className="tracks-list">
          {tracks.length === 0 ? (
            <p>No tracks saved yet.</p>
          ) : (
            tracks.map((track, i) => (
              <div
                key={i}
                className="track-card"
              >
                {track.cover && (
                  <img
                    src={`/covers/${track.cover}`}
                    alt={`Cover of ${track.game}`}
                  />
                )}
                <p>
                  <strong>Game:</strong> {track.game}
                </p>
                <p>
                  <strong>Title:</strong> {track.title}
                </p>
                <p>
                  <strong>Audio File:</strong> {track.audio}
                </p>
                <audio
                  controls
                  src={`/music/${track.audio}`}
                  style={{ width: '100%', marginTop: '8px' }}
                />
                <div className="card-actions">
                  <button
                    onClick={() => startEdit(i)}
                    className="secondary-btn"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTrack(i)}
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
    </div>
  );
}

render(<App />, document.getElementById('app')!);
