# YASQ (Yet Another Soundtrack Quiz)
A Multiplayer Soundtrack Quiz built as a Discord Activity.

## Setup

### Prerequistes
- **Node.js** (v22 or higher recommended)
- **npm**
- **Discord Developer Account**
- **cloudflared** (or other tunnel service)

### Installation
1. **Install Dependencies**
```bash
npm install
```

2. **Configure Discord**
- Go to the [Discord Developer Portal](https://discord.com/developers/applications).
- Create a new Application.

3. **Set up Environment Variables**\
Create a `.env` file in the root directory:
```env
VITE_DISCORD_CLIENT_ID=<Copy Client ID from Discord Developer Portal>
DISCORD_CLIENT_SECRET=<Copy Client Secret from Discord Developer Portal>
VITE_URL_MAPPING=<Fill Later>
```

### Local Development
1. **Start Client and Server** (Terminal window 1)
```bash
npm run dev
```

3. **Setup Tunnel** (Terminal window 2)
```bash
# Example using cloudflared
cloudflared tunnel --url http://localhost:5173
```

4. **Update Tunnel URL**
- Set `VITE_URL_MAPPING` in `.env`.
- Create URL Mapping in Discord Developer Portal under the Activities tab.

### Game Setup
1. Copy tracks as mp3 into `server/data/music`
2. Copy game covers as png into `server/data/game_covers` (Note: name must be the same as for the corresponding mp3 file: `track001.mp3` -> `track001.png`!)
3. Create `tracks.json` in `server/data` with the following format:

    ```json
    [
        {
            "name": "Game Title 1",
            "title": "Track Title 1",
            "file": "File Name 1",
            "tags": [
                { "type": "X", "value": "Y" },
                ...
            ]
        },
        {
            "name": "Game Title 2",
            "title": "Track Title 2",
            "file": "File Name 2",
            "tags": [
                { "type": "X", "value": "Y" },
                ...
            ]
        },
        ...
    ]
    ```
    (Note: file name must be without file extension: `track001.mp3` -> `track001`)\
    Tags can be used to provide more information about a specific game (e.g. Release, Platform, Developer)
4. (Optional) Create `playlists.json` in `server/data` with the following format:
    ```json
    [
        {
            "name": "Playlist 1",
            "tracks": ["File Name 1", "File Name 2", "File Name 3", ...]
        },
        {
            "name": "Playlist 2",
            "tracks": ["File Name 1", "File Name 4", "File Name 5", ...]
        },
        ...
    ]
    ```
    (Note: file name must be without file extension: `track001.mp3` -> `track001`)

## Author
**Yannick Adler** - [GitHub Profile](https://github.com/yadler97)

### Special Thanks
A huge thanks to my beta testers for helping me break the game so I could actually fix it:
- Deniz
- Johannes
- Josch
- Matthi
- Noel