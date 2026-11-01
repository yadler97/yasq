import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

import type { Playlist, Tag, Track } from '@yasq/shared';

import { TrackList } from './components/TrackList';
import { TrackForm } from './components/TrackForm';
import { PlaylistList } from './components/PlaylistList';
import { PlaylistForm } from './components/PlaylistForm';

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
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Parse current route from window.location path and search
  const parseRoute = (): Route => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const parts = path.split('/').filter(Boolean);

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
  const navigate = (url: string, returnPage?: number) => {
    const currentState = window.history.state || {};
    const newState = returnPage !== undefined ? { ...currentState, returnPage } : currentState;
    window.history.pushState(newState, '', url);
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
      await fetchTracks();

      let targetPage: number;
      if (isEditing) {
        targetPage = Math.floor(route.index / pageSize) + 1;
      } else {
        targetPage = Math.ceil((tracks.length + 1) / pageSize);
      }

      navigate(`/tracks?page=${targetPage}`);
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
      await fetchPlaylists();

      let targetPage: number;
      if (isEditing) {
        targetPage = Math.floor(route.index / pageSize) + 1;
      } else {
        targetPage = Math.ceil((playlists.length + 1) / pageSize);
      }

      navigate(`/playlists?page=${targetPage}`);
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

  const currentTracksPage = route.type === 'tracks-list' ? route.page : 1;
  const currentPlaylistPage = route.type === 'playlists-list' ? route.page : 1;

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

  const handlePlayTrack = (track: Track) => {
    if (activeTrack?.audio === track.audio) {
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
    } else {
      setActiveTrack(track);
      setIsPlaying(true);
    }
  };

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
        <TrackList
          tracks={tracks}
          currentPage={currentTracksPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onNavigate={navigate}
          onDelete={deleteTrack}
          onPlayTrack={handlePlayTrack}
          activeTrack={activeTrack}
          isPlaying={isPlaying}
          getPageNumbers={getPageNumbers}
        />
      )}

      {/* TRACKS FORM VIEW (NEW / EDIT) */}
      {(route.type === 'tracks-new' || route.type === 'tracks-edit') && (
        <TrackForm
          isEditing={route.type === 'tracks-edit'}
          game={game}
          setGame={setGame}
          title={title}
          setTitle={setTitle}
          audioFilename={audioFilename}
          setAudioFile={setAudioFile}
          setAudioFilename={setAudioFilename}
          coverFilename={coverFilename}
          setCoverFile={setCoverFile}
          setCoverFilename={setCoverFilename}
          tags={tags}
          addTagField={addTagField}
          removeTag={removeTag}
          updateTag={updateTag}
          onSubmit={submitTrack}
          onCancel={() => {
            const returnPage = window.history.state?.returnPage || 1;
            navigate(`/tracks?page=${returnPage}`);
          }}
        />
      )}

      {/* PLAYLISTS LIST VIEW */}
      {route.type === 'playlists-list' && (
        <PlaylistList
          playlists={playlists}
          tracks={tracks}
          currentPage={currentPlaylistPage}
          totalPages={playlistTotalPages}
          pageSize={pageSize}
          onNavigate={navigate}
          onDelete={deletePlaylist}
          onPlayTrack={handlePlayTrack}
          activeTrack={activeTrack}
          isPlaying={isPlaying}
          getPageNumbers={getPageNumbers}
        />
      )}

      {/* PLAYLISTS FORM VIEW (NEW / EDIT) */}
      {(route.type === 'playlists-new' || route.type === 'playlists-edit') && (
        <PlaylistForm
          isEditing={route.type === 'playlists-edit'}
          playlistName={playlistName}
          setPlaylistName={setPlaylistName}
          tracks={tracks}
          selectedTracks={selectedTracks}
          toggleTrackInPlaylist={toggleTrackInPlaylist}
          onSubmit={submitPlaylist}
          onCancel={() => {
            const returnPage = window.history.state?.returnPage || 1;
            navigate(`/playlists?page=${returnPage}`);
          }}
        />
      )}

      {activeTrack && (
        <div className="central-audio-player">
          <div className="player-meta">
            <img
              loading="lazy"
              src={activeTrack.cover ? `/covers/${activeTrack.cover}` : '/default.svg'}
              alt={`Cover of ${activeTrack.game}`}
              onError={e => {
                (e.currentTarget as HTMLImageElement).src = '/default.svg';
              }}
            />
            <div className="track-info">
              <p>
                <strong>{activeTrack.game}</strong>
              </p>
              <p>
                <i>{activeTrack.title}</i>
              </p>
            </div>
          </div>
          <audio
            ref={audioRef}
            controls
            autoPlay
            src={`/music/${activeTrack.audio}`}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}
    </div>
  );
}

render(<App />, document.getElementById('app')!);
