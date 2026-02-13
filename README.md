# YASQ (Yet Another Soundtrack Quiz)
A multiplayer music quiz built as a Discord Activity.

## Setup

### Prerequistes
- **Node.js** (v22 or higher recommended)
- **npm**
- **Discord Developer Account**
- **cloudflared** (or other tunnel service)

### Installation
1. **Install Server Dependencies**
```bash
cd server
npm install
```

2. **Install Client Dependencies**
```bash
cd ../client
npm install
```

3. **Configure Discord**
- Go to the [Discord Developer Portal](https://discord.com/developers/applications).
- Create a new Application.

4. **Set up Environment Variables**\
Create a `.env` file in the root directory:
```env
VITE_DISCORD_CLIENT_ID=<Copy Client ID from Discord Developer Portal>
DISCORD_CLIENT_SECRET=<Copy Client Secret from Discord Developer Portal>
VITE_URL_MAPPING=<Fill Later>
```

### Local Development
1. **Start Server** (Terminal window 1)
```bash
cd server
npx tsx watch server.ts
```

2. **Start Client** (Terminal window 2)
```bash
cd client
npm run dev
```

3. **Setup Tunnel** (Terminal window 3)
```bash
# Example using cloudflared
cloudflared tunnel --url http://localhost:5173
```

4. **Update Tunnel URL**
- Set `VITE_URL_MAPPING` in `.env`.
- Create URL Mapping in Discord Developer Portal under the Activities tab.