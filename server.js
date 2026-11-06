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
function addColumnIfMissing(column, declaration) {
  const columns = db.prepare('PRAGMA table_info(users)').all().map(row => row.name);
  if (!columns.includes(column)) db.exec(`ALTER TABLE users ADD COLUMN ${column} ${declaration}`);
}
addColumnIfMissing('is_admin', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('berries', 'INTEGER NOT NULL DEFAULT 10000');
addColumnIfMissing('energy', 'REAL NOT NULL DEFAULT 100');
addColumnIfMissing('learned_skills', "TEXT NOT NULL DEFAULT '[]'");
addColumnIfMissing('skill_mastery', "TEXT NOT NULL DEFAULT '{}'");

const races = {
  Human: { color: '#67c8ff' }, Shark: { color: '#45e0dc' },
  Rabbit: { color: '#d8a7ff' }, Cyborg: { color: '#ffb866' }
};
const raceNames = Object.keys(races);
const trainers = [
  { id: 'dodge', name: 'Dodge Training', teacher: 'Mira Quickstep', island: 'Coral Harbor', minLevel: 1, cost: 2500, description: 'Learn a quick evasive dash. Mastery increases dash distance and reduces its cooldown.' },
  { id: 'haki', name: 'Haki Training', teacher: 'Old Kai', island: 'Tempest Port', minLevel: 101, cost: 75000, description: 'Surround yourself with a willpower aura. Mastery improves its duration and combat boost.' },
  { id: 'teleport', name: 'Blink Training', teacher: 'The Wayfinder', island: 'Starfall Docks', minLevel: 601, cost: 500000, description: 'Learn a short-range teleport. Mastery increases distance and reduces cooldown.' }
];
const skillDefaults = {
  dodge: { cooldownMs: 8000, energyCost: 20, durationMs: 650, baseDistance: 7 },
  haki: { cooldownMs: 15000, energyCost: 30, durationMs: 6000, damageMultiplier: 1.2 },
  teleport: { cooldownMs: 12000, energyCost: 25, durationMs: 350, baseDistance: 8 }
};
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false });
const skillLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });
if (production && !process.env.SESSION_SECRET) throw new Error('Set SESSION_SECRET to a long, random secret in production.');
if (production) app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: production ? [] : null } } }));
app.use(express.json({ limit: '10kb' }));
app.use(session({
  store: new SQLiteStoreFactory({ db: 'sessions.sqlite', dir: path.dirname(databasePath) }),
  secret: process.env.SESSION_SECRET || 'development-only-change-before-deploy-' + crypto.randomBytes(24).toString('hex'),
  resave: false, saveUninitialized: false, name: 'ocean.sid',
  cookie: { httpOnly: true, sameSite: 'lax', secure: production, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

function parseJson(value, fallback) { try { return JSON.parse(value || ''); } catch { return fallback; } }
function getUser(req) { return req.session.userId ? db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId) : null; }
function safeUser(row) {
  if (!row) return null;
  return { username: row.username, level: row.level, xp: row.xp, race: row.race, raceColor: races[row.race]?.color || '#ffffff', isAdmin: Boolean(row.is_admin), berries: row.berries, energy: Math.min(100, row.energy), maxEnergy: 100, learnedSkills: parseJson(row.learned_skills, []), skillMastery: parseJson(row.skill_mastery, {}) };
}
function requireAuth(req, res, next) { if (!getUser(req)) return res.status(401).json({ error: 'Please sign in first.' }); next(); }
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
function masteryFor(row) { return parseJson(row.skill_mastery, {}); }
function skillStats(skillId, mastery) {
  const base = skillDefaults[skillId];
  const rank = Math.min(10, Math.floor((mastery || 0) / 3));
  const cooldownMs = Math.max(2500, Math.round(base.cooldownMs * (1 - rank * 0.06)));
  if (skillId === 'dodge') return { rank, cooldownMs, energyCost: base.energyCost, durationMs: base.durationMs + rank * 100, distance: base.baseDistance + rank * 1.25 };
  if (skillId === 'haki') return { rank, cooldownMs, energyCost: base.energyCost, durationMs: base.durationMs + rank * 700, damageMultiplier: +(base.damageMultiplier + rank * 0.05).toFixed(2) };
  return { rank, cooldownMs, energyCost: base.energyCost, durationMs: base.durationMs, distance: base.baseDistance + rank * 1.5 };
}
function trainingData(row) {
  const learned = parseJson(row.learned_skills, []);
  const mastery = masteryFor(row);
  return { trainers: trainers.map(t => ({ ...t, learned: learned.includes(t.id), available: row.level >= t.minLevel, mastery: mastery[t.id] || 0, stats: skillStats(t.id, mastery[t.id] || 0) })), user: safeUser(row) };
}

app.post('/api/signup', authLimiter, async (req, res) => {
  const input = validCredentials(req.body || {});
  if (input.error) return res.status(400).json({ error: input.error });
  const hash = await bcrypt.hash(input.password, 12);
  try {
    const create = db.transaction(() => {
      const first = db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0;
      return db.prepare('INSERT INTO users (username,password_hash,race,is_admin) VALUES (?,?,?,?)').run(input.username, hash, raceNames[crypto.randomInt(raceNames.length)], first ? 1 : 0);
    });
    startSession(req, res, Number(create().lastInsertRowid), 201);
  } catch (error) {
    if (String(error.code).includes('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'That username is already taken.' });
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
  const row = getUser(req); let xp = row.xp + 10, level = row.level;
  while (xp >= level * 25 && level < 5000) { xp -= level * 25; level++; }
  db.prepare('UPDATE users SET level = ?, xp = ?, berries = berries + 100 WHERE id = ?').run(level, xp, row.id);
  res.json({ user: safeUser(getUser(req)) });
});

app.get('/api/trainers', requireAuth, (req, res) => res.json(trainingData(getUser(req))));
app.post('/api/trainers/learn', requireAuth, (req, res) => {
  const trainer = trainers.find(t => t.id === req.body?.skillId);
  if (!trainer) return res.status(404).json({ error: 'Trainer not found.' });
  const row = getUser(req), learned = parseJson(row.learned_skills, []);
  if (learned.includes(trainer.id)) return res.status(409).json({ error: 'You already learned this technique.' });
  if (row.level < trainer.minLevel) return res.status(403).json({ error: `Reach level ${trainer.minLevel} to train with ${trainer.teacher}.` });
  if (row.berries < trainer.cost) return res.status(400).json({ error: `Training costs ${trainer.cost.toLocaleString()} berries.` });
  learned.push(trainer.id);
  db.prepare('UPDATE users SET berries = berries - ?, learned_skills = ? WHERE id = ?').run(trainer.cost, JSON.stringify(learned), row.id);
  res.json({ ...trainingData(getUser(req)), message: `${trainer.name} learned! Practice the skill to gain mastery.` });
});
app.post('/api/skills/use', requireAuth, skillLimiter, (req, res) => {
  const id = req.body?.skillId;
  const trainer = trainers.find(t => t.id === id);
  if (!trainer) return res.status(404).json({ error: 'Unknown technique.' });
  const row = getUser(req), learned = parseJson(row.learned_skills, []);
  if (!learned.includes(id)) return res.status(403).json({ error: 'Find the trainer and learn this technique first.' });
  const mastery = masteryFor(row), current = mastery[id] || 0, stats = skillStats(id, current);
  const now = Date.now(), readyAt = req.session.skillReadyAt?.[id] || 0;
  if (!row.is_admin && now < readyAt) return res.status(429).json({ error: 'Technique is recharging.', remainingMs: readyAt - now });
  if (!row.is_admin && row.energy < stats.energyCost) return res.status(400).json({ error: 'Not enough energy.' });
  let direction = req.body?.direction;
  if (!direction || !Number.isFinite(direction.x) || !Number.isFinite(direction.z)) direction = { x: 0, z: -1 };
  const length = Math.hypot(direction.x, direction.z) || 1;
  direction = { x: direction.x / length, z: direction.z / length };
  if (!row.is_admin) {
    req.session.skillReadyAt ||= {};
    req.session.skillReadyAt[id] = now + stats.cooldownMs;
    mastery[id] = current + 1;
    const energy = Math.max(0, row.energy - stats.energyCost);
    db.prepare('UPDATE users SET energy = ?, skill_mastery = ? WHERE id = ?').run(energy, JSON.stringify(mastery), row.id);
  }
  const result = { skillId: id, mastery: mastery[id] || current, stats, energy: row.is_admin ? row.energy : Math.max(0, row.energy - stats.energyCost), maxEnergy: 100, admin: Boolean(row.is_admin), direction };
  res.json({ ...result, message: row.is_admin ? 'Admin training ability: no cooldown or energy cost.' : `${trainer.name} activated. Mastery ${result.mastery}/30 toward the next rank.` });
});
app.post('/api/logout', (req, res) => req.session.destroy(() => { res.clearCookie('ocean.sid', { httpOnly: true, sameSite: 'lax', secure: production }); res.json({ ok: true }); }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Ocean Fruit RPG running on http://localhost:${PORT}`));
