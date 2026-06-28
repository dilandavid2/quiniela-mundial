const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { initDb, readDb, writeDb, createId, PRELOADED_USERNAMES } = require('./db');
const { calculatePoints, calculateClassificationPoints, isKnockoutPhase } = require('./scoring');

const app = express();
const PORT = process.env.PORT || 3000;
const PREDICTION_LOCKOUT_MINUTES = 5;
const ADMIN_USERNAME_NO_SECRET = 'joseagdiaz';

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
  return {
    id: user.id,
    username: user.username,
    country: user.country || '',
    avatar: user.avatar || null
  };
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

function isAdminAuthorized(req, db) {
  const providedSecret = String(req.headers['x-admin-secret'] || '').trim();
  const envAdminSecret = process.env.ADMIN_SECRET || 'admin-demo';

  if (providedSecret && (providedSecret === envAdminSecret || providedSecret === 'diaz-admin')) {
    return true;
  }

  const sessionUser = findUserBySession(db, req);
  const normalizedUsername = String(sessionUser?.username || '').trim().toLowerCase();
  return normalizedUsername === ADMIN_USERNAME_NO_SECRET;
}

function extractMatchNumber(matchId) {
  const num = Number(String(matchId || '').replace(/[^0-9]/g, ''));
  return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
}

function buildGroupStandings(db) {
  const table = {};

  db.matches
    .filter((m) => (m.phase || 'group') === 'group' && m.group)
    .forEach((m) => {
      if (!table[m.group]) table[m.group] = {};
      [m.home, m.away].forEach((team) => {
        if (!team) return;
        if (!table[m.group][team]) {
          table[m.group][team] = { team, group: m.group, pts: 0, gf: 0, gc: 0, pj: 0 };
        }
      });

      if (!m.result || !m.home || !m.away) return;

      const home = table[m.group][m.home];
      const away = table[m.group][m.away];
      const hg = Number(m.result.homeGoals);
      const ag = Number(m.result.awayGoals);

      home.pj += 1;
      away.pj += 1;
      home.gf += hg;
      home.gc += ag;
      away.gf += ag;
      away.gc += hg;

      if (hg > ag) home.pts += 3;
      else if (ag > hg) away.pts += 3;
      else {
        home.pts += 1;
        away.pts += 1;
      }
    });

  const rankingByGroup = {};
  Object.entries(table).forEach(([group, teams]) => {
    rankingByGroup[group] = Object.values(teams).sort((a, b) => {
      const dgA = a.gf - a.gc;
      const dgB = b.gf - b.gc;
      return b.pts - a.pts || dgB - dgA || b.gf - a.gf || a.team.localeCompare(b.team);
    });
  });

  return rankingByGroup;
}

function getWinnerFromMatch(match) {
  if (!match || !match.result || !match.home || !match.away) return null;
  const hg = Number(match.result.homeGoals);
  const ag = Number(match.result.awayGoals);
  if (hg === ag) return null;
  return hg > ag ? match.home : match.away;
}

function getLoserFromMatch(match) {
  if (!match || !match.result || !match.home || !match.away) return null;
  const hg = Number(match.result.homeGoals);
  const ag = Number(match.result.awayGoals);
  if (hg === ag) return null;
  return hg > ag ? match.away : match.home;
}

