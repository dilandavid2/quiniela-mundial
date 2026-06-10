const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const messageEl = document.getElementById('message');
const welcomeEl = document.getElementById('welcome');
const matchesEl = document.getElementById('matches');
const knockoutEl = document.getElementById('knockout');
const leaderboardEl = document.getElementById('leaderboard');
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');

// ── Banderas ──────────────────────────────────────────────────────────────────
const FLAGS = {
  'México':'🇲🇽','Sudáfrica':'🇿🇦','Corea del Sur':'🇰🇷','República Checa':'🇨🇿',
  'Canadá':'🇨🇦','Bosnia y Herzegovina':'🇧🇦','Catar':'🇶🇦','Suiza':'🇨🇭',
  'Brasil':'🇧🇷','Marruecos':'🇲🇦','Haití':'🇭🇹','Escocia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Australia':'🇦🇺','Turquía':'🇹🇷','Alemania':'🇩🇪','Curazao':'🇨🇼',
  'Países Bajos':'🇳🇱','Japón':'🇯🇵','Costa de Marfil':'🇨🇮','Ecuador':'🇪🇨',
  'Suecia':'🇸🇪','Túnez':'🇹🇳','España':'🇪🇸','Cabo Verde':'🇨🇻',
  'Bélgica':'🇧🇪','Egipto':'🇪🇬','Arabia Saudí':'🇸🇦','Uruguay':'🇺🇾',
  'Irán':'🇮🇷','Nueva Zelanda':'🇳🇿','Francia':'🇫🇷','Senegal':'🇸🇳',
  'Irak':'🇮🇶','Noruega':'🇳🇴','Argentina':'🇦🇷','Argelia':'🇩🇿',
  'Austria':'🇦🇹','Jordania':'🇯🇴','Portugal':'🇵🇹','RD Congo':'🇨🇩',
  'Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croacia':'🇭🇷','Ghana':'🇬🇭','Panamá':'🇵🇦',
  'Uzbekistán':'🇺🇿','Colombia':'🇨🇴','Estados Unidos':'🇺🇸',
};
function flag(team) { return FLAGS[team] || '🏳️'; }

// ── Equipos por grupo ─────────────────────────────────────────────────────────
const ALL_TEAMS_BY_GROUP = {
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
  L:['Inglaterra','Croacia','Ghana','Panamá'],
};

const ROUND_CONFIG = [
  { key:'r32',   label:'16avos',  count:32, pts:2  },
  { key:'r16',   label:'8avos',   count:16, pts:4  },
  { key:'qf',    label:'Cuartos', count:8,  pts:6  },
  { key:'sf',    label:'Semis',   count:4,  pts:8  },
  { key:'final', label:'Final',   count:2,  pts:10 },
  { key:'champion',label:'Campeón',count:1, pts:15 },
];

// ── Tabs ──────────────────────────────────────────────────────────────────────
let activeRound = 'r32';
let classificationData = null;

// ── Avatares ───────────────────────────────────────────────────────────────────
function avatarColor(name) {
  const palette = [
    '#dc2626','#d97706','#16a34a','#0284c7',
    '#7c3aed','#db2777','#0891b2','#b45309',
    '#4f46e5','#059669','#c2410c','#7e22ce'
  ];
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return palette[hash % palette.length];
}

function avatarHtml(name, cls = 'avatar') {
  const initials = name.slice(0, 2).toUpperCase();
  const bg = avatarColor(name);
  return `<span class="${cls}" style="background:${bg}" title="${name}">${initials}</span>`;
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
  document.querySelectorAll(`.tab-btn[data-tab="${tabName}"]`).forEach((b) => b.classList.add('active'));
  document.querySelectorAll(`.bnav-btn[data-tab="${tabName}"]`).forEach((b) => b.classList.add('active'));
  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.querySelectorAll('.bnav-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function setMessage(msg, isError = false) {
  messageEl.textContent = msg;
  messageEl.style.color = isError ? '#f87171' : '#22c55e';
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Error inesperado');
  return data;
}

// ── Tarjeta de partido ────────────────────────────────────────────────────────
function buildMatchCard(match) {
  const row = document.createElement('div');
  row.className = 'match-row';

  const kickoff = new Date(match.kickoff).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  const prediction = match.prediction || { homeGoals:'', awayGoals:'' };
  const locked = Date.now() >= new Date(match.lockoutAt).getTime();
  const hasTeams = match.home && match.away;
  const resultText = match.result ? `${match.result.homeGoals}-${match.result.awayGoals}` : 'pendiente';
  const pointsText = match.points === null ? '' : ` · <strong>${match.points} pts</strong> (${match.pointsReason})`;
  const metaLabel = match.group ? `Grupo ${match.group}` : (match.homeDesc ? `${match.homeDesc} vs ${match.awayDesc}` : '');
  const homeLabel = hasTeams ? `${flag(match.home)} ${match.home}` : (match.homeDesc || 'Por definir');
  const awayLabel = hasTeams ? `${flag(match.away)} ${match.away}` : (match.awayDesc || 'Por definir');
  const canPredict = hasTeams && !locked;

  row.innerHTML = `
    <div class="match-meta">${metaLabel} · ${kickoff}h · ${resultText}${pointsText}</div>
    <div class="match-teams">
      <span class="team">${homeLabel}</span>
      <span class="vs">vs</span>
      <span class="team">${awayLabel}</span>
    </div>
    <div class="row-actions">
      <input class="score-input" type="number" min="0" value="${prediction.homeGoals}" ${canPredict ? '' : 'disabled'} />
      <span>-</span>
      <input class="score-input" type="number" min="0" value="${prediction.awayGoals}" ${canPredict ? '' : 'disabled'} />
      <button ${canPredict ? '' : 'disabled'}>${match.prediction ? 'Actualizar' : 'Guardar'}</button>
    </div>
  `;

  const [homeInput, awayInput, button] = row.querySelectorAll('input, button');
  button?.addEventListener('click', async () => {
    try {
      const homeGoals = Number(homeInput.value);
      const awayGoals = Number(awayInput.value);
      if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
        setMessage('Ingresá goles válidos (0 o más)', true); return;
      }
      await api(`/api/predictions/${match.id}`, { method:'POST', body:JSON.stringify({ homeGoals, awayGoals }) });
      setMessage('Pronóstico guardado ✅');
      await loadData();
    } catch (e) { setMessage(e.message, true); }
  });

  return row;
}

