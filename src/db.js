const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config();
const { Pool } = require('pg');

const USE_POSTGRES = !!process.env.DATABASE_URL;

const pool = USE_POSTGRES
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
    })
  : null;

let dbCache = null;

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const PRELOADED_USERNAMES = [
  'abraham',
  'ricardo',
  'luisalejandro',
  'cindy',
  'carmen',
  'carito',
  'amparo',
  'luisenrique',
  'dalhyn',
  'orlando',
  'german',
  'leandro',
  'juanpablo',
  'emily',
  'andreina',
  'luislugo',
  'luismanuel',
  'mariavirginia',
  'mayibe',
  'milagros',
  'atilio',
  'stella',
  'edward',
  'wendy',
  'yovanna',
  'guillermo',
  'sebastian',
  'neida',
  'elizabeth',
  'gaby',
  'gloria',
  'marcela',
  'erly',
  'esperanza',
  'leandrodavid',
  'oscar'
];

function createPreloadedUser(username) {
  return {
    id: crypto.randomUUID(),
    username,
    password: '',
    country: '',
    preloaded: true
  };
}

const defaultData = {
  users: PRELOADED_USERNAMES.map(createPreloadedUser),
  matches: [
    // ── JORNADA 1 ──────────────────────────────────────────────────────────────
    // Jueves 11 de junio (Inaugural)
    { id: 'm01', group: 'A', home: 'México',          away: 'Sudáfrica',          kickoff: '2026-06-11T19:00:00Z', result: null },
    { id: 'm02', group: 'A', home: 'Corea del Sur',   away: 'República Checa',    kickoff: '2026-06-12T02:00:00Z', result: null },
    // Viernes 12 de junio
    { id: 'm03', group: 'B', home: 'Canadá',          away: 'Bosnia y Herzegovina', kickoff: '2026-06-12T19:00:00Z', result: null },
    { id: 'm04', group: 'D', home: 'Estados Unidos',  away: 'Paraguay',           kickoff: '2026-06-13T01:00:00Z', result: null },
    // Sábado 13 de junio
    { id: 'm05', group: 'B', home: 'Catar',           away: 'Suiza',              kickoff: '2026-06-13T19:00:00Z', result: null },
    { id: 'm06', group: 'C', home: 'Brasil',          away: 'Marruecos',          kickoff: '2026-06-13T22:00:00Z', result: null },
    { id: 'm07', group: 'C', home: 'Haití',           away: 'Escocia',            kickoff: '2026-06-14T01:00:00Z', result: null },
    { id: 'm08', group: 'D', home: 'Australia',       away: 'Turquía',            kickoff: '2026-06-14T04:00:00Z', result: null },
    // Domingo 14 de junio
    { id: 'm09', group: 'E', home: 'Alemania',        away: 'Curazao',            kickoff: '2026-06-14T17:00:00Z', result: null },
    { id: 'm10', group: 'F', home: 'Países Bajos',    away: 'Japón',              kickoff: '2026-06-14T20:00:00Z', result: null },
    { id: 'm11', group: 'E', home: 'Costa de Marfil', away: 'Ecuador',            kickoff: '2026-06-14T23:00:00Z', result: null },
    { id: 'm12', group: 'F', home: 'Suecia',          away: 'Túnez',              kickoff: '2026-06-15T02:00:00Z', result: null },
    // Lunes 15 de junio
    { id: 'm13', group: 'H', home: 'España',          away: 'Cabo Verde',         kickoff: '2026-06-15T16:00:00Z', result: null },
    { id: 'm14', group: 'G', home: 'Bélgica',         away: 'Egipto',             kickoff: '2026-06-15T19:00:00Z', result: null },
    { id: 'm15', group: 'H', home: 'Arabia Saudí',    away: 'Uruguay',            kickoff: '2026-06-15T22:00:00Z', result: null },
    { id: 'm16', group: 'G', home: 'Irán',            away: 'Nueva Zelanda',      kickoff: '2026-06-16T01:00:00Z', result: null },
    // Martes 16 de junio
    { id: 'm17', group: 'I', home: 'Francia',         away: 'Senegal',            kickoff: '2026-06-16T19:00:00Z', result: null },
    { id: 'm18', group: 'I', home: 'Irak',            away: 'Noruega',            kickoff: '2026-06-16T22:00:00Z', result: null },
    { id: 'm19', group: 'J', home: 'Argentina',       away: 'Argelia',            kickoff: '2026-06-17T01:00:00Z', result: null },
    { id: 'm20', group: 'J', home: 'Austria',         away: 'Jordania',           kickoff: '2026-06-17T04:00:00Z', result: null },
    // Miércoles 17 de junio
    { id: 'm21', group: 'K', home: 'Portugal',        away: 'RD Congo',           kickoff: '2026-06-17T17:00:00Z', result: null },
    { id: 'm22', group: 'L', home: 'Inglaterra',      away: 'Croacia',            kickoff: '2026-06-17T20:00:00Z', result: null },
    { id: 'm23', group: 'L', home: 'Ghana',           away: 'Panamá',             kickoff: '2026-06-17T23:00:00Z', result: null },
    { id: 'm24', group: 'K', home: 'Uzbekistán',      away: 'Colombia',           kickoff: '2026-06-18T02:00:00Z', result: null },

    // ── JORNADA 2 ──────────────────────────────────────────────────────────────
    // Jueves 18 de junio
    { id: 'm25', group: 'A', home: 'República Checa', away: 'Sudáfrica',          kickoff: '2026-06-18T16:00:00Z', result: null },
    { id: 'm26', group: 'B', home: 'Suiza',           away: 'Bosnia y Herzegovina', kickoff: '2026-06-18T19:00:00Z', result: null },
    { id: 'm27', group: 'B', home: 'Canadá',          away: 'Catar',              kickoff: '2026-06-18T22:00:00Z', result: null },
    { id: 'm28', group: 'A', home: 'México',          away: 'Corea del Sur',      kickoff: '2026-06-19T01:00:00Z', result: null },
    // Viernes 19 de junio
    { id: 'm29', group: 'D', home: 'Estados Unidos',  away: 'Australia',          kickoff: '2026-06-19T19:00:00Z', result: null },
    { id: 'm30', group: 'C', home: 'Escocia',         away: 'Marruecos',          kickoff: '2026-06-19T22:00:00Z', result: null },
    { id: 'm31', group: 'C', home: 'Brasil',          away: 'Haití',              kickoff: '2026-06-20T00:30:00Z', result: null },
    { id: 'm32', group: 'D', home: 'Turquía',         away: 'Paraguay',           kickoff: '2026-06-20T03:00:00Z', result: null },
    // Sábado 20 de junio
    { id: 'm33', group: 'F', home: 'Países Bajos',    away: 'Suecia',             kickoff: '2026-06-20T17:00:00Z', result: null },
    { id: 'm34', group: 'E', home: 'Alemania',        away: 'Costa de Marfil',    kickoff: '2026-06-20T20:00:00Z', result: null },
    { id: 'm35', group: 'E', home: 'Ecuador',         away: 'Curazao',            kickoff: '2026-06-21T00:00:00Z', result: null },
    { id: 'm36', group: 'F', home: 'Túnez',           away: 'Japón',              kickoff: '2026-06-21T04:00:00Z', result: null },
    // Domingo 21 de junio
    { id: 'm37', group: 'H', home: 'España',          away: 'Arabia Saudí',       kickoff: '2026-06-21T16:00:00Z', result: null },
    { id: 'm38', group: 'G', home: 'Bélgica',         away: 'Irán',               kickoff: '2026-06-21T19:00:00Z', result: null },
    { id: 'm39', group: 'H', home: 'Uruguay',         away: 'Cabo Verde',         kickoff: '2026-06-21T22:00:00Z', result: null },
    { id: 'm40', group: 'G', home: 'Nueva Zelanda',   away: 'Egipto',             kickoff: '2026-06-22T01:00:00Z', result: null },
    // Lunes 22 de junio
    { id: 'm41', group: 'J', home: 'Argentina',       away: 'Austria',            kickoff: '2026-06-22T17:00:00Z', result: null },
    { id: 'm42', group: 'I', home: 'Francia',         away: 'Irak',               kickoff: '2026-06-22T21:00:00Z', result: null },
    { id: 'm43', group: 'I', home: 'Noruega',         away: 'Senegal',            kickoff: '2026-06-23T00:00:00Z', result: null },
    { id: 'm44', group: 'J', home: 'Jordania',        away: 'Argelia',            kickoff: '2026-06-23T03:00:00Z', result: null },
    // Martes 23 de junio
    { id: 'm45', group: 'K', home: 'Portugal',        away: 'Uzbekistán',         kickoff: '2026-06-23T17:00:00Z', result: null },
    { id: 'm46', group: 'L', home: 'Inglaterra',      away: 'Ghana',              kickoff: '2026-06-23T20:00:00Z', result: null },
    { id: 'm47', group: 'L', home: 'Panamá',          away: 'Croacia',            kickoff: '2026-06-23T23:00:00Z', result: null },
    { id: 'm48', group: 'K', home: 'Colombia',        away: 'RD Congo',           kickoff: '2026-06-24T02:00:00Z', result: null },

    // ── JORNADA 3 (simultáneos por grupo) ─────────────────────────────────────
    // Miércoles 24 de junio
    { id: 'm49', group: 'B', home: 'Bosnia y Herzegovina', away: 'Catar',         kickoff: '2026-06-24T17:00:00Z', result: null },
    { id: 'm50', group: 'B', home: 'Suiza',           away: 'Canadá',             kickoff: '2026-06-24T17:00:00Z', result: null },
    { id: 'm51', group: 'C', home: 'Escocia',         away: 'Brasil',             kickoff: '2026-06-24T22:00:00Z', result: null },
    { id: 'm52', group: 'C', home: 'Marruecos',       away: 'Haití',              kickoff: '2026-06-24T22:00:00Z', result: null },
    { id: 'm53', group: 'A', home: 'Sudáfrica',       away: 'Corea del Sur',      kickoff: '2026-06-25T01:00:00Z', result: null },
    { id: 'm54', group: 'A', home: 'República Checa', away: 'México',             kickoff: '2026-06-25T01:00:00Z', result: null },
    // Jueves 25 de junio
    { id: 'm55', group: 'E', home: 'Ecuador',         away: 'Alemania',           kickoff: '2026-06-25T20:00:00Z', result: null },
    { id: 'm56', group: 'E', home: 'Curazao',         away: 'Costa de Marfil',    kickoff: '2026-06-25T20:00:00Z', result: null },
    { id: 'm57', group: 'F', home: 'Japón',           away: 'Suecia',             kickoff: '2026-06-25T23:00:00Z', result: null },
    { id: 'm58', group: 'F', home: 'Túnez',           away: 'Países Bajos',       kickoff: '2026-06-25T23:00:00Z', result: null },
    { id: 'm59', group: 'D', home: 'Turquía',         away: 'Estados Unidos',     kickoff: '2026-06-26T02:00:00Z', result: null },
    { id: 'm60', group: 'D', home: 'Paraguay',        away: 'Australia',          kickoff: '2026-06-26T02:00:00Z', result: null },
    // Viernes 26 de junio
    { id: 'm61', group: 'I', home: 'Senegal',         away: 'Irak',               kickoff: '2026-06-26T19:00:00Z', result: null },
    { id: 'm62', group: 'I', home: 'Noruega',         away: 'Francia',            kickoff: '2026-06-26T19:00:00Z', result: null },
    { id: 'm63', group: 'H', home: 'Uruguay',         away: 'España',             kickoff: '2026-06-27T00:00:00Z', result: null },
    { id: 'm64', group: 'H', home: 'Cabo Verde',      away: 'Arabia Saudí',       kickoff: '2026-06-27T00:00:00Z', result: null },
    { id: 'm65', group: 'G', home: 'Nueva Zelanda',   away: 'Bélgica',            kickoff: '2026-06-27T03:00:00Z', result: null },
    { id: 'm66', group: 'G', home: 'Egipto',          away: 'Irán',               kickoff: '2026-06-27T03:00:00Z', result: null },
    // Sábado 27 de junio
    { id: 'm67', group: 'L', home: 'Croacia',         away: 'Ghana',              kickoff: '2026-06-27T21:00:00Z', result: null },
    { id: 'm68', group: 'L', home: 'Panamá',          away: 'Inglaterra',         kickoff: '2026-06-27T21:00:00Z', result: null },
    { id: 'm69', group: 'K', home: 'Colombia',        away: 'Portugal',           kickoff: '2026-06-27T23:30:00Z', result: null },
    { id: 'm70', group: 'K', home: 'RD Congo',        away: 'Uzbekistán',         kickoff: '2026-06-27T23:30:00Z', result: null },
    { id: 'm71', group: 'J', home: 'Jordania',        away: 'Argentina',          kickoff: '2026-06-28T02:00:00Z', result: null },
    { id: 'm72', group: 'J', home: 'Argelia',         away: 'Austria',            kickoff: '2026-06-28T02:00:00Z', result: null },

    // ── 16AVOS DE FINAL (P73–P88) Jun 28–Jul 3 ────────────────────────────────
    { id: 'p73',  phase: 'r32', home: 'Sudáfrica',       away: 'Canadá',              homeDesc: null, awayDesc: null, kickoff: '2026-06-28T20:00:00Z', result: null },
    { id: 'p74',  phase: 'r32', home: 'Brasil',          away: 'Japón',               homeDesc: null, awayDesc: null, kickoff: '2026-06-28T23:00:00Z', result: null },
    { id: 'p75',  phase: 'r32', home: 'Alemania',        away: 'Paraguay',            homeDesc: null, awayDesc: null, kickoff: '2026-06-29T17:00:00Z', result: null },
    { id: 'p76',  phase: 'r32', home: 'Países Bajos',    away: 'Marruecos',           homeDesc: null, awayDesc: null, kickoff: '2026-06-29T20:00:00Z', result: null },
    { id: 'p77',  phase: 'r32', home: 'Costa de Marfil', away: 'Noruega',             homeDesc: null, awayDesc: null, kickoff: '2026-06-29T23:00:00Z', result: null },
    { id: 'p78',  phase: 'r32', home: 'Francia',         away: 'Suecia',              homeDesc: null, awayDesc: null, kickoff: '2026-06-30T17:00:00Z', result: null },
    { id: 'p79',  phase: 'r32', home: 'México',          away: 'Ecuador',             homeDesc: null, awayDesc: null, kickoff: '2026-06-30T20:00:00Z', result: null },
    { id: 'p80',  phase: 'r32', home: 'Inglaterra',      away: 'RD Congo',            homeDesc: null, awayDesc: null, kickoff: '2026-06-30T23:00:00Z', result: null },
    { id: 'p81',  phase: 'r32', home: 'Bélgica',         away: 'Senegal',             homeDesc: null, awayDesc: null, kickoff: '2026-07-01T17:00:00Z', result: null },
    { id: 'p82',  phase: 'r32', home: 'Estados Unidos',  away: 'Bosnia y Herzegovina', homeDesc: null, awayDesc: null, kickoff: '2026-07-01T20:00:00Z', result: null },
    { id: 'p83',  phase: 'r32', home: 'España',          away: 'Austria',             homeDesc: null, awayDesc: null, kickoff: '2026-07-01T23:00:00Z', result: null },
    { id: 'p84',  phase: 'r32', home: 'Portugal',        away: 'Croacia',             homeDesc: null, awayDesc: null, kickoff: '2026-07-02T17:00:00Z', result: null },
    { id: 'p85',  phase: 'r32', home: 'Suiza',           away: 'Argelia',             homeDesc: null, awayDesc: null, kickoff: '2026-07-02T20:00:00Z', result: null },
    { id: 'p86',  phase: 'r32', home: 'Australia',       away: 'Egipto',              homeDesc: null, awayDesc: null, kickoff: '2026-07-02T23:00:00Z', result: null },
    { id: 'p87',  phase: 'r32', home: 'Argentina',       away: 'Cabo Verde',          homeDesc: null, awayDesc: null, kickoff: '2026-07-03T17:00:00Z', result: null },
    { id: 'p88',  phase: 'r32', home: 'Colombia',        away: 'Ghana',               homeDesc: null, awayDesc: null, kickoff: '2026-07-03T20:00:00Z', result: null },

    // ── OCTAVOS DE FINAL (P89–P96) Jul 4–7 ───────────────────────────────────
    { id: 'p89',  phase: 'r16', homeDesc: 'Gan. P74',              awayDesc: 'Gan. P77',              home: null, away: null, kickoff: '2026-07-04T17:00:00Z', result: null },
    { id: 'p90',  phase: 'r16', homeDesc: 'Gan. P73',              awayDesc: 'Gan. P75',              home: null, away: null, kickoff: '2026-07-04T20:00:00Z', result: null },
    { id: 'p91',  phase: 'r16', homeDesc: 'Gan. P76',              awayDesc: 'Gan. P78',              home: null, away: null, kickoff: '2026-07-05T17:00:00Z', result: null },
    { id: 'p92',  phase: 'r16', homeDesc: 'Gan. P79',              awayDesc: 'Gan. P80',              home: null, away: null, kickoff: '2026-07-05T20:00:00Z', result: null },
    { id: 'p93',  phase: 'r16', homeDesc: 'Gan. P83',              awayDesc: 'Gan. P84',              home: null, away: null, kickoff: '2026-07-06T17:00:00Z', result: null },
    { id: 'p94',  phase: 'r16', homeDesc: 'Gan. P81',              awayDesc: 'Gan. P82',              home: null, away: null, kickoff: '2026-07-06T20:00:00Z', result: null },
    { id: 'p95',  phase: 'r16', homeDesc: 'Gan. P86',              awayDesc: 'Gan. P88',              home: null, away: null, kickoff: '2026-07-07T17:00:00Z', result: null },
    { id: 'p96',  phase: 'r16', homeDesc: 'Gan. P85',              awayDesc: 'Gan. P87',              home: null, away: null, kickoff: '2026-07-07T20:00:00Z', result: null },

    // ── CUARTOS DE FINAL (P97–P100) Jul 9–11 ─────────────────────────────────
    { id: 'p97',  phase: 'qf',  homeDesc: 'Gan. P89',              awayDesc: 'Gan. P90',              home: null, away: null, kickoff: '2026-07-09T20:00:00Z', result: null },
    { id: 'p98',  phase: 'qf',  homeDesc: 'Gan. P93',              awayDesc: 'Gan. P94',              home: null, away: null, kickoff: '2026-07-09T23:00:00Z', result: null },
    { id: 'p99',  phase: 'qf',  homeDesc: 'Gan. P91',              awayDesc: 'Gan. P92',              home: null, away: null, kickoff: '2026-07-11T17:00:00Z', result: null },
    { id: 'p100', phase: 'qf',  homeDesc: 'Gan. P95',              awayDesc: 'Gan. P96',              home: null, away: null, kickoff: '2026-07-11T20:00:00Z', result: null },

    // ── SEMIFINALES (P101–P102) Jul 14–15 ────────────────────────────────────
    { id: 'p101', phase: 'sf',  homeDesc: 'Gan. P97',              awayDesc: 'Gan. P98',              home: null, away: null, kickoff: '2026-07-14T23:00:00Z', result: null },
    { id: 'p102', phase: 'sf',  homeDesc: 'Gan. P99',              awayDesc: 'Gan. P100',             home: null, away: null, kickoff: '2026-07-16T00:00:00Z', result: null },

    // ── TERCER PUESTO (P103) Jul 18 ───────────────────────────────────────────
    { id: 'p103', phase: '3rd', homeDesc: 'Per. P101',             awayDesc: 'Per. P102',             home: null, away: null, kickoff: '2026-07-18T23:00:00Z', result: null },

    // ── GRAN FINAL (P104) Jul 19 – MetLife Stadium ────────────────────────────
    { id: 'p104', phase: 'final',homeDesc: 'Gan. P101',            awayDesc: 'Gan. P102',             home: null, away: null, kickoff: '2026-07-19T22:00:00Z', result: null }
  ],
  advancement: {
    r32:      { teams: [], locked: false },
    r16:      { teams: [], locked: false },
    qf:       { teams: [], locked: false },
    sf:       { teams: [], locked: false },
    final:    { teams: [], locked: false },
    champion: { team: null, locked: false }
  },
  classificationPredictions: [],
  predictions: []
};

