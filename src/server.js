const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { readDb, writeDb, createId } = require('./db');
const { calculatePoints, calculateClassificationPoints } = require('./scoring');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'quiniela-secret-dev',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12 }
  })
);

app.use(express.static(path.join(__dirname, '..', 'public')));

function sanitizeUser(user) {
  return { id: user.id, username: user.username };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
}

function findUserBySession(db, req) {
  return db.users.find((user) => user.id === req.session.userId);
}

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password || password.length < 4) {
    return res.status(400).json({ error: 'Usuario y contraseña (mínimo 4 caracteres) requeridos' });
  }

  const db = readDb();
  const normalized = String(username).trim().toLowerCase();

  const exists = db.users.some((user) => user.username.toLowerCase() === normalized);
  if (exists) {
    return res.status(409).json({ error: 'El usuario ya existe' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: createId(),
    username: String(username).trim(),
    passwordHash
  };

  db.users.push(newUser);
  writeDb(db);

  req.session.userId = newUser.id;
  return res.status(201).json({ user: sanitizeUser(newUser) });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const db = readDb();

  const user = db.users.find(
    (candidate) => candidate.username.toLowerCase() === String(username || '').trim().toLowerCase()
  );

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valid = await bcrypt.compare(String(password || ''), user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  req.session.userId = user.id;
  return res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  const db = readDb();
  const user = findUserBySession(db, req);

  if (!user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  return res.json({ user: sanitizeUser(user) });
});

app.get('/api/matches', requireAuth, (req, res) => {
  const db = readDb();
  const user = findUserBySession(db, req);

  if (!user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const response = db.matches.map((match) => {
    const prediction = db.predictions.find(
      (item) => item.userId === user.id && item.matchId === match.id
    );

    const kickoffDayStart = new Date(match.kickoff);
    kickoffDayStart.setHours(0, 0, 0, 0);
    // Solo calcular puntos si el partido tiene resultado Y equipos reales definidos
    const hasTeams = match.home && match.away;
    const pointsInfo = (match.result && hasTeams)
      ? calculatePoints(prediction, match.result)
      : { points: null, reason: 'Pendiente' };
    return {
      id: match.id,
      phase: match.phase || 'group',
      group: match.group || null,
      homeDesc: match.homeDesc || null,
      awayDesc: match.awayDesc || null,
      home: match.home,
      away: match.away,
      kickoff: match.kickoff,
      matchDayStart: kickoffDayStart.toISOString(),
      result: match.result,
      prediction: prediction
        ? { homeGoals: prediction.homeGoals, awayGoals: prediction.awayGoals }
        : null,
      points: pointsInfo.points,
      pointsReason: pointsInfo.reason
    };
  });

  return res.json({ matches: response });
});

app.post('/api/predictions/:matchId', requireAuth, (req, res) => {
  const { matchId } = req.params;
  const { homeGoals, awayGoals } = req.body || {};

  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
    return res.status(400).json({ error: 'Pronóstico inválido' });
  }

  const db = readDb();
  const user = findUserBySession(db, req);
  if (!user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const match = db.matches.find((item) => item.id === matchId);
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  if (!match.home || !match.away) {
    return res.status(400).json({ error: 'Los equipos de este partido aún no están definidos' });
  }

  const kickoffDay = new Date(match.kickoff);
  kickoffDay.setHours(0, 0, 0, 0);
  if (Date.now() >= kickoffDay.getTime()) {
    return res.status(400).json({ error: 'El día del partido ya comenzó, no se puede editar el pronóstico' });
  }

  const existing = db.predictions.find(
    (item) => item.userId === user.id && item.matchId === matchId
  );

  if (existing) {
    existing.homeGoals = homeGoals;
    existing.awayGoals = awayGoals;
  } else {
    db.predictions.push({
      id: createId(),
      userId: user.id,
      matchId,
      homeGoals,
      awayGoals
    });
  }

  writeDb(db);
  return res.json({ ok: true });
});

app.get('/api/leaderboard', requireAuth, (req, res) => {
  const db = readDb();

  const table = db.users
    .map((user) => {
      let matchPoints = 0;
      let exactScores = 0;

      db.matches.forEach((match) => {
        if (!match.result || !match.home || !match.away) return;

        const prediction = db.predictions.find(
          (item) => item.userId === user.id && item.matchId === match.id
        );
        const pointsInfo = calculatePoints(prediction, match.result);
        matchPoints += pointsInfo.points;
        if (pointsInfo.reason === 'Marcador exacto') exactScores += 1;
      });

      const userClassPreds = (db.classificationPredictions || []).filter((p) => p.userId === user.id);
      const { total: classPoints, breakdown } = calculateClassificationPoints(userClassPreds, db.advancement || {});

      return {
        userId: user.id,
        username: user.username,
        totalPoints: matchPoints + classPoints,
        matchPoints,
        classPoints,
        exactScores,
        classBreakdown: breakdown
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.exactScores - a.exactScores || a.username.localeCompare(b.username));

  return res.json({ leaderboard: table });
});
app.post('/api/admin/matches/:matchId/result', (req, res) => {
  const adminSecret = process.env.ADMIN_SECRET || 'admin-demo';
  const providedSecret = req.headers['x-admin-secret'];

  if (providedSecret !== adminSecret) {
    return res.status(403).json({ error: 'No autorizado para cargar resultados' });
  }

  const { matchId } = req.params;
  const { homeGoals, awayGoals } = req.body || {};

  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
    return res.status(400).json({ error: 'Resultado inválido' });
  }

  const db = readDb();
  const match = db.matches.find((item) => item.id === matchId);

  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  match.result = { homeGoals, awayGoals };
  writeDb(db);

  return res.json({ ok: true, match });
});

// ── Admin: asignar equipos a partido de fase final ──────────────────────────
app.post('/api/admin/matches/:matchId/teams', (req, res) => {
  const adminSecret = process.env.ADMIN_SECRET || 'admin-demo';
  if (req.headers['x-admin-secret'] !== adminSecret) return res.status(403).json({ error: 'No autorizado' });

  const { matchId } = req.params;
  const { home, away } = req.body || {};
  const db = readDb();
  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  if (home) match.home = home;
  if (away) match.away = away;
  writeDb(db);
  return res.json({ ok: true, match });
});

// ── Admin: registrar equipos clasificados a una fase ─────────────────────────
app.post('/api/admin/advancement/:round', (req, res) => {
  const adminSecret = process.env.ADMIN_SECRET || 'admin-demo';
  if (req.headers['x-admin-secret'] !== adminSecret) return res.status(403).json({ error: 'No autorizado' });

  const { round } = req.params;
  const validRounds = ['r32', 'r16', 'qf', 'sf', 'final', 'champion'];
  if (!validRounds.includes(round)) return res.status(400).json({ error: 'Ronda inválida' });

  const { teams, team, lock } = req.body || {};
  const db = readDb();
  if (!db.advancement) db.advancement = {};

  if (round === 'champion') {
    if (!db.advancement.champion) db.advancement.champion = { team: null, locked: false };
    if (team !== undefined) db.advancement.champion.team = team;
    if (lock === true) db.advancement.champion.locked = true;
  } else {
    if (!db.advancement[round]) db.advancement[round] = { teams: [], locked: false };
    if (Array.isArray(teams)) db.advancement[round].teams = teams;
    if (lock === true) db.advancement[round].locked = true;
  }

  writeDb(db);
  return res.json({ ok: true, advancement: db.advancement[round] });
});

// ── Usuario: obtener/guardar pronóstico de clasificación ─────────────────────
app.get('/api/classification', requireAuth, (req, res) => {
  const db = readDb();
  const user = findUserBySession(db, req);
  if (!user) return res.status(401).json({ error: 'No autenticado' });

  const userPreds = (db.classificationPredictions || []).filter((p) => p.userId === user.id);
  return res.json({ advancement: db.advancement || {}, predictions: userPreds });
});

app.post('/api/classification/:round', requireAuth, (req, res) => {
  const { round } = req.params;
  const { teams } = req.body || {};
  const validRounds = ['r32', 'r16', 'qf', 'sf', 'final', 'champion'];
  if (!validRounds.includes(round)) return res.status(400).json({ error: 'Ronda inválida' });
  if (!Array.isArray(teams)) return res.status(400).json({ error: 'teams debe ser un array' });

  const db = readDb();
  const user = findUserBySession(db, req);
  if (!user) return res.status(401).json({ error: 'No autenticado' });

  const adv = (db.advancement || {})[round];
  if (adv && adv.locked) return res.status(400).json({ error: 'Esta ronda ya está cerrada para edición' });

  if (!db.classificationPredictions) db.classificationPredictions = [];
  const existing = db.classificationPredictions.find((p) => p.userId === user.id && p.round === round);
  if (existing) {
    existing.teams = teams;
  } else {
    db.classificationPredictions.push({ id: createId(), userId: user.id, round, teams });
  }

  writeDb(db);
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Quiniela Mundial escuchando en http://localhost:${PORT}`);
});
