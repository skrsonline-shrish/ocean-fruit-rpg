# Ocean Fruit RPG

An original 3D browser-game prototype with account signup/login and four randomly assigned player races: Human, Shark, Rabbit, and Cyborg. A new account receives one race at signup; the race is saved and stays the same on later logins. Race versions unlock at levels 10 and 30 and change the aura/effect strength.

## Run locally

Requirements: Node.js 20 or newer.

```sh
npm install
npm start
```

Open http://localhost:3000. Create an account with a username of 3–20 letters/numbers/underscores and a unique password of at least 10 characters. Move with WASD, use your race skill with Space or the button, and train once every five seconds to gain XP. Player accounts, race, level, and XP are stored in SQLite.

## Deployment and security notes

This is a playable starter prototype, not a production-ready multiplayer service. For deployment, use a persistent disk for the SQLite database and set `NODE_ENV=production` and a long random `SESSION_SECRET` environment variable. Use HTTPS. Back up the database, monitor the service, and verify your host's persistent storage/session behavior. Do not commit credentials or database files. For larger scale, migrate SQLite and file-backed sessions to managed PostgreSQL and a shared session store.

Passwords are hashed with bcrypt; sessions use HTTP-only, SameSite cookies and a SQLite-backed store. Authentication routes are rate-limited. Never reuse an important password on a prototype game.

This game is original and does not include third-party franchise assets.