function migrateDb(data) {
  let changed = false;

  if (!Array.isArray(data.users)) {
    data.users = [];
    changed = true;
  }

  PRELOADED_USERNAMES.forEach((username) => {
    const normalized = String(username).trim().toLowerCase();
    const user = data.users.find((item) => String(item.username || '').trim().toLowerCase() === normalized);

    if (!user) {
      data.users.push(createPreloadedUser(username));
      changed = true;
      return;
    }

    if (user.preloaded !== true) {
      user.preloaded = true;
      changed = true;
    }

    if (user.password === undefined && user.passwordHash === undefined) {
      user.password = '';
      changed = true;
    }

    if (user.country === undefined) {
      user.country = '';
      changed = true;
    }
  });

  if (!data.advancement) {
    data.advancement = defaultData.advancement;
    changed = true;
  }
  if (!data.classificationPredictions) {
    data.classificationPredictions = [];
    changed = true;
  }
  if (!data.predictions) {
    data.predictions = [];
    changed = true;
  }

  // Add phase field to group-stage matches if missing
  data.matches.forEach((m) => {
    if (!m.phase) { m.phase = 'group'; changed = true; }
  });

  // Add knockout matches if missing
  const existingIds = new Set(data.matches.map((m) => m.id));
  const knockouts = defaultData.matches.filter((m) => m.phase !== 'group' && !existingIds.has(m.id));
  if (knockouts.length > 0) {
    data.matches.push(...knockouts);
    changed = true;
  }

  return changed;
}

