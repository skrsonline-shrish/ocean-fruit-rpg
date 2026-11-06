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
const databasePath = process.env.DB_FILE || path.join(__dirname, 'game.sqlite');
const db = new Database(databasePath);
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
function addColumnIfMissing(table, column, declaration) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name);
  if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${declaration}`);
}
addColumnIfMissing('users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('users', 'fruit_inventory', "TEXT NOT NULL DEFAULT '[]'");
addColumnIfMissing('users', 'fruit_name', 'TEXT');
addColumnIfMissing('users', 'health', 'REAL NOT NULL DEFAULT 100');
db.exec(`CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

const races = {
  Human: { color: '#67c8ff', versions: ['Human I', 'Human II', 'Human III', 'Human IV'], traits: ['Steady', 'Adaptable', 'Focused', 'Ascendant'], description: 'Balanced movement and a brief focus burst.' },
  Shark: { color: '#45e0dc', versions: ['Shark I', 'Shark II', 'Shark III', 'Shark IV'], traits: ['Tideborn', 'Current Runner', 'Abyssal', 'Ocean Sovereign'], description: 'Aquatic aura, current dash, and powerful swimming at higher versions.' },
  Rabbit: { color: '#d8a7ff', versions: ['Rabbit I', 'Rabbit II', 'Rabbit III', 'Rabbit IV'], traits: ['Fleetfoot', 'Springstep', 'Moonbound', 'Starbound'], description: 'Quick movement and a springing leap.' },
  Cyborg: { color: '#ffb866', versions: ['Cyborg I', 'Cyborg II', 'Cyborg III', 'Cyborg IV'], traits: ['Copper Core', 'Overdrive', 'Star Engine', 'Nova Engine'], description: 'Mechanical glow and an overdrive pulse.' }
};
const raceNames = Object.keys(races);
const chooseRace = () => raceNames[crypto.randomInt(raceNames.length)];
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please wait and try again.' } });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Chat is sending messages too quickly.' } });

if (production && !process.env.SESSION_SECRET) throw new Error('Set SESSION_SECRET to a long, random secret in production.');
if (production) app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: production ? [] : null } } }));
app.use(express.json({ limit: '10kb' }));
app.use(session({
  store: new SQLiteStoreFactory({ db: 'sessions.sqlite', dir: path.dirname(databasePath) }),
  secret: process.env.SESSION_SECRET || 'development-only-change-before-deploy-' + crypto.randomBytes(24).toString('hex'),
  resave: false,
  saveUninitialized: false,
  name: 'ocean.sid',
  cookie: { httpOnly: true, sameSite: 'lax', secure: production, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

function versionIndex(level) { return level >= 60 ? 3 : level >= 30 ? 2 : level >= 10 ? 1 : 0; }
function safeUser(row) {
  const index = versionIndex(row.level);
  let fruitInventory = [];
  try { fruitInventory = JSON.parse(row.fruit_inventory || '[]'); } catch { fruitInventory = []; }
  return { username: row.username, level: row.level, xp: row.xp, race: row.race, raceVersion: races[row.race].versions[index], raceVersionIndex: index, raceInfo: races[row.race], isAdmin: Boolean(row.is_admin), fruitInventory, fruitName: row.fruit_name || null, health: Math.max(0, Math.min(100, row.health)) };
}
function getUser(req) { return req.session.userId ? db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId) : null; }
function requireAuth(req, res, next) { if (!getUser(req)) return res.status(401).json({ error: 'Please sign in first.' }); next(); }
function requireAdmin(req, res, next) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in first.' });
  if (!user.is_admin) return res.status(403).json({ error: 'Admin access required.' });
  next();
}
function validCredentials(body) {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return { error: 'Username must be 3–20 letters, numbers, or underscores.' };
  if (password.length < 10 || password.length > 72) return { error: 'Password must be 10–72 characters.' };
  return { username, password };
}
function startSession(req, res, userId, status = 200) {
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Could not start your session.' });
    req.session.userId = userId;
    req.session.save(saveError => {
      if (saveError) return res.status(500).json({ error: 'Could not save your session.' });
      res.status(status).json({ user: safeUser(getUser(req)) });
    });
  });
}

