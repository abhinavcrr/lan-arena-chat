# LAN Arena Chat

Gaming-themed chat for a local network. Players can only chat after the other player accepts a connect request.

## Run
1. Install Node.js (v18+): https://nodejs.org
2. In this folder: `npm install`
3. `npm start`
4. Open the "Network" link printed in the terminal (e.g. http://192.168.1.5:3000) on any device on the same Wi-Fi/LAN.

If other devices can't connect, allow port 3000 in your firewall.

## How it works
- Lobby lists everyone online.
- Press Connect on a player. They get a request and can Accept or Decline.
- Chat unlocks only for connected pairs. The server blocks messages between players who aren't connected.
- Either player can disconnect at any time.

Files: `server.js` (Express + Socket.IO), `public/index.html` (UI).