async function initDb() {
  if (!USE_POSTGRES) {
    ensureFileDb();
    dbCache = readFileDb();
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL
    )
  `);

  const result = await pool.query(
    'SELECT data FROM app_state WHERE id = $1',
    ['main']
  );

  if (result.rows.length === 0) {
    let initialData = JSON.parse(JSON.stringify(defaultData));

    if (fs.existsSync(DATA_FILE)) {
      initialData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }

    migrateDb(initialData);

    await pool.query(
      'INSERT INTO app_state (id, data) VALUES ($1, $2)',
      ['main', initialData]
    );

    dbCache = initialData;
  } else {
    dbCache = result.rows[0].data;
    const changed = migrateDb(dbCache);
    if (changed) await writeDb(dbCache);
  }
}

function ensureFileDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

function readFileDb() {
  ensureFileDb();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const data = JSON.parse(raw);
  const changed = migrateDb(data);
  if (changed) writeFileDb(data);
  return data;
}

function writeFileDb(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readDb() {
  if (!dbCache) {
    dbCache = readFileDb();
  }

  return dbCache;
}

function writeDb(data) {
  dbCache = data;

  if (!USE_POSTGRES) {
    writeFileDb(data);
    return;
  }

  pool.query(
    'UPDATE app_state SET data = $2 WHERE id = $1',
    ['main', data]
  ).catch((error) => {
    console.error('Error guardando en PostgreSQL:', error);
  });
}

function createId() {
  return crypto.randomUUID();
}

module.exports = {
  initDb,
  readDb,
  writeDb,
  createId,
  PRELOADED_USERNAMES,
  DATA_FILE
};
