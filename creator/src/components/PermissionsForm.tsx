import { useEffect, useState } from 'preact/hooks';

interface DiscordGuild {
  id: string;
  name: string;
}

interface DiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

interface Track {
  audio: string;
  game: string;
  title: string;
}

interface PermissionRule {
  type: 'whitelist' | 'blacklist';
  userIds: string[];
  files: string[];
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || `Request failed (${response.status}).`);
  }
  return result as T;
}

export function PermissionsForm() {
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [guildId, setGuildId] = useState('');
  const [users, setUsers] = useState<DiscordUser[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, DiscordUser>>({});
  const [tracks, setTracks] = useState<Track[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [trackQuery, setTrackQuery] = useState('');
  const [rules, setRules] = useState<PermissionRule[]>([]);
  const [ruleType, setRuleType] = useState<PermissionRule['type']>('whitelist');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoadingGuilds, setIsLoadingGuilds] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const [loadedGuilds, loadedTracks, loadedRules] = await Promise.all([
          fetchJson<DiscordGuild[]>('/api/discord-guilds'),
          fetchJson<Track[]>('/api/tracks'),
          fetchJson<PermissionRule[]>('/api/permissions'),
        ]);
        setGuilds(loadedGuilds);
        setTracks(loadedTracks);
        setRules(loadedRules);
        const userIds = [...new Set(loadedRules.flatMap(rule => rule.userIds))];
        if (userIds.length > 0) {
          const params = new URLSearchParams();
          userIds.slice(0, 100).forEach(id => params.append('id', id));
          const profiles = await fetchJson<DiscordUser[]>(`/api/discord-user-profiles?${params}`);
          setUserProfiles(Object.fromEntries(profiles.map(user => [user.id, user])));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load permissions data.');
      } finally {
        setIsLoadingGuilds(false);
      }
    };

    void loadFormData();
  }, []);

  const selectGuild = async (id: string) => {
    setGuildId(id);
    setUsers([]);
    setSelectedUserIds([]);
    setError('');
    setSuccess('');
    if (!id) return;

    setIsLoadingMembers(true);
    try {
      const params = new URLSearchParams({ guildId: id });
      const loadedUsers = await fetchJson<DiscordUser[]>(`/api/discord-users?${params}`);
      setUsers(loadedUsers);
      setUserProfiles(current => ({
        ...current,
        ...Object.fromEntries(loadedUsers.map(user => [user.id, user])),
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load server members.');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const addRule = () => {
    if (selectedUserIds.length === 0 || selectedFiles.length === 0) {
      setError('Select at least one user and one track file for the rule.');
      return;
    }

    setRules(current => [
      ...current,
      {
        type: ruleType,
        userIds: selectedUserIds,
        files: selectedFiles,
      },
    ]);
    setSelectedUserIds([]);
    setSelectedFiles([]);
    setError('');
    setSuccess('');
  };

  const saveRules = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const savedRules = await fetchJson<PermissionRule[]>('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      });
      setRules(savedRules);
      setSuccess('Permission rules saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save permission rules.');
    } finally {
      setIsSaving(false);
    }
  };

  const trackNames = new Map(tracks.map(track => [track.audio, `${track.game} — ${track.title}`]));
  const filteredUsers = users.filter(user =>
    `${user.displayName} ${user.username} ${user.id}`.toLowerCase().includes(userQuery.toLowerCase())
  );
  const filteredTracks = tracks.filter(track =>
    `${track.game} ${track.title} ${track.audio}`.toLowerCase().includes(trackQuery.toLowerCase())
  );
  const selectedUsersById = new Map(users.map(user => [user.id, user]));

  const toggleUser = (userId: string) => {
    setSelectedUserIds(current =>
      current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]
    );
  };

  const toggleTrack = (audio: string) => {
    setSelectedFiles(current =>
      current.includes(audio) ? current.filter(file => file !== audio) : [...current, audio]
    );
  };

  return (
    <section className="creator-form">
      <h3>Permissions</h3>
      <p>Create whitelist and blacklist rules for track files.</p>

      <div className="field">
        <label htmlFor="permission-guild">Discord Server</label>
        <select
          id="permission-guild"
          value={guildId}
          disabled={isLoadingGuilds || guilds.length === 0}
          onChange={event => void selectGuild((event.target as HTMLSelectElement).value)}
        >
          <option value="">
            {isLoadingGuilds ? 'Loading servers...' : guilds.length ? 'Select a server' : 'No servers available'}
          </option>
          {guilds.map(guild => (
            <option
              key={guild.id}
              value={guild.id}
            >
              {guild.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="permission-type">Rule Type</label>
        <select
          id="permission-type"
          value={ruleType}
          onChange={event => setRuleType((event.target as HTMLSelectElement).value as PermissionRule['type'])}
        >
          <option value="whitelist">Whitelist</option>
          <option value="blacklist">Blacklist</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="permission-user-search">Users ({selectedUserIds.length} selected)</label>
        <small>
          {isLoadingMembers
            ? 'Loading all server members...'
            : guildId
              ? `${users.length} server members loaded.`
              : 'Select a server to load its members.'}
        </small>
        <input
          id="permission-user-search"
          type="text"
          placeholder="Search users by name or ID"
          value={userQuery}
          disabled={!guildId || isLoadingMembers || users.length === 0}
          onInput={event => setUserQuery((event.target as HTMLInputElement).value)}
        />
        <div className="playlist-track-selector">
          {filteredUsers.map(user => (
            <label
              key={user.id}
              className="playlist-track-item"
            >
              <input
                type="checkbox"
                checked={selectedUserIds.includes(user.id)}
                onChange={() => toggleUser(user.id)}
              />
              <span>
                <strong>{user.displayName}</strong> (@{user.username}) <small>({user.id})</small>
              </span>
            </label>
          ))}
          {!isLoadingMembers && guildId && filteredUsers.length === 0 && <small>No matching users.</small>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="permission-track-search">Tracks ({selectedFiles.length} selected)</label>
        <input
          id="permission-track-search"
          type="text"
          placeholder="Search tracks by game, title, or filename"
          value={trackQuery}
          disabled={tracks.length === 0}
          onInput={event => setTrackQuery((event.target as HTMLInputElement).value)}
        />
        <div className="playlist-track-selector">
          {filteredTracks.map((track, index) => (
            <label
              key={`${track.audio}-${index}`}
              className="playlist-track-item"
            >
              <input
                type="checkbox"
                checked={selectedFiles.includes(track.audio)}
                onChange={() => toggleTrack(track.audio)}
              />
              <span>
                <strong>{track.game}</strong> - {track.title} <small>({track.audio})</small>
              </span>
            </label>
          ))}
          {tracks.length === 0 && <small>Add tracks before creating permission rules.</small>}
          {tracks.length > 0 && filteredTracks.length === 0 && <small>No matching tracks.</small>}
        </div>
      </div>

      <button
        type="button"
        className="secondary-btn"
        onClick={addRule}
      >
        Add Rule
      </button>

      <div className="field">
        <h4>Permission Rules</h4>
        {rules.length === 0 ? (
          <p>No permission rules configured.</p>
        ) : (
          <ul className="permission-rules">
            {rules.map((rule, index) => (
              <li
                key={`${rule.type}-${index}`}
                className="permission-rule"
              >
                <div className="permission-rule-header">
                  <span className={`permission-rule-type ${rule.type}`}>{rule.type}</span>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setRules(current => current.filter((_, ruleIndex) => ruleIndex !== index));
                      setSuccess('');
                    }}
                  >
                    Remove
                  </button>
                </div>
                <div className="permission-rule-detail">
                  <strong>Users</strong>
                  <ul className="permission-rule-users">
                    {rule.userIds.map(userId => {
                      const user = userProfiles[userId] || selectedUsersById.get(userId);
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
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
      <div className="form-actions">
        <button
          type="button"
          className="primary-btn"
          disabled={isSaving}
          onClick={() => void saveRules()}
        >
          {isSaving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>

      <small>The bot must be in the server and have the Server Members Intent enabled.</small>
    </section>
  );
}