function resolveKnockoutTeams(db) {
  const rankingByGroup = buildGroupStandings(db);
  const firstByGroup = {};
  const secondByGroup = {};
  const thirdByGroup = {};

  Object.entries(rankingByGroup).forEach(([group, ranking]) => {
    if (ranking[0]) firstByGroup[group] = ranking[0].team;
    if (ranking[1]) secondByGroup[group] = ranking[1].team;
    if (ranking[2]) thirdByGroup[group] = ranking[2];
  });

  const bestThirds = Object.values(thirdByGroup).sort((a, b) => {
    const dgA = a.gf - a.gc;
    const dgB = b.gf - b.gc;
    return b.pts - a.pts || dgB - dgA || b.gf - a.gf || a.group.localeCompare(b.group);
  });

  const usedThirdGroups = new Set();
  const byId = new Map(db.matches.map((m) => [String(m.id).toUpperCase(), m]));

  function resolveSlot(desc) {
    const label = String(desc || '').trim();
    if (!label) return null;

    const rankMatch = label.match(/^([123])°\s+Grupo\s+([A-L])$/i);
    if (rankMatch) {
      const pos = rankMatch[1];
      const group = rankMatch[2].toUpperCase();
      if (pos === '1') return firstByGroup[group] || null;
      if (pos === '2') return secondByGroup[group] || null;
      return (thirdByGroup[group] && thirdByGroup[group].team) || null;
    }

    const thirdMask = label.match(/^3°\s+([A-L](?:\/[A-L])*)$/i);
    if (thirdMask) {
      const allowed = new Set(thirdMask[1].toUpperCase().split('/').map((g) => g.trim()));
      const pick = bestThirds.find((t) => allowed.has(t.group) && !usedThirdGroups.has(t.group));
      if (!pick) return null;
      usedThirdGroups.add(pick.group);
      return pick.team;
    }

    const winnerRef = label.match(/^Gan\.\s*(P\d+)$/i);
    if (winnerRef) {
      const ref = byId.get(winnerRef[1].toUpperCase());
      return getWinnerFromMatch(ref);
    }

    const loserRef = label.match(/^Per\.\s*(P\d+)$/i);
    if (loserRef) {
      const ref = byId.get(loserRef[1].toUpperCase());
      return getLoserFromMatch(ref);
    }

    return null;
  }

  let changed = false;

  const knockoutMatches = db.matches
    .filter((m) => (m.phase || 'group') !== 'group')
    .sort((a, b) => extractMatchNumber(a.id) - extractMatchNumber(b.id));

  knockoutMatches.forEach((match) => {
    const resolvedHome = resolveSlot(match.homeDesc);
    const resolvedAway = resolveSlot(match.awayDesc);

    if (!match.home && resolvedHome) {
      match.home = resolvedHome;
      changed = true;
    }

    if (!match.away && resolvedAway) {
      match.away = resolvedAway;
      changed = true;
    }
  });

  return changed;
}

