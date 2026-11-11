import { useEffect, useState } from 'preact/hooks';

import type { Track } from '@yasq/shared';

import type { DiscordUser, PermissionRule } from '../types';

interface PermissionsListProps {
  permissions: { rule: PermissionRule; originalIndex: number }[];
  tracks: Track[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onNavigate: (url: string, returnPage?: number) => void;
  onDelete: (index: number) => void;
  getPageNumbers: (current: number, total: number) => (number | string)[];
}

async function fetchUserProfiles(ids: string[]): Promise<DiscordUser[]> {
  const users: DiscordUser[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const params = new URLSearchParams();
    ids.slice(offset, offset + 100).forEach(id => params.append('id', id));
    const response = await fetch(`/api/discord-user-profiles?${params}`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `Request failed (${response.status}).`);
    }
    users.push(...(result as DiscordUser[]));
  }
  return users;
}

export function PermissionsList({
  permissions,
  tracks,
  currentPage,
  totalPages,
  pageSize,
  onPageSizeChange,
  onNavigate,
  onDelete,
  getPageNumbers,
}: PermissionsListProps) {
  const [userProfiles, setUserProfiles] = useState<Record<string, DiscordUser>>({});
  const [profileError, setProfileError] = useState('');
  const pagePermissions = permissions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleUserIds = [...new Set(pagePermissions.flatMap(({ rule }) => rule.userIds))].sort();
  const visibleUserIdsKey = visibleUserIds.join(',');
  const trackNames = new Map(tracks.map(track => [track.audio, `${track.game} — ${track.title}`]));

  useEffect(() => {
    let isCurrent = true;
    if (visibleUserIds.length === 0) {
      setProfileError('');
      return () => {
        isCurrent = false;
      };
    }

    const loadProfiles = async () => {
      try {
        const users = await fetchUserProfiles(visibleUserIds);
        if (isCurrent) {
          setUserProfiles(current => ({
            ...current,
            ...Object.fromEntries(users.map(user => [user.id, user])),
          }));
          setProfileError('');
        }
      } catch (error) {
        if (isCurrent) {
          setProfileError(error instanceof Error ? error.message : 'Could not load Discord user profiles.');
        }
      }
    };

    void loadProfiles();
    return () => {
      isCurrent = false;
    };
  }, [visibleUserIdsKey]);

  return (
    <>
      <div className="tab-actions">
        <button
          type="button"
          onClick={() => onNavigate('/permissions/new', currentPage)}
          className="primary-btn"
        >
          + Add Permission
        </button>

        <div className="tab-controls-group">
          <span className="track-count-info">{permissions.length} rules found</span>
          <div className="page-size-selector">
            <label htmlFor="permission-page-size">Per page:</label>
            <select
              id="permission-page-size"
              value={pageSize}
              onChange={event => onPageSizeChange(Number((event.target as HTMLSelectElement).value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {profileError && <p role="alert">{profileError}</p>}
      <div className="playlists-container">
        {permissions.length === 0 ? (
          <p>No permission rules configured.</p>
        ) : (
          pagePermissions.map(({ rule, originalIndex }) => (
            <article
              key={originalIndex}
              className="permission-rule"
            >
              <div className="permission-rule-header">
                <span className={`permission-rule-type ${rule.type}`}>{rule.type}</span>
                <div className="card-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => onNavigate(`/permissions/${originalIndex}/edit`, currentPage)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => onDelete(originalIndex)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="permission-rule-detail">
                <strong>Users</strong>
                <ul className="permission-rule-users">
                  {rule.userIds.map(userId => {
                    const user = userProfiles[userId];
                    return (
                      <li
                        key={userId}
                        className="permission-rule-user"
                      >
                        {user ? (
                          <img
                            src={user.avatarUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span
                            className="permission-rule-user-avatar-fallback"
                            aria-hidden="true"
                          >
                            ?
                          </span>
                        )}
                        <span>
                          <strong>{user?.displayName || 'Unknown Discord user'}</strong>
                          <small>{user ? `@${user.username} · ${userId}` : userId}</small>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="permission-rule-detail">
                <strong>Tracks</strong>
                <ul className="permission-rule-files">
                  {rule.files.map(file => (
                    <li key={file}>{trackNames.get(file) || file}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="secondary-btn"
              disabled={currentPage === 1}
              onClick={() => onNavigate(`/permissions?page=${currentPage - 1}`)}
            >
              ← Prev
            </button>
            <div className="page-numbers">
              {getPageNumbers(currentPage, totalPages).map((page, index) =>
                typeof page === 'number' ? (
                  <button
                    key={index}
                    className={`secondary-btn page-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => onNavigate(`/permissions?page=${page}`)}
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
              onClick={() => onNavigate(`/permissions?page=${currentPage + 1}`)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
