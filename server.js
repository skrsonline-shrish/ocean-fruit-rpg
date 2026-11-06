const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const SQLiteStoreFactory = require('connect-sqlite3')(session);
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const production = process.env.NODE_ENV === 'production';
const db = new Database(process.env.DB_FILE || path.join(__dirname, 'game.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  race TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

const races = {
  Human: { color: '#67c8ff', versions: ['Human I', 'Human II', 'Human III'], traits: ['Steady', 'Adaptable', 'Focused'], description: 'Balanced movement and a brief focus burst.' },
  Shark: { color: '#45e0dc', versions: ['Shark I', 'Shark II', 'Shark III'], traits: ['Tideborn', 'Current Runner', 'Abyssal'], description: 'Aquatic aura and a short water-current dash.' },
  Rabbit: { color: '#d8a7ff', versions: ['Rabbit I', 'Rabbit II', 'Rabbit III'], traits: ['Fleetfoot', 'Springstep', 'Moonbound'], description: 'Quick movement and a springing leap.' },
  Cyborg: { color: '#ffb866', versions: ['Cyborg I', 'Cyborg II', 'Cyborg III'], traits: ['Copper Core', 'Overdrive', 'Star Engine'], description: 'Mechanical glow and a short overdrive pulse.' }
};
const raceNames = Object.keys(races);
const chooseRace = () => raceNames[crypto.randomInt(raceNames.length)];
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please wait and try again.' } });

if (production && !process.env.SESSION_SECRET) {
  throw new Error('Set SESSION_SECRET to a long, random secret in production.');
}
if (production) app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: production ? [] : null } } }));
app.use(express.json({ limit: '10kb' }));
app.use(session({
  store: new SQLiteStoreFactory({ db: 'sessions.sqlite', dir: path.dirname(process.env.DB_FILE || path.join(__dirname, 'game.sqlite')) }),
  secret: process.env.SESSION_SECRET || 'development-only-change-before-deploy-' + crypto.randomBytes(24).toString('hex'),
  resave: false,
  saveUninitialized: false,
  name: 'ocean.sid',
  cookie: { httpOnly: true, sameSite: 'lax', secure: production, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

function safeUser(row) {
  const versionIndex = row.level >= 30 ? 2 : row.level >= 10 ? 1 : 0;
  return { username: row.username, level: row.level, xp: row.xp, race: row.race, raceVersion: races[row.race].versions[versionIndex], raceVersionIndex: versionIndex, raceInfo: races[row.race] };
}
function getUser(req) {
  return req.session.userId ? db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId) : null;
}
function requireAuth(req, res, next) {
  if (!getUser(req)) return res.status(401).json({ error: 'Please sign in first.' });
  next();
}
function validCredentials(body) {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return { error: 'Username must be 3–20 letters, numbers, or underscores.' };
  if (password.length < 10 || password.length > 72) return { error: 'Password must be 10–72 characters.' };
  return { username, password };
}

app.post('/api/signup', authLimiter, async (req, res) => {
  const input = validCredentials(req.body || {});
  if (input.error) return res.status(400).json({ error: input.error });
  const hash = await bcrypt.hash(input.password, 12);
  try {
    const result = db.prepare('INSERT INTO users (username, password_hash, race) VALUES (?, ?, ?)').run(input.username, hash, chooseRace());
    req.session.regenerate(err => {
      if (err) return res.status(500).json({ error: 'Could not start your session.' });
      req.session.userId = Number(result.lastInsertRowid);
      const user = getUser(req);
      res.status(201).json({ user: safeUser(user) });
    });
  } catch (e) {
    if (String(e.code).includes('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'That username is already taken.' });
    res.status(500).json({ error: 'Could not create account.' });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  const input = validCredentials(req.body || {});
  if (input.error) return res.status(400).json({ error: input.error });
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(input.username);
  if (!row || !(await bcrypt.compare(input.password, row.password_hash))) return res.status(401).json({ error: 'Incorrect username or password.' });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Could not start your session.' });
    req.session.userId = row.id;
    res.json({ user: safeUser(row) });
  });
});

app.get('/api/me', (req, res) => {
  const row = getUser(req);
  if (!row) return res.status(401).json({ error: 'Please sign in.' });
  res.json({ user: safeUser(row) });
});

app.post('/api/train', requireAuth, (req, res) => {
  const now = Date.now();
  if (req.session.lastTrain && now - req.session.lastTrain < 5000) return res.status(429).json({ error: 'Take a short breather before training again.' });
  req.session.lastTrain = now;
  const row = getUser(req);
  let xp = row.xp + 10;
  let level = row.level;
  while (xp >= level * 25 && level < 1000) {
    xp -= level * 25;
    level++;
  }
  db.prepare('UPDATE users SET level = ?, xp = ? WHERE id = ?').run(level, xp, row.id);
  res.json({ user: safeUser(getUser(req)) });
});

app.post('/api/logout', (req, res) => req.session.destroy(() => {
  res.clearCookie('ocean.sid', { httpOnly: true, sameSite: 'lax', secure: production });
  res.json({ ok: true });
}));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Ocean Fruit RPG running on http://localhost:${PORT}`));
