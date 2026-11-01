import type { Track } from '@yasq/shared';

interface TrackListProps {
  tracks: Track[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onNavigate: (url: string, returnPage?: number) => void;
  onDelete: (absoluteIndex: number) => void;
  getPageNumbers: (current: number, total: number) => (number | string)[];
}

export function TrackList({
  tracks,
  currentPage,
  totalPages,
  pageSize,
  onNavigate,
  onDelete,
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
                  <audio
                    controls
                    preload="none"
                    src={`/music/${track.audio}`}
                  />
                  <div className="card-actions">
                    <button
                      onClick={() => onNavigate(`/tracks/${absoluteIndex}/edit`, currentPage)}
                      className="secondary-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(absoluteIndex)}
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
