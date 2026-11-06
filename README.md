# Ocean Fruit RPG

An original 3D browser-game prototype with signup/login, randomly assigned saved races (Human, Shark, Rabbit, Cyborg), visible race auras/nameplates, basic race effects, drowning rules, and a simple shared chat.

## Run locally

Requires Node.js 20+.

```sh
npm install
npm start
```

Open http://localhost:3000. Create an account with a username of 3–20 letters/numbers/underscores and a unique password of at least 10 characters. The first account created in an empty database is the owner/admin account; registration should be closed or the admin role reassigned before publicly opening a populated service. Race is assigned once and saved. Train to unlock versions at levels 10, 30, and 60. Move with WASD, use your race skill with Space.

### Race and water rules

After receiving a fruit, select it in the fruit inventory to eat/equip it. While in open water, fruit users take drowning damage. Health recovers on land. Shark III (race version 3, unlocked at level 30) is immune to sea damage and swims slowly. Shark IV (unlocked at level 60) is immune and swims at 3× normal swimming speed. Other races and players without a fruit do not get Shark sea immunity.

### Owner tools and chat

The first account created in a fresh database is the admin. Only that account sees the admin panel. Enter a fruit name and choose **Spawn & get fruit**; this adds and equips it. The server validates admin access. The chat is shared through server-backed polling and escapes message text in the browser.

## Deployment and security notes

This is a prototype, not a production-ready multiplayer service. Deploy behind HTTPS with `NODE_ENV=production` and a long random `SESSION_SECRET`; use persistent storage for SQLite and backups. Never commit credentials or database files. Registration is currently open, and the first-created account receives admin privileges: control who can create the first account or modify the bootstrap-admin policy before a public launch. For scale, use managed PostgreSQL and a shared session store. Chat moderation, reporting, and retention controls are not yet implemented.

Passwords are hashed with bcrypt; sessions use HTTP-only, SameSite cookies and a SQLite-backed store. Auth and chat are rate-limited. Never reuse an important password on a prototype game.
