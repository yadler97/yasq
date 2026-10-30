import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

import type { Tag } from '@yasq/shared';

//import './style.css';

interface Track {
  title: string;
  game: string;
  audioPath: string;
  tags: { type: string; value: string }[];
  createdAt: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
  const [tracks, setTracks] = useState<Track[]>([]);

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

  const submitTrack = async (e: Event) => {
    e.preventDefault();
    const trackData = { title, game, audioPath: audio, tags, createdAt: new Date().toISOString() };

    const res = await fetch('/api/save-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackData),
    });

    if (res.ok) {
      alert('Track saved locally!');
      setTitle('');
      setGame('');
      setAudioPath('');
      setTags([{ type: 'platform', value: '' }]);
      fetchTracks(); // Refresh list
    }
  };

  return (
    <div className="creator-wrapper">
      <header className="creator-header">
        <h2>Creator Dashboard</h2>
        <div className="tabs">
          <button
            onClick={() => setActiveTab('add')}
            className={activeTab === 'add' ? 'active' : ''}
          >
            Add Track
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
          <button
            type="submit"
            className="primary-btn"
          >
            Save Track
          </button>
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
                  <strong>Path:</strong> {track.audioPath}
                </p>
                <small>Added: {new Date(track.createdAt).toLocaleString()}</small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

render(<App />, document.getElementById('app')!);
