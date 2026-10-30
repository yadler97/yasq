import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { Tag, Track } from '@yasq/shared';

export function App() {
  const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [game, setGame] = useState('');
  const [audio, setAudioPath] = useState('');
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
    setAudioPath('');
    setTags([]);
    setEditingIndex(null);
  };

  const submitTrack = async (e: Event) => {
    e.preventDefault();
    const trackData = { title, game, audio, tags };

    const url = editingIndex !== null ? `/api/tracks/${editingIndex}` : '/api/tracks';
    const method = editingIndex !== null ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackData),
    });

    if (res.ok) {
      alert(editingIndex !== null ? 'Track updated successfully!' : 'Track saved locally!');
      resetForm();
      fetchTracks();
      setActiveTab('list');
    }
  };

  const startEdit = (index: number) => {
    const track = tracks[index];
    setTitle(track.title);
    setGame(track.game);
    setAudioPath(track.audio);
    setTags(track.tags || []);
    setEditingIndex(index);
    setActiveTab('add');
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
        <div className="tabs">
          <button
            onClick={() => {
              resetForm();
              setActiveTab('add');
            }}
            className={activeTab === 'add' ? 'active' : ''}
          >
            {editingIndex !== null ? 'Edit Track' : 'Add Track'}
          </button>
          <button
            onClick={() => {
              setActiveTab('list');
              fetchTracks();
            }}
            className={activeTab === 'list' ? 'active' : ''}
          >
            Existing Tracks ({tracks.length})
          </button>
        </div>
      </header>

      {activeTab === 'add' ? (
        <form
          onSubmit={submitTrack}
          className="creator-form"
        >
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
            <label>Audio File Path</label>
            <input
              type="text"
              required
              value={audio}
              onInput={e => setAudioPath((e.target as HTMLInputElement).value)}
            />
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
            {editingIndex !== null && (
              <button
                type="button"
                className="secondary-btn"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
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
                <p>
                  <strong>Game:</strong> {track.game}
                </p>
                <p>
                  <strong>Title:</strong> {track.title}
                </p>
                <p>
                  <strong>Path:</strong> {track.audio}
                </p>
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
