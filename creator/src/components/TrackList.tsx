import type { Track } from '@yasq/shared';

interface TrackListProps {
  tracks: { track: Track; originalIndex: number }[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onNavigate: (url: string, returnPage?: number) => void;
  onDelete: (absoluteIndex: number) => void;
  onPlayTrack: (track: Track) => void;
  activeTrack: Track | null;
  isPlaying: boolean;
  getPageNumbers: (current: number, total: number) => (number | string)[];
}

export function TrackList({
  tracks,
  currentPage,
  totalPages,
  pageSize,
  onPageSizeChange,
  onNavigate,
  onDelete,
  onPlayTrack,
  activeTrack,
  isPlaying,
  getPageNumbers,
}: TrackListProps) {
  const paginatedTracks = tracks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <div className="tab-actions">
        <button
          onClick={() => onNavigate('/tracks/new', currentPage)}
          className="primary-btn"
        >
          + Add Track
        </button>

        <div className="page-size-selector">
          <label htmlFor="page-size-select">Per page:</label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={e => onPageSizeChange(Number((e.target as HTMLSelectElement).value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="tracks-container">
        <div className="tracks-list">
          {tracks.length === 0 ? (
            <p>No tracks saved yet.</p>
          ) : (
            paginatedTracks.map(({ track, originalIndex }) => {
              const isThisPlaying = activeTrack?.audio === track.audio && isPlaying;

              return (
                <div
                  key={originalIndex}
                  className="track-card"
                >
                  <img
                    loading="lazy"
                    src={track.cover ? `/covers/${track.cover}` : '/default.svg'}
                    alt={`Cover of ${track.game}`}
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src = '/default.svg';
                    }}
                  />
                  <div className="track-info">
                    <p>
                      <strong>{track.game}</strong>
                    </p>
                    <p>
                      <i>{track.title}</i>
                    </p>
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="secondary-btn"
                    >
                      {isThisPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>
                    <button
                      onClick={() => onNavigate(`/tracks/${originalIndex}/edit`, currentPage)}
                      className="secondary-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(originalIndex)}
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
              onClick={() => onNavigate(`/tracks?page=${currentPage - 1}`)}
            >
              ← Prev
            </button>

            <div className="page-numbers">
              {getPageNumbers(currentPage, totalPages).map((page, index) =>
                typeof page === 'number' ? (
                  <button
                    key={index}
                    className={`secondary-btn page-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => onNavigate(`/tracks?page=${page}`)}
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
              onClick={() => onNavigate(`/tracks?page=${currentPage + 1}`)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
