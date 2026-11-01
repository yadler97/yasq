import type { Playlist } from '@yasq/shared';

interface PlaylistListProps {
  playlists: Playlist[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onNavigate: (url: string, returnPage?: number) => void;
  onDelete: (absoluteIndex: number) => void;
  getPageNumbers: (current: number, total: number) => (number | string)[];
}

export function PlaylistList({
  playlists,
  currentPage,
  totalPages,
  pageSize,
  onNavigate,
  onDelete,
  getPageNumbers,
}: PlaylistListProps) {
  const paginatedPlaylists = playlists.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <div className="tab-actions">
        <button
          onClick={() => onNavigate('/playlists/new', currentPage)}
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
            const absoluteIndex = (currentPage - 1) * pageSize + i;
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
                    onClick={() => onNavigate(`/playlists/${absoluteIndex}/edit`, currentPage)}
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

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="secondary-btn"
              disabled={currentPage === 1}
              onClick={() => onNavigate(`/playlists?page=${currentPage - 1}`)}
            >
              ← Prev
            </button>

            <div className="page-numbers">
              {getPageNumbers(currentPage, totalPages).map((page, index) =>
                typeof page === 'number' ? (
                  <button
                    key={index}
                    className={`secondary-btn page-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => onNavigate(`/playlists?page=${page}`)}
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
              onClick={() => onNavigate(`/playlists?page=${currentPage + 1}`)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