app.post('/api/auth/register', async (req, res) => {
  const { username, password, country } = req.body || {};
  const normalized = String(username || '').trim().toLowerCase();
  const selectedCountry = String(country || '').trim();
  const plainPassword = String(password || '');

  if (!normalized || !plainPassword || plainPassword.length < 4 || !selectedCountry) {
    return res.status(400).json({ error: 'Debes elegir un usuario, una contraseña y un país de preferencia' });
  }

  if (!PRELOADED_USERNAMES.includes(normalized)) {
    return res.status(400).json({ error: 'Debes seleccionar uno de los usuarios pre cargados' });
  }

  const db = readDb();
  const existing = db.users.find((user) => String(user.username || '').trim().toLowerCase() === normalized);

  if (existing && (existing.passwordHash || existing.password)) {
    return res.status(409).json({ error: 'Ese usuario ya fue registrado' });
  }

  const storedUser = existing || {
    id: createId(),
    username: String(username || '').trim(),
    preloaded: true
  };

  delete storedUser.passwordHash;
  storedUser.password = plainPassword;
  storedUser.country = selectedCountry;
  storedUser.preloaded = true;

  if (!existing) {
    db.users.push(storedUser);
  }
  writeDb(db);

  req.session.userId = storedUser.id;
  return res.status(existing ? 200 : 201).json({ user: sanitizeUser(storedUser) });
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

  const plainPassword = String(password || '');
  const valid = user.passwordHash
    ? await bcrypt.compare(plainPassword, user.passwordHash)
    : String(user.password || '') === plainPassword;

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
  const resolved = resolveKnockoutTeams(db);
  if (resolved) writeDb(db);
  const user = findUserBySession(db, req);

  if (!user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const response = db.matches.map((match) => {
    const prediction = db.predictions.find(
      (item) => item.userId === user.id && item.matchId === match.id
    );

    // lockoutAt = 5 minutos antes del kickoff (UTC puro, funciona igual en todos los países)
    const lockoutAt = new Date(
      new Date(match.kickoff).getTime() - PREDICTION_LOCKOUT_MINUTES * 60 * 1000
    ).toISOString();
    // Solo calcular puntos si el partido tiene resultado Y equipos reales definidos
    const hasTeams = match.home && match.away;
    const pointsInfo = (match.result && hasTeams && !isMatchExcludedFromScoring(match))
      ? calculatePoints(prediction, match.result, match)
      : { points: null, reason: isMatchExcludedFromScoring(match) ? 'Sin puntaje' : 'Pendiente' };
    return {
      id: match.id,
      phase: match.phase || 'group',
      group: match.group || null,
      homeDesc: match.homeDesc || null,
      awayDesc: match.awayDesc || null,
      home: match.home,
      away: match.away,
      kickoff: match.kickoff,
      lockoutAt,
      result: match.result,
      locked: Boolean(match.locked),
      prediction: prediction
        ? { homeGoals: prediction.homeGoals, awayGoals: prediction.awayGoals, winner: prediction.winner || null }
        : null,
      points: pointsInfo.points,
      pointsReason: pointsInfo.reason
    };
  });

  return res.json({ matches: response });
});

app.post('/api/predictions/:matchId', requireAuth, (req, res) => {
  const { matchId } = req.params;
  const { homeGoals, awayGoals, winner } = req.body || {};

  if (
    !Number.isInteger(homeGoals) ||
    !Number.isInteger(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0 ||
    homeGoals > 10 ||
    awayGoals > 10
  ) {
    return res.status(400).json({ error: 'El pronóstico debe tener goles entre 0 y 10' });
  }

  const db = readDb();
  const resolved = resolveKnockoutTeams(db);
  if (resolved) writeDb(db);
  const user = findUserBySession(db, req);
  if (!user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const match = db.matches.find((item) => item.id === matchId);
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  const knockout = isKnockoutPhase(match.phase);

  if (knockout && homeGoals === awayGoals && !['home', 'away'].includes(winner)) {
    return res.status(400).json({ error: 'En eliminatorias debes elegir quién clasifica si el marcador es empate' });
  }

  if (match.locked === true) {
    return res.status(400).json({ error: 'Los pronósticos de este partido están bloqueados por el administrador' });
  }

  if (!match.home || !match.away) {
    return res.status(400).json({ error: 'Los equipos de este partido aún no están definidos' });
  }

  // Bloquear 5 minutos antes del kickoff (UTC)
  const lockoutAt = new Date(match.kickoff).getTime() - PREDICTION_LOCKOUT_MINUTES * 60 * 1000;

  if (match.locked !== false && Date.now() >= lockoutAt) {
    return res.status(400).json({
      error: `El cierre de pronósticos es ${PREDICTION_LOCKOUT_MINUTES} minutos antes del partido`
    });
  }

  const existing = db.predictions.find(
    (item) => item.userId === user.id && item.matchId === matchId
  );

  if (existing) {
    existing.homeGoals = homeGoals;
    existing.awayGoals = awayGoals;
    existing.winner = knockout && homeGoals === awayGoals ? winner : null;
  } else {
    db.predictions.push({
      id: createId(),
      userId: user.id,
      matchId,
      homeGoals,
      awayGoals,
      winner: knockout && homeGoals === awayGoals ? winner : null
    });
  }

  writeDb(db);
  return res.json({ ok: true });
});

// ── Ver pronósticos de todos en un partido ───────────────────────────────────────
app.get('/api/matches/:matchId/predictions', requireAuth, (req, res) => {
  const { matchId } = req.params;
  const db = readDb();
  const resolved = resolveKnockoutTeams(db);
  if (resolved) writeDb(db);
  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  if (!match.locked && !match.result) {
    return res.status(403).json({ error: 'Solo visible cuando el partido está bloqueado o tiene resultado' });
  }
  const registeredUsers = db.users.filter((u) => u.password || u.passwordHash);
  const rows = registeredUsers.map((u) => {
    const pred = db.predictions.find((p) => p.userId === u.id && p.matchId === matchId);
    const pointsInfo = (match.result && pred) ? calculatePoints(pred, match.result, match) : null;
    return {
      username: u.username,
      avatar: u.avatar || null,
      homeGoals: pred !== undefined ? pred.homeGoals : null,
      awayGoals: pred !== undefined ? pred.awayGoals : null,
      points: pointsInfo ? pointsInfo.points : null,
      reason: pointsInfo ? pointsInfo.reason : null
    };
  }).sort((a, b) => (b.points ?? -1) - (a.points ?? -1));
  return res.json({ match: { home: match.home, away: match.away, result: match.result }, rows });
});

app.get('/api/leaderboard', requireAuth, (req, res) => {
  const db = readDb();

  const table = db.users
    .filter((user) => {
      const tienePassword = Boolean(user.passwordHash || user.password);
      return tienePassword;
    })
    .map((user) => {
      let matchPoints = 0;
      let exactScores = 0;

      db.matches.forEach((match) => {
        if (!match.result || !match.home || !match.away) return;
        if (isMatchExcludedFromScoring(match)) return;

        const prediction = db.predictions.find(
          (item) => item.userId === user.id && item.matchId === match.id
        );
        const pointsInfo = calculatePoints(prediction, match.result, match);
        matchPoints += pointsInfo.points;
        if (pointsInfo.reason === 'Marcador exacto') exactScores += 1;
      });

      const userClassPreds = (db.classificationPredictions || []).filter((p) => p.userId === user.id);
      const { total: classPoints, breakdown } = calculateClassificationPoints(userClassPreds, db.advancement || {});

      return {
        userId: user.id,
        username: user.username,
        avatar: user.avatar || null,
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
  const db = readDb();
  const resolved = resolveKnockoutTeams(db);
  if (resolved) writeDb(db);
  if (!isAdminAuthorized(req, db)) {
    return res.status(403).json({ error: 'No autorizado para cargar resultados' });
  }

  const { matchId } = req.params;
  const homeGoals = Number(req.body?.homeGoals);
  const awayGoals = Number(req.body?.awayGoals);
  const winner = req.body?.winner;

  if (
    !Number.isInteger(homeGoals) ||
    !Number.isInteger(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0 ||
    homeGoals > 10 ||
    awayGoals > 10
  ) {
    return res.status(400).json({ error: 'Resultado inválido' });
  }

  const match = db.matches.find((item) => item.id === matchId);

  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  const knockout = isKnockoutPhase(match.phase);

  if (knockout && homeGoals === awayGoals && !['home', 'away'].includes(winner)) {
    return res.status(400).json({ error: 'En eliminatorias debes indicar quién clasificó si el resultado fue empate' });
  }

  match.result = {
    homeGoals,
    awayGoals,
    winner: knockout && homeGoals === awayGoals ? winner : null
  };
  writeDb(db);

  return res.json({ ok: true, match });
});

app.patch('/api/admin/matches/:matchId/lock', (req, res) => {
  const db = readDb();
  if (!isAdminAuthorized(req, db)) {
    return res.status(403).json({ error: 'No autorizado para bloquear partidos' });
  }

  const { matchId } = req.params;
  const match = db.matches.find((item) => item.id === matchId);

  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  match.locked = match.locked === true ? false : true;
  writeDb(db);

  return res.json({ ok: true, match });
});

app.patch('/api/admin/matches/:matchId/kickoff', (req, res) => {
  const db = readDb();

  if (!isAdminAuthorized(req, db)) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const { matchId } = req.params;
  const { kickoff } = req.body || {};

  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  const date = new Date(kickoff);
  if (Number.isNaN(date.getTime())) {
    return res.status(400).json({ error: 'Fecha u hora inválida' });
  }

  match.kickoff = date.toISOString();

  writeDb(db);
  return res.json({ ok: true, kickoff: match.kickoff });
});
// ── Admin: asignar equipos a partido de fase final ──────────────────────────
app.post('/api/admin/matches/:matchId/teams', (req, res) => {
  const db = readDb();
  if (!isAdminAuthorized(req, db)) return res.status(403).json({ error: 'No autorizado' });

  const { matchId } = req.params;
  const { home, away } = req.body || {};
  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

  if (home) match.home = home;
  if (away) match.away = away;
  writeDb(db);
  return res.json({ ok: true, match });
});

// ── Admin: registrar equipos clasificados a una fase ─────────────────────────
app.post('/api/admin/advancement/:round', (req, res) => {
  const db = readDb();
  if (!isAdminAuthorized(req, db)) return res.status(403).json({ error: 'No autorizado' });

  const { round } = req.params;
  const validRounds = ['r32', 'r16', 'qf', 'sf', 'final', 'champion'];
  if (!validRounds.includes(round)) return res.status(400).json({ error: 'Ronda inválida' });

  const { teams, team, lock } = req.body || {};
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

  const limits = {
    r32: 32,
    r16: 16,
    qf: 8,
    sf: 4,
    final: 2,
    champion: 1
  };

  if (teams.length !== limits[round]) {
    return res.status(400).json({ error: `Debes seleccionar exactamente ${limits[round]} equipo(s)` });
  }

  const uniqueTeams = new Set(teams);
  if (uniqueTeams.size !== teams.length) {
    return res.status(400).json({ error: 'No puedes repetir equipos en la clasificación' });
  }

  if (round === 'r32') {
    const groups = {
      A:['México','Sudáfrica','Corea del Sur','República Checa'],
      B:['Canadá','Bosnia y Herzegovina','Catar','Suiza'],
      C:['Brasil','Marruecos','Haití','Escocia'],
      D:['Estados Unidos','Paraguay','Australia','Turquía'],
      E:['Alemania','Curazao','Costa de Marfil','Ecuador'],
      F:['Países Bajos','Japón','Suecia','Túnez'],
      G:['Bélgica','Egipto','Irán','Nueva Zelanda'],
      H:['España','Cabo Verde','Arabia Saudí','Uruguay'],
      I:['Francia','Senegal','Irak','Noruega'],
      J:['Argentina','Argelia','Austria','Jordania'],
      K:['Portugal','RD Congo','Uzbekistán','Colombia'],
      L:['Inglaterra','Croacia','Ghana','Panamá']
    };

    let thirdPlaces = 0;

    for (const [group, groupTeams] of Object.entries(groups)) {
      const count = teams.filter((team) => groupTeams.includes(team)).length;

      if (count < 2) {
        return res.status(400).json({ error: `Debes seleccionar mínimo 2 equipos del Grupo ${group}` });
      }

      if (count > 3) {
        return res.status(400).json({ error: `No puedes seleccionar más de 3 equipos del Grupo ${group}` });
      }

      if (count === 3) thirdPlaces++;
    }

    if (thirdPlaces !== 8) {
      return res.status(400).json({ error: 'Debes seleccionar exactamente 8 mejores terceros' });
    }
  }

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

// ── Admin: listar todos los usuarios registrados ─────────────────────────────
app.get('/api/admin/users', (req, res) => {
  const db = readDb();
  if (!isAdminAuthorized(req, db)) {
    return res.status(403).json({ error: 'Clave admin incorrecta' });
  }
  const users = db.users
    .filter((u) => u.password || u.passwordHash)
    .map((u) => ({
      id: u.id,
      username: u.username,
      country: u.country || '',
      avatar: u.avatar || null
    }));
  return res.json({ users });
});

// ── Admin: editar usuario ────────────────────────────────────────────────────
app.patch('/api/admin/users/:userId', (req, res) => {
  const db = readDb();
  if (!isAdminAuthorized(req, db)) {
    return res.status(403).json({ error: 'Clave admin incorrecta' });
  }
  const { userId } = req.params;
  const { username, password, country, avatar } = req.body || {};
  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (username && String(username).trim()) {
    user.username = String(username).trim();
  }
  if (password && String(password).trim().length >= 4) {
    delete user.passwordHash;
    user.password = String(password).trim();
  }
  if (country !== undefined) user.country = String(country).trim();
  if (avatar !== undefined) user.avatar = avatar; // base64 string o null

  writeDb(db);
  return res.json({ ok: true, user: { id: user.id, username: user.username, country: user.country, avatar: user.avatar || null } });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Quiniela Mundial escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error iniciando la base de datos:', error);
    process.exit(1);
  });