app.post('/api/signup', authLimiter, async (req, res) => {
  const input = validCredentials(req.body || {});
  if (input.error) return res.status(400).json({ error: input.error });
  const hash = await bcrypt.hash(input.password, 12);
  try {
    const insert = db.transaction(() => {
      const isFirstAccount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0;
      return db.prepare('INSERT INTO users (username, password_hash, race, is_admin) VALUES (?, ?, ?, ?)').run(input.username, hash, chooseRace(), isFirstAccount ? 1 : 0);
    });
    const result = insert();
    startSession(req, res, Number(result.lastInsertRowid), 201);
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
  startSession(req, res, row.id);
});
app.get('/api/me', (req, res) => { const row = getUser(req); if (!row) return res.status(401).json({ error: 'Please sign in.' }); res.json({ user: safeUser(row) }); });

app.post('/api/train', requireAuth, (req, res) => {
  const now = Date.now();
  if (req.session.lastTrain && now - req.session.lastTrain < 5000) return res.status(429).json({ error: 'Take a short breather before training again.' });
  req.session.lastTrain = now;
  const row = getUser(req); let xp = row.xp + 10; let level = row.level;
  while (xp >= level * 25 && level < 1000) { xp -= level * 25; level++; }
  db.prepare('UPDATE users SET level = ?, xp = ? WHERE id = ?').run(level, xp, row.id);
  res.json({ user: safeUser(getUser(req)) });
});

app.post('/api/admin/spawn', requireAuth, requireAdmin, (req, res) => {
  const fruitName = typeof req.body?.fruitName === 'string' ? req.body.fruitName.trim() : '';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’-]{0,39}$/u.test(fruitName)) return res.status(400).json({ error: 'Enter a fruit name (up to 40 letters, numbers, spaces, apostrophes, or hyphens).' });
  const user = getUser(req); const inventory = JSON.parse(user.fruit_inventory || '[]');
  if (!inventory.includes(fruitName)) inventory.push(fruitName);
  db.prepare('UPDATE users SET fruit_inventory = ?, fruit_name = ? WHERE id = ?').run(JSON.stringify(inventory), fruitName, user.id);
  res.json({ user: safeUser(getUser(req)), message: `${fruitName} added to your inventory and equipped.` });
});
app.post('/api/fruit/eat', requireAuth, (req, res) => {
  const fruitName = typeof req.body?.fruitName === 'string' ? req.body.fruitName : '';
  const user = getUser(req); const inventory = JSON.parse(user.fruit_inventory || '[]');
  if (!inventory.includes(fruitName)) return res.status(404).json({ error: 'You do not own that fruit.' });
  db.prepare('UPDATE users SET fruit_name = ?, health = 100 WHERE id = ?').run(fruitName, user.id);
  res.json({ user: safeUser(getUser(req)), message: `${fruitName} eaten. Beware of the sea!` });
});
app.post('/api/world/tick', requireAuth, (req, res) => {
  const user = getUser(req); const inWater = req.body?.inWater === true;
  const elapsed = Math.max(0, Math.min(2, Number(req.body?.seconds) || 1));
  const sharkSafe = user.race === 'Shark' && versionIndex(user.level) >= 2;
  let health = user.health;
  if (inWater && user.fruit_name && !sharkSafe) health = Math.max(0, health - 12 * elapsed);
  else health = Math.min(100, health + 4 * elapsed);
  db.prepare('UPDATE users SET health = ? WHERE id = ?').run(health, user.id);
  const swimmingSpeedMultiplier = user.race === 'Shark' && versionIndex(user.level) >= 3 ? 3 : user.race === 'Shark' && versionIndex(user.level) >= 2 ? 0.65 : 1;
  res.json({ health, drowning: inWater && Boolean(user.fruit_name) && !sharkSafe && health > 0, sharkSafe, swimmingSpeedMultiplier, knockedOut: health <= 0 });
});

app.get('/api/chat', requireAuth, (req, res) => {
  const after = Math.max(0, Number.parseInt(req.query.after, 10) || 0);
  const messages = db.prepare('SELECT id, username, message, created_at AS createdAt FROM chat_messages WHERE id > ? ORDER BY id DESC LIMIT 50').all(after).reverse();
  res.json({ messages });
});
app.post('/api/chat', requireAuth, chatLimiter, (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().replace(/[\u0000-\u001f\u007f]/g, '') : '';
  if (!message || message.length > 180) return res.status(400).json({ error: 'Chat messages must be 1–180 characters.' });
  const user = getUser(req);
  const result = db.prepare('INSERT INTO chat_messages (user_id, username, message) VALUES (?, ?, ?)').run(user.id, user.username, message);
  res.status(201).json({ message: db.prepare('SELECT id, username, message, created_at AS createdAt FROM chat_messages WHERE id = ?').get(result.lastInsertRowid) });
});
app.post('/api/logout', (req, res) => req.session.destroy(() => { res.clearCookie('ocean.sid', { httpOnly: true, sameSite: 'lax', secure: production }); res.json({ ok: true }); }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Ocean Fruit RPG running on http://localhost:${PORT}`));