// ── Render: Fase de grupos ────────────────────────────────────────────────────
function renderMatches(matches) {
  matchesEl.innerHTML = '';
  const groupMatches = matches.filter((m) => m.phase === 'group');
  if (!groupMatches.length) { matchesEl.innerHTML = '<p>No hay partidos.</p>'; return; }

  const byDate = {};
  groupMatches.forEach((match) => {
    const key = new Date(match.kickoff).toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' });
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(match);
  });

  Object.entries(byDate).forEach(([dateLabel, group]) => {
    const h = document.createElement('h3');
    h.className = 'date-header';
    h.textContent = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
    matchesEl.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    group.forEach((match) => grid.appendChild(buildMatchCard(match)));
    matchesEl.appendChild(grid);
  });
}

// ── Render: Llaves ────────────────────────────────────────────────────────────
function renderKnockout(matches) {
  knockoutEl.innerHTML = '';
  const phases = [
    { label:'⚔️ 16avos de Final',  ids:['p73','p74','p75','p76','p77','p78','p79','p80','p81','p82','p83','p84','p85','p86','p87','p88'] },
    { label:'🏅 Octavos de Final',  ids:['p89','p90','p91','p92','p93','p94','p95','p96'] },
    { label:'📐 Cuartos de Final',  ids:['p97','p98','p99','p100'] },
    { label:'⚡ Semifinales',        ids:['p101','p102'] },
    { label:'🥉 Tercer Puesto',     ids:['p103'] },
    { label:'👑 Gran Final',         ids:['p104'] },
  ];

  phases.forEach(({ label, ids }) => {
    const phaseMatches = matches.filter((m) => ids.includes(m.id));
    if (!phaseMatches.length) return;
    const h = document.createElement('h3');
    h.className = 'date-header';
    h.textContent = label;
    knockoutEl.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    phaseMatches.forEach((m) => grid.appendChild(buildMatchCard(m)));
    knockoutEl.appendChild(grid);
  });
}

