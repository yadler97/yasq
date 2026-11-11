import { render } from 'preact';
import { useState, useEffect, useRef, useMemo } from 'preact/hooks';

import type { Playlist, Track } from '@yasq/shared';

import { TrackList } from './components/TrackList';
import { TrackForm } from './components/TrackForm';
import { PlaylistList } from './components/PlaylistList';
import { PlaylistForm } from './components/PlaylistForm';
import { SettingsForm } from './components/SettingsForm';
import { PermissionsForm } from './components/PermissionsForm';

import './style.css';
import { FilterSidebar } from './components/FilterSidebar';

type Route =
  | { type: 'tracks-list'; page: number }
  | { type: 'tracks-new' }
  | { type: 'tracks-edit'; index: number }
  | { type: 'playlists-list'; page: number }
  | { type: 'playlists-new' }
  | { type: 'playlists-edit'; index: number }
  | { type: 'settings' }
  | { type: 'permissions' };

type SelectedTagsState = Record<string, string[]>;

export function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<SelectedTagsState>({});

  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [pageSize, setPageSize] = useState<number>(10);

  // Parse current route from window.location path and search
  const parseRoute = (): Route => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const parts = path.split('/').filter(Boolean);

    const p = parseInt(params.get('page') || '1', 10);
    const page = isNaN(p) || p < 1 ? 1 : p;

    if (parts[0] === 'settings') {
      return { type: 'settings' };
    }

    if (parts[0] === 'permissions') {
      return { type: 'permissions' };
    }

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

  const availableTagsByCategory = useMemo(() => {
    const groups: Record<string, string[]> = {};
    tracks.forEach(track => {
      track.tags?.forEach(tag => {
        if (!groups[tag.type]) groups[tag.type] = [];
        if (!groups[tag.type].includes(tag.value)) {
          groups[tag.type].push(tag.value);
        }
      });
    });

    // Sort tag values within each category alphabetically
    Object.keys(groups).forEach(type => groups[type].sort());
    return groups;
  }, [tracks]);

  const indexedTracks = tracks.map((track, originalIndex) => ({ track, originalIndex }));

  const baseTracks = useMemo(() => {
    return indexedTracks.filter(({ track }) => {
      return (
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.game.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [tracks, searchQuery]);

  const activeTagCategories = Object.entries(selectedTags).filter(([_, vals]) => vals.length > 0);

  const filteredTracks = useMemo(() => {
    if (activeTagCategories.length === 0) return baseTracks;

    return baseTracks.filter(({ track }) =>
      activeTagCategories.every(([type, selectedVals]) =>
        track.tags?.some(t => t.type === type && selectedVals.includes(t.value))
      )
    );
  }, [baseTracks, activeTagCategories]);

  const indexedPlaylists = playlists.map((playlist, originalIndex) => ({ playlist, originalIndex }));
  const filteredPlaylists = indexedPlaylists.filter(({ playlist }) =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tracksTotalPages = Math.ceil(filteredTracks.length / pageSize) || 1;
  const playlistTotalPages = Math.ceil(filteredPlaylists.length / pageSize) || 1;

  // Sync route on browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Clamp pages if needed after data loads
  useEffect(() => {
    if (route.type === 'tracks-list' && tracks.length > 0 && route.page > tracksTotalPages) {
      navigate(`/tracks?page=${tracksTotalPages}`);
    }
    if (route.type === 'playlists-list' && playlists.length > 0 && route.page > playlistTotalPages) {
      navigate(`/playlists?page=${playlistTotalPages}`);
    }
  }, [tracks.length, tracksTotalPages, playlists.length, playlistTotalPages, route]);

  // Navigation helper
  const navigate = (url: string, returnPage?: number) => {
    const currentState = window.history.state || {};
    const newState = returnPage !== undefined ? { ...currentState, returnPage } : currentState;
    window.history.pushState(newState, '', url);
    setRoute(parseRoute());
  };

  const handleTrackFormSuccess = async () => {
    await fetchTracks();

    let targetPage: number;
    if (route.type === 'tracks-edit') {
      targetPage = Math.floor(route.index / pageSize) + 1;
    } else {
      targetPage = Math.ceil((tracks.length + 1) / pageSize);
    }

    navigate(`/tracks?page=${targetPage}`);
  };

  const handlePlaylistFormSuccess = async () => {
    await fetchPlaylists();

    let targetPage: number;
    if (route.type === 'playlists-edit') {
      targetPage = Math.floor(route.index / pageSize) + 1;
    } else {
      targetPage = Math.ceil((playlists.length + 1) / pageSize);
    }

    navigate(`/playlists?page=${targetPage}`);
  };

  const fetchTracks = async () => {
    const res = await fetch('/api/tracks');
    if (res.ok) setTracks(await res.json());
  };

  const fetchPlaylists = async () => {
    const res = await fetch('/api/playlists');
    if (res.ok) setPlaylists(await res.json());
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    if (res.ok) setSettings(await res.json());
  };

  useEffect(() => {
    fetchTracks();
    fetchPlaylists();
    fetchSettings();
  }, []);

  const deleteTrack = async (absoluteIndex: number) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    const res = await fetch(`/api/tracks/${absoluteIndex}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) fetchTracks();
  };

  const deletePlaylist = async (absoluteIndex: number) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    const res = await fetch(`/api/playlists/${absoluteIndex}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) fetchPlaylists();
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

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    const currentTab = isTracksActive ? '/tracks' : '/playlists';
    navigate(`${currentTab}?page=1`);
  };

  const isTracksActive = route.type.startsWith('tracks');
  const isPlaylistsActive = route.type.startsWith('playlists');
  const isPermissionsActive = route.type === 'permissions';
  const isSettingsActive = route.type === 'settings';

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
            className={`secondary-btn ${isPlaylistsActive ? 'active' : ''}`}
            onClick={() => navigate('/playlists')}
          >
            Playlists
          </button>

          <button
            className={`secondary-btn ${isPermissionsActive ? 'active' : ''}`}
            onClick={() => navigate('/permissions')}
          >
            Permissions
          </button>

          <button
            className={`secondary-btn ${isSettingsActive ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
          >
            Settings
          </button>
        </nav>
      </header>

      <div className="creator-body">
        {(route.type === 'tracks-list' || route.type === 'playlists-list') && (
          <aside className="creator-sidebar">
            <FilterSidebar
              selectedTags={selectedTags}
              setSelectedTags={setSelectedTags}
              activeTagCategories={activeTagCategories}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              availableTagsByCategory={availableTagsByCategory}
              baseTracks={baseTracks}
              isTracksActive={isTracksActive}
            />
          </aside>
        )}

        <main className="creator-main-content">
          {route.type === 'tracks-list' && (
            <TrackList
              tracks={filteredTracks}
              currentPage={currentTracksPage}
              totalPages={tracksTotalPages}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              onNavigate={navigate}
              onDelete={deleteTrack}
              onPlayTrack={handlePlayTrack}
              activeTrack={activeTrack}
              isPlaying={isPlaying}
              hasActiveFilters={Boolean(searchQuery) || activeTagCategories.length > 0}
              getPageNumbers={getPageNumbers}
            />
          )}

          {(route.type === 'tracks-new' || route.type === 'tracks-edit') && (
            <TrackForm
              isEditing={route.type === 'tracks-edit'}
              indexedTrack={
                route.type === 'tracks-edit' && tracks[route.index]
                  ? { track: tracks[route.index], originalIndex: route.index }
                  : undefined
              }
              tracks={tracks}
              availableTagsByCategory={availableTagsByCategory}
              onSuccess={handleTrackFormSuccess}
              onCancel={() => {
                const returnPage = window.history.state?.returnPage || 1;
                navigate(`/tracks?page=${returnPage}`);
              }}
            />
          )}

          {route.type === 'playlists-list' && (
            <PlaylistList
              playlists={filteredPlaylists}
              tracks={tracks}
              currentPage={currentPlaylistPage}
              totalPages={playlistTotalPages}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              onNavigate={navigate}
              onDelete={deletePlaylist}
              onPlayTrack={handlePlayTrack}
              activeTrack={activeTrack}
              isPlaying={isPlaying}
              hasActiveFilters={Boolean(searchQuery) || activeTagCategories.length > 0}
              getPageNumbers={getPageNumbers}
            />
          )}

          {(route.type === 'playlists-new' || route.type === 'playlists-edit') && (
            <PlaylistForm
              isEditing={route.type === 'playlists-edit'}
              indexedPlaylist={
                route.type === 'playlists-edit' && playlists[route.index]
                  ? { playlist: playlists[route.index], originalIndex: route.index }
                  : undefined
              }
              tracks={tracks}
              onSuccess={handlePlaylistFormSuccess}
              onCancel={() => {
                const returnPage = window.history.state?.returnPage || 1;
                navigate(`/playlists?page=${returnPage}`);
              }}
            />
          )}

          {route.type === 'settings' &&
            (settings ? <SettingsForm initialSettings={settings} /> : <p>Loading settings...</p>)}

          {route.type === 'permissions' && <PermissionsForm />}
        </main>

        {activeTrack && (
          <aside className="central-audio-player">
            <button
              className="player-close-btn"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                }
                setActiveTrack(null);
                setIsPlaying(false);
              }}
              aria-label="Close player"
            >
              &times;
            </button>
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
          </aside>
        )}
      </div>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