// ── Render: Clasificación ─────────────────────────────────────────────────────
function renderClassification(data) {
  classificationData = data;
  const { advancement, predictions } = data;

  const roundTabsEl = document.getElementById('round-tabs');
  roundTabsEl.innerHTML = '';
  ROUND_CONFIG.forEach(({ key, label, pts }) => {
    const btn = document.createElement('button');
    const adv = advancement[key];
    const locked = adv && adv.locked;
    btn.className = `round-tab-btn${key === activeRound ? ' active' : ''}`;
    btn.textContent = `${label} (${pts} pts)${locked ? ' 🔒' : ''}`;
    btn.addEventListener('click', () => {
      activeRound = key;
      document.querySelectorAll('.round-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderClassificationTeams(advancement, predictions);
    });
    roundTabsEl.appendChild(btn);
  });

  renderClassificationTeams(advancement, predictions);

  document.getElementById('save-classification-btn').onclick = async () => {
    const adv = advancement[activeRound];
    if (adv && adv.locked) { setMessage('Esta ronda ya está cerrada 🔒', true); return; }
    const selected = [...document.querySelectorAll('.team-chip.selected')].map((el) => el.dataset.team);
    try {
      await api(`/api/classification/${activeRound}`, { method:'POST', body:JSON.stringify({ teams: selected }) });
      setMessage(`Clasificación guardada ✅`);
      await loadData();
    } catch (e) { setMessage(e.message, true); }
  };
}

function renderClassificationTeams(advancement, predictions) {
  const teamsEl = document.getElementById('classification-teams');
  teamsEl.innerHTML = '';

  const rc = ROUND_CONFIG.find((r) => r.key === activeRound);
  const adv = advancement[activeRound];
  const locked = adv && adv.locked;
  const confirmed = adv ? (activeRound === 'champion' ? (adv.team ? [adv.team] : []) : (adv.teams || [])) : [];
  const userPred = predictions.find((p) => p.round === activeRound);
  const selected = new Set(userPred ? userPred.teams : []);

  const hint = document.createElement('p');
  hint.className = 'muted';
  if (locked && confirmed.length) {
    const correct = [...selected].filter((t) => confirmed.includes(t)).length;
    hint.innerHTML = `Ronda cerrada. Acertaste <strong>${correct}</strong> de ${confirmed.length} equipos → <strong>+${correct * rc.pts} pts</strong>`;
  } else {
    const count = selected.size;
    hint.textContent = locked ? 'Ronda cerrada.' : `Seleccioná los ${rc.count} equipos que crees que clasifican. Seleccionados: ${count}`;
  }
  teamsEl.appendChild(hint);

  Object.entries(ALL_TEAMS_BY_GROUP).forEach(([grp, teams]) => {
    const groupLabel = document.createElement('div');
    groupLabel.className = 'team-group-label';
    groupLabel.textContent = `Grupo ${grp}`;
    teamsEl.appendChild(groupLabel);

    const chipsRow = document.createElement('div');
    chipsRow.className = 'chips-row';

    teams.forEach((team) => {
      const chip = document.createElement('button');
      chip.className = 'team-chip';
      chip.dataset.team = team;
      chip.textContent = `${flag(team)} ${team}`;
      if (selected.has(team)) chip.classList.add('selected');
      if (locked) {
        chip.disabled = true;
        if (confirmed.includes(team)) chip.classList.add('confirmed');
        else if (selected.has(team)) chip.classList.add('wrong');
      }
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        const count = document.querySelectorAll('.team-chip.selected').length;
        if (!locked) hint.textContent = `Seleccioná los ${rc.count} equipos que crees que clasifican. Seleccionados: ${count}`;
      });
      chipsRow.appendChild(chip);
    });

    teamsEl.appendChild(chipsRow);
  });
}

// ── Render: Leaderboard ───────────────────────────────────────────────────────
function renderLeaderboard(rows) {
  leaderboardEl.innerHTML = '';
  if (!rows.length) { leaderboardEl.innerHTML = '<p>Sin participantes todavía.</p>'; return; }

  const header = document.createElement('div');
  header.className = 'table-row table-header';
  header.innerHTML = '<span>#</span><span>Jugador</span><span>Total</span><span>Partidos</span><span>Clasif.</span><span>Exactos</span>';
  leaderboardEl.appendChild(header);

  rows.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <span>${index + 1}</span>
      <span class="lb-player">${avatarHtml(item.username, 'avatar avatar-sm')}<span class="lb-name">${item.username}</span></span>
      <span><strong>${item.totalPoints} pts</strong></span>
      <span>${item.matchPoints ?? item.totalPoints}</span>
      <span>${item.classPoints ?? 0}</span>
      <span>${item.exactScores} ⭐</span>
    `;
    leaderboardEl.appendChild(row);
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadData() {
  const [{ matches }, { leaderboard }, classData] = await Promise.all([
    api('/api/matches'),
    api('/api/leaderboard'),
    api('/api/classification')
  ]);
  renderMatches(matches);
  renderKnockout(matches);
  renderClassification(classData);
  renderLeaderboard(leaderboard);
}

async function refreshSession() {
  try {
    const { user } = await api('/api/auth/me');
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    welcomeEl.textContent = `Bienvenido, ${user.username}`;
    document.getElementById('user-avatar').innerHTML = avatarHtml(user.username, 'avatar avatar-md');
    await loadData();
  } catch {
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
  }
}

// ── Auth forms ────────────────────────────────────────────────────────────────
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(registerForm);
  try {
    await api('/api/auth/register', { method:'POST', body:JSON.stringify({ username:fd.get('username'), password:fd.get('password') }) });
    setMessage('Cuenta creada correctamente'); registerForm.reset(); await refreshSession();
  } catch (err) { setMessage(err.message, true); }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
  try {
    await api('/api/auth/login', { method:'POST', body:JSON.stringify({ username:fd.get('username'), password:fd.get('password') }) });
    setMessage('Login exitoso'); loginForm.reset(); await refreshSession();
  } catch (err) { setMessage(err.message, true); }
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/auth/logout', { method:'POST' });
  setMessage('Sesión cerrada'); await refreshSession();
});

refreshSession();
