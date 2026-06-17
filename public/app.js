const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const messageEl = document.getElementById('message');
const matchesEl = document.getElementById('matches');
const knockoutEl = document.getElementById('knockout');
const leaderboardEl = document.getElementById('leaderboard');
const newUserModeBtn = document.getElementById('new-user-mode-btn');
const registeredUserModeBtn = document.getElementById('registered-user-mode-btn');
const newUserPanel = document.getElementById('new-user-panel');
const registeredUserPanel = document.getElementById('registered-user-panel');
const preloadedUsersEl = document.getElementById('preloaded-users');
const newUserForm = document.getElementById('new-user-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const adminResultForm = document.getElementById('admin-result-form');
const adminMatchSelect = document.getElementById('admin-match-select');
const newUserSelectionEl = document.getElementById('new-user-selection');
const newUserUsernameInput = document.getElementById('new-user-username');
const newUserCountrySelect = document.getElementById('new-user-country');
let currentUsername = '';
let isJoseAdmin = false;

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
  'Uzbekistán':'🇺🇿','Colombia':'🇨🇴','Estados Unidos':'🇺🇸','Paraguay':'🇵🇾',
};
function flag(team) { return FLAGS[team] || '🏳️'; }

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
let selectedPreloadedUser = '';
let registeredUsernames = new Set();
const COUNTRY_OPTIONS = [...new Set(Object.values(ALL_TEAMS_BY_GROUP).flat())];

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

function avatarHtml(name, cls = 'avatar', photoUrl = null) {
  if (photoUrl) {
    // Extraer dimensiones del cls para la foto
    const sizeCls = cls.includes('avatar-xl') ? 'avatar-xl' : cls.includes('avatar-lg') ? 'avatar-lg' : cls.includes('avatar-sm') ? 'avatar-sm' : '';
    const sizeMap = { 'avatar-xl': 160, 'avatar-lg': 88, 'avatar-sm': 32, '': 44 };
    const sz = sizeMap[sizeCls] || 44;
    return `<img src="${photoUrl}" class="avatar-photo ${cls}" style="width:${sz}px;height:${sz}px" alt="${name}" title="${name}" />`;
  }
  const initials = name.slice(0, 2).toUpperCase();
  const bg = avatarColor(name);
  return `<span class="${cls}" style="background:${bg}" title="${name}">${initials}</span>`;
}

function switchTab(tabName) {
  document.querySelectorAll('.bnav-btn').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
  document.querySelectorAll(`.bnav-btn[data-tab="${tabName}"]`).forEach((b) => b.classList.add('active'));
  const panel = document.getElementById(`tab-${tabName}`);
  if (panel) panel.classList.remove('hidden');
}

document.querySelectorAll('.bnav-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Helpers ───────────────────────────────────────────────────────────────────
let _msgTimer;
function setMessage(msg, isError = false) {
  messageEl.textContent = msg;
  messageEl.style.color = isError ? '#ef4444' : '#22c55e';
  messageEl.classList.remove('hidden');
  clearTimeout(_msgTimer);
  _msgTimer = setTimeout(() => messageEl.classList.add('hidden'), 3500);
}

function setAuthMode(mode) {
  const isNewUser = mode === 'new';
  newUserModeBtn.classList.toggle('active', isNewUser);
  registeredUserModeBtn.classList.toggle('active', !isNewUser);
  newUserPanel.classList.toggle('hidden', !isNewUser);
  registeredUserPanel.classList.toggle('hidden', isNewUser);
}

function renderCountryOptions() {
  newUserCountrySelect.innerHTML = '<option value="">País de preferencia</option>';
  COUNTRY_OPTIONS.forEach((country) => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    newUserCountrySelect.appendChild(option);
  });
}

function renderPreloadedUsers() {
  preloadedUsersEl.innerHTML = '';
  const available = PRELOADED_USERNAMES.filter(u => !registeredUsernames.has(u.toLowerCase()));
  if (!available.length) {
    preloadedUsersEl.innerHTML = '<p class="muted" style="text-align:center">Todos los usuarios ya se registraron.</p>';
    return;
  }
  available.forEach((username) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `preloaded-user-btn${selectedPreloadedUser === username ? ' selected' : ''}`;
    button.textContent = username;
    button.addEventListener('click', () => selectPreloadedUser(username));
    preloadedUsersEl.appendChild(button);
  });
}

function selectPreloadedUser(username) {
  selectedPreloadedUser = username;
  newUserUsernameInput.value = username;
  newUserSelectionEl.textContent = `Usuario seleccionado: ${username}`;
  newUserForm.classList.remove('hidden');
  renderPreloadedUsers();
}

renderCountryOptions();
renderPreloadedUsers();
setAuthMode('new');

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Error inesperado');
  return data;
}

// ── Tarjeta de partido ────────────────────────────────────────────────────────
function buildMatchCard(match) {
  const card = document.createElement('div');
  card.className = 'match-card';

  const prediction = match.prediction || { homeGoals: '', awayGoals: '' };
  const lockedByTime = Date.now() >= new Date(match.lockoutAt).getTime();
  const locked = Boolean(match.locked) || lockedByTime;
  const hasTeams = match.home && match.away;
  const canPredict = hasTeams && !locked;

  const kickoff = new Date(match.kickoff).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  const badge = match.group
    ? `Grupo ${match.group}`
    : (match.homeDesc ? `${match.homeDesc} vs ${match.awayDesc}` : (match.phase || ''));
  const lockIcon = locked ? ' 🔒' : '';

  const homeLabel = hasTeams ? match.home : (match.homeDesc || 'Por definir');
  const awayLabel = hasTeams ? match.away : (match.awayDesc || 'Por definir');
  const homeFlag  = hasTeams ? flag(match.home)  : '🏳️';
  const awayFlag  = hasTeams ? flag(match.away)  : '🏳️';

  const homeVal = (prediction.homeGoals !== '' && prediction.homeGoals !== undefined) ? prediction.homeGoals : '';
  const awayVal = (prediction.awayGoals !== '' && prediction.awayGoals !== undefined) ? prediction.awayGoals : '';

  const resultHtml = match.result
    ? `<span class="result-badge">${match.result.homeGoals} – ${match.result.awayGoals}</span>`
    : '';

  const inputsHtml = canPredict
    ? `<div class="score-inputs">
        <input class="score-input" data-match-id="${match.id}" data-team="home"
          type="number" min="0" max="10" value="${homeVal}"
          oninput="this.value=Math.min(10,Math.max(0,+this.value||0));" />
        <span class="vs-sep">–</span>
        <input class="score-input" data-match-id="${match.id}" data-team="away"
          type="number" min="0" max="10" value="${awayVal}"
          oninput="this.value=Math.min(10,Math.max(0,+this.value||0));" />
      </div>`
    : (homeVal !== ''
        ? `<span class="result-badge" style="color:var(--accent-light)">${homeVal} – ${awayVal}</span>`
        : `<span class="vs-sep" style="font-size:1.4rem">–</span>`);

  const pointsHtml = (match.points !== null && match.points !== undefined)
    ? `<div class="match-points-row"><span class="pts-badge">${match.points} pts</span>${match.pointsReason}</div>`
    : '';

  const showViewBtn = match.locked || Boolean(match.result);

  card.innerHTML = `
    <div class="match-meta-top">
      <span class="match-phase-badge">${badge}${lockIcon}</span>
      <span class="match-time">${kickoff}h</span>
    </div>
    <div class="match-teams-row">
      <div class="match-team-block">
        <span class="team-flag">${homeFlag}</span>
        <span class="team-name">${homeLabel}</span>
      </div>
      <div class="match-center">
        ${resultHtml}
        ${inputsHtml}
      </div>
      <div class="match-team-block">
        <span class="team-flag">${awayFlag}</span>
        <span class="team-name">${awayLabel}</span>
      </div>
    </div>
    ${pointsHtml}
    ${showViewBtn ? `<button class="btn-ver-resultados" data-match-id="${match.id}">👁 Ver pronósticos</button>` : ''}
  `;

  if (showViewBtn) {
    card.querySelector('.btn-ver-resultados').addEventListener('click', () => openMatchPredictions(match.id));
  }

  return card;
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
    h.className = 'phase-header';
    h.textContent = label;
    knockoutEl.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    phaseMatches.forEach((m) => grid.appendChild(buildMatchCard(m)));
    knockoutEl.appendChild(grid);
  });
}

// ── Render: Grupos del Mundial ────────────────────────────────────────────────
function renderGroupStandings(matches) {
  const el = document.getElementById('group-standings');
  if (!el) return;
  el.innerHTML = '';

  // Inicializar tabla con todos los equipos
  const standings = {};
  Object.entries(ALL_TEAMS_BY_GROUP).forEach(([grp, teams]) => {
    standings[grp] = {};
    teams.forEach(t => { standings[grp][t] = { pj:0, g:0, e:0, p:0, gf:0, gc:0 }; });
  });

  // Acumular resultados de partidos jugados
  matches.filter(m => m.phase === 'group' && m.home && m.away && m.result).forEach(match => {
    const grp = match.group;
    if (!standings[grp]) return;
    const { homeGoals, awayGoals } = match.result;
    const hm = standings[grp][match.home];
    const aw = standings[grp][match.away];
    if (!hm || !aw) return;
    hm.pj++; hm.gf += homeGoals; hm.gc += awayGoals;
    aw.pj++; aw.gf += awayGoals; aw.gc += homeGoals;
    if (homeGoals > awayGoals)      { hm.g++; aw.p++; }
    else if (homeGoals < awayGoals) { aw.g++; hm.p++; }
    else                            { hm.e++; aw.e++; }
  });

  // Renderizar cada grupo ordenado por pts > DG > GF
  Object.entries(standings).forEach(([grp, teams]) => {
    const rows = Object.entries(teams).sort(([, a], [, b]) => {
      const pA = a.g*3+a.e, pB = b.g*3+b.e;
      const dA = a.gf-a.gc, dB = b.gf-b.gc;
      return pB-pA || dB-dA || b.gf-a.gf;
    });

    const wrap = document.createElement('div');
    wrap.className = 'group-section';
    wrap.innerHTML = `
      <div class="group-title">Grupo ${grp}</div>
      <div class="group-table">
        <div class="gt-row gt-header">
          <span class="gt-team">Equipo</span>
          <span>PJ</span><span>G</span><span>E</span><span>P</span>
          <span>GF</span><span>GC</span><span>DG</span><span class="gt-pts">Pts</span>
        </div>
        ${rows.map(([team, s], i) => {
          const pts = s.g*3+s.e;
          const dg  = s.gf-s.gc;
          const cls = i < 2 ? 'qualifies' : i === 2 ? 'third' : '';
          return `<div class="gt-row ${cls}">
            <span class="gt-team">${flag(team)} ${team}</span>
            <span>${s.pj}</span><span>${s.g}</span><span>${s.e}</span><span>${s.p}</span>
            <span>${s.gf}</span><span>${s.gc}</span>
            <span>${dg > 0 ? '+'+dg : dg}</span>
            <span class="gt-pts">${pts}</span>
          </div>`;
        }).join('')}
      </div>`;
    el.appendChild(wrap);
  });
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
  } else if (activeRound === 'r32') {
    hint.textContent = 'Selecciona 1.º y 2.º de cada grupo, más 8 mejores terceros.';
  } else {
    hint.textContent = locked ? 'Ronda cerrada.' : `Selecciona los ${rc.count} equipos que crees que clasifican. Seleccionados: ${selected.size}`;
  }

  teamsEl.appendChild(hint);

  if (activeRound === 'r32') {
    renderR32ClassificationForm(teamsEl, selected, locked, confirmed, hint);
    return;
  }

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
      chip.dataset.group = grp;
      chip.textContent = `${flag(team)} ${team}`;

      if (selected.has(team)) chip.classList.add('selected');

      if (locked) {
        chip.disabled = true;
        if (confirmed.includes(team)) chip.classList.add('confirmed');
        else if (selected.has(team)) chip.classList.add('wrong');
      }

      chip.addEventListener('click', () => {
        if (locked) return;

        const isSelected = chip.classList.contains('selected');

        if (!isSelected) {
          const selectedNow = [...document.querySelectorAll('.team-chip.selected')];

          if (selectedNow.length >= rc.count) {
            setMessage(`Solo puedes seleccionar ${rc.count} equipo(s) en esta ronda`, true);
            return;
          }
        }

        chip.classList.toggle('selected');

        const count = document.querySelectorAll('.team-chip.selected').length;
        hint.textContent = `Selecciona los ${rc.count} equipos que crees que clasifican. Seleccionados: ${count}`;
      });

      chipsRow.appendChild(chip);
    });

    teamsEl.appendChild(chipsRow);
  });
}

function renderR32ClassificationForm(container, selected, locked, confirmed, hint) {
  Object.entries(ALL_TEAMS_BY_GROUP).forEach(([grp, teams]) => {
    const groupBox = document.createElement('div');
    groupBox.className = 'classification-group-box';

    groupBox.innerHTML = `
      <div class="team-group-label">Grupo ${grp}</div>

      <div class="classification-select-grid">
        <label>
          1.º lugar
          <select class="classification-select" data-group="${grp}" data-position="first" ${locked ? 'disabled' : ''}>
            ${buildTeamOptions(teams, selected, 0)}
          </select>
        </label>

        <label>
          2.º lugar
          <select class="classification-select" data-group="${grp}" data-position="second" ${locked ? 'disabled' : ''}>
            ${buildTeamOptions(teams, selected, 1)}
          </select>
        </label>

        <label>
          3.º mejor tercero
          <select class="classification-select third-select" data-group="${grp}" data-position="third" ${locked ? 'disabled' : ''}>
            ${buildTeamOptions(teams, selected, 2, true)}
          </select>
        </label>
      </div>
    `;

    container.appendChild(groupBox);
  });

  updateR32Hint(hint);

  document.querySelectorAll('.classification-select').forEach((select) => {
    select.addEventListener('change', () => {
      cleanRepeatedTeamsInGroup(select);
      limitBestThirds(select);
      updateR32Hint(hint);
    });
  });
}

function buildTeamOptions(teams, selected, index, optional = false) {
  const selectedArray = [...selected];
  const selectedTeam = selectedArray.find((team) => teams.includes(team) && selectedArray.indexOf(team) % 3 === index);

  let html = optional
    ? '<option value="">Sin tercer clasificado</option>'
    : '<option value="">Selecciona equipo</option>';

  teams.forEach((team) => {
    const isSelected = selectedTeam === team ? 'selected' : '';
    html += `<option value="${team}" ${isSelected}>${flag(team)} ${team}</option>`;
  });

  return html;
}

function cleanRepeatedTeamsInGroup(changedSelect) {
  const group = changedSelect.dataset.group;
  const value = changedSelect.value;
  if (!value) return;

  document.querySelectorAll(`.classification-select[data-group="${group}"]`).forEach((select) => {
    if (select !== changedSelect && select.value === value) {
      select.value = '';
    }
  });
}

function limitBestThirds(changedSelect) {
  if (!changedSelect.classList.contains('third-select')) return;

  const thirds = [...document.querySelectorAll('.third-select')].filter((select) => select.value);

  if (thirds.length > 8) {
    changedSelect.value = '';
    setMessage('Ya seleccionaste los 8 mejores terceros. No puedes agregar más terceros.', true);
  } else if (changedSelect.value) {
    setMessage(`Este equipo cuenta como mejor tercero. Mejores terceros: ${thirds.length}/8`, false);
  }
}

function getR32SelectedTeams() {
  return [...document.querySelectorAll('.classification-select')]
    .map((select) => select.value)
    .filter(Boolean);
}

function updateR32Hint(hint) {
  const selectedTeams = getR32SelectedTeams();
  const thirdCount = [...document.querySelectorAll('.third-select')].filter((select) => select.value).length;
  hint.textContent = `Selecciona 1.º y 2.º de cada grupo + 8 mejores terceros. Seleccionados: ${selectedTeams.length}/32 · Mejores terceros: ${thirdCount}/8`;
}

function countThirdPlaceSelections(selectedElements) {
  const byGroup = {};

  selectedElements.forEach((el) => {
    const group = el.dataset.group;
    if (!byGroup[group]) byGroup[group] = 0;
    byGroup[group]++;
  });

  return Object.values(byGroup).filter((count) => count >= 3).length;
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
      <span class="lb-player">${avatarHtml(item.username, 'avatar avatar-sm', item.avatar)}<span class="lb-name">${item.username}</span></span>
      <span><strong>${item.totalPoints} pts</strong></span>
      <span>${item.matchPoints ?? item.totalPoints}</span>
      <span>${item.classPoints ?? 0}</span>
      <span>${item.exactScores} ⭐</span>
    `;
    leaderboardEl.appendChild(row);
  });
}

function renderAdminMatches(matches) {
  if (!adminMatchSelect) return;

  const selectedBefore = adminMatchSelect.value;

  adminMatchSelect.innerHTML = '<option value="">Selecciona un partido</option>';

  matches.forEach((match) => {
    const option = document.createElement('option');

    const home = match.home || match.homeDesc || 'Por definir';
    const away = match.away || match.awayDesc || 'Por definir';
    const result = match.result
      ? ` · Resultado: ${match.result.homeGoals}-${match.result.awayGoals}`
      : ' · Sin resultado';

    const lockStatus = match.locked ? ' · 🔒 Bloqueado' : ' · 🔓 Abierto';

    option.value = match.id;
    option.textContent = `${match.id} · ${home} vs ${away}${result}${lockStatus}`;

    if (match.id === selectedBefore) {
      option.selected = true;
    }

    adminMatchSelect.appendChild(option);
  });

  ensureAdminLockButton(matches);
}

function ensureAdminLockButton(matches) {
  if (!adminResultForm) return;

  let lockBtn = document.getElementById('admin-lock-match-btn');

  if (!lockBtn) {
    lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.id = 'admin-lock-match-btn';
    lockBtn.className = 'secondary-btn';
    lockBtn.style.marginTop = '10px';
    adminResultForm.appendChild(lockBtn);
  }

  const selectedMatch = matches.find((m) => m.id === adminMatchSelect.value);
  lockBtn.textContent = selectedMatch?.locked ? '🔓 Desbloquear pronósticos' : '🔒 Bloquear pronósticos';

  adminMatchSelect.onchange = () => {
    const selectedMatch = matches.find((m) => m.id === adminMatchSelect.value);
    lockBtn.textContent = selectedMatch?.locked ? '🔓 Desbloquear pronósticos' : '🔒 Bloquear pronósticos';
  };

  lockBtn.onclick = async () => {
    const fd = new FormData(adminResultForm);
    const secret = isJoseAdmin ? '' : fd.get('secret');
    const matchId = fd.get('matchId');

    if (!matchId) {
      setMessage('Debes seleccionar un partido para bloquear o desbloquear', true);
      return;
    }

    try {
      const headers = {};
      if (secret) headers['x-admin-secret'] = secret;

      await api(`/api/admin/matches/${matchId}/lock`, {
        method: 'PATCH',
        headers
      });

      setMessage('Estado de bloqueo actualizado ✅');
      await loadData();
    } catch (e) {
      setMessage(e.message, true);
    }
  };
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadData() {
  const [{ matches }, { leaderboard }] = await Promise.all([
    api('/api/matches'),
    api('/api/leaderboard')
  ]);
  registeredUsernames = new Set(leaderboard.map(r => r.username.toLowerCase()));
  renderPreloadedUsers();
  renderMatches(matches);
  renderKnockout(matches);
  renderGroupStandings(matches);
  renderLeaderboard(leaderboard);
  renderAdminMatches(matches);
}

async function refreshSession() {
  try {
    const { user } = await api('/api/auth/me');
    currentUsername = String(user.username || '').trim().toLowerCase();
    isJoseAdmin = currentUsername === 'joseagdiaz';
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');

    const adminSecretInput = adminResultForm?.querySelector('input[name="secret"]');
    if (adminSecretInput) {
      if (isJoseAdmin) {
        adminSecretInput.required = false;
        adminSecretInput.value = '';
        adminSecretInput.classList.add('hidden');
      } else {
        adminSecretInput.required = true;
        adminSecretInput.classList.remove('hidden');
      }
    }

    // Avatar pequeño en el header
    document.getElementById('user-avatar').innerHTML = avatarHtml(user.username, 'avatar avatar-sm', user.avatar);
    // Datos del perfil
    const profileAvatar   = document.getElementById('profile-avatar');
    const profileUsername = document.getElementById('profile-username');
    const profileCountry  = document.getElementById('profile-country');
    if (profileAvatar) {
      profileAvatar.innerHTML = avatarHtml(user.username, 'avatar avatar-lg', user.avatar);
      const avatarEl = profileAvatar.querySelector('.avatar-lg, .avatar-photo');
      avatarEl?.addEventListener('click', () => {
        const overlay = document.createElement('div');
        overlay.className = 'avatar-modal-overlay';
        overlay.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center">
            ${avatarHtml(user.username, 'avatar avatar-xl', user.avatar)}
            <div class="avatar-modal-username">${user.username}</div>
            ${user.country ? `<div class="avatar-modal-country">${flag(user.country)} ${user.country}</div>` : ''}
          </div>`;
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
      });
    }
    if (profileUsername) profileUsername.textContent = user.username;
    if (profileCountry) profileCountry.innerHTML = user.country
      ? `<span class="profile-country-text">${flag(user.country)} ${user.country}</span>`
      : '';
    await loadData();
  } catch {
    currentUsername = '';
    isJoseAdmin = false;
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
  }
}

newUserModeBtn.addEventListener('click', () => setAuthMode('new'));
registeredUserModeBtn.addEventListener('click', () => setAuthMode('registered'));

// ── Auth forms ────────────────────────────────────────────────────────────────
newUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(newUserForm);
  try {
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: fd.get('username'),
        password: fd.get('password'),
        country: fd.get('country')
      })
    });
    setMessage('Usuario creado correctamente');
    newUserForm.reset();
    selectedPreloadedUser = '';
    newUserSelectionEl.textContent = 'Ningún usuario seleccionado';
    newUserForm.classList.add('hidden');
    renderPreloadedUsers();
    await refreshSession();
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

// ── FAB: guardar pronósticos completados ─────────────────────────────────────
document.getElementById('fab-save')?.addEventListener('click', async () => {
  // Solo inputs de partidos (con data-match-id), excluye los del modal admin
  const inputs = [...document.querySelectorAll('.score-input[data-match-id]:not(:disabled)')];
  const grouped = {};
  inputs.forEach((inp) => {
    const matchId = inp.dataset.matchId;
    if (!grouped[matchId]) grouped[matchId] = {};
    grouped[matchId][inp.dataset.team] = inp.value;
  });
  try {
    let guardados = 0;
    for (const [matchId, values] of Object.entries(grouped)) {
      // Saltar partidos donde alguno de los dos goles no fue ingresado
      if (values.home === '' || values.away === '') continue;
      const homeGoals = Number(values.home);
      const awayGoals = Number(values.away);
      if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) ||
          homeGoals < 0 || awayGoals < 0 || homeGoals > 10 || awayGoals > 10) {
        setMessage('Los goles deben estar entre 0 y 10', true);
        return;
      }
      await api(`/api/predictions/${matchId}`, {
        method: 'POST',
        body: JSON.stringify({ homeGoals, awayGoals })
      });
      guardados++;
    }
    if (guardados === 0) { setMessage('Completa al menos un partido para guardar', true); return; }
    setMessage(`${guardados} pronóstico(s) guardado(s) ✅`);
    await loadData();
  } catch (e) {
    setMessage(e.message, true);
  }
});

// ── Modal admin ────────────────────────────────────────────────────────────────
const adminModal = document.getElementById('admin-modal');
document.getElementById('admin-btn')?.addEventListener('click', () => {
  adminModal?.classList.remove('hidden');
});
document.getElementById('admin-modal-close')?.addEventListener('click', () => {
  adminModal?.classList.add('hidden');
});
adminModal?.addEventListener('click', (e) => {
  if (e.target === adminModal) adminModal.classList.add('hidden');
});


adminResultForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fd = new FormData(adminResultForm);
  const secret = isJoseAdmin ? '' : fd.get('secret');
  const matchId = fd.get('matchId');
  const homeGoals = Number(fd.get('homeGoals'));
  const awayGoals = Number(fd.get('awayGoals'));

  if (!matchId) {
    setMessage('Debes seleccionar un partido', true);
    return;
  }

  if (
    !Number.isInteger(homeGoals) ||
    !Number.isInteger(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0 ||
    homeGoals > 10 ||
    awayGoals > 10
  ) {
    setMessage('El resultado debe tener goles entre 0 y 10', true);
    return;
  }

  try {
    const headers = {};
    if (secret) headers['x-admin-secret'] = secret;

    await api(`/api/admin/matches/${matchId}/result`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ homeGoals, awayGoals })
    });

    setMessage('Resultado oficial guardado ✅');
    adminResultForm.reset();
    await loadData();
  } catch (e) {
    setMessage(e.message, true);
  }
});

// ── Modal: ver pronósticos de todos en un partido ────────────────────────────
async function openMatchPredictions(matchId) {
  const modal = document.getElementById('match-preds-modal');
  const body  = document.getElementById('match-preds-body');
  const title = document.getElementById('match-preds-title');
  if (!modal || !body || !title) return;

  body.innerHTML = '<p class="muted" style="text-align:center;padding:20px">Cargando…</p>';
  modal.classList.remove('hidden');

  try {
    const { match, rows } = await api(`/api/matches/${matchId}/predictions`);
    title.textContent = (match.home && match.away)
      ? `${flag(match.home)} ${match.home}  vs  ${match.away} ${flag(match.away)}`
      : 'Pronósticos';

    const resultLine = match.result
      ? `<div class="mpreds-result">Resultado oficial: <strong>${match.result.homeGoals} – ${match.result.awayGoals}</strong></div>`
      : '';

    const rowsHtml = rows.map(r => {
      const pred = (r.homeGoals !== null)
        ? `<span class="mpreds-score">${r.homeGoals} – ${r.awayGoals}</span>`
        : `<span class="mpreds-no-pred">Sin pronóstico</span>`;
      const pts = (r.points !== null)
        ? `<span class="mpreds-pts">${r.points} pts</span>`
        : '';
      return `<div class="mpreds-row">
        ${avatarHtml(r.username, 'avatar avatar-sm', r.avatar)}
        <span class="mpreds-name">${r.username}</span>
        ${pred}
        ${pts}
      </div>`;
    }).join('');

    body.innerHTML = resultLine + `<div class="mpreds-list">${rowsHtml}</div>`;
  } catch (e) {
    body.innerHTML = `<p class="muted" style="color:var(--danger);text-align:center;padding:20px">${e.message}</p>`;
  }
}

document.getElementById('match-preds-close')?.addEventListener('click', () => {
  document.getElementById('match-preds-modal')?.classList.add('hidden');
});
document.getElementById('match-preds-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'match-preds-modal') e.target.classList.add('hidden');
});

// ── Admin: editar usuarios ──────────────────────────────────────────────────
const ADMIN_SECRET_USERS = 'diaz-admin';
let editingUserId = null;
let currentAvatarBase64 = null;

const usersModal          = document.getElementById('users-modal');
const usersAuthStep       = document.getElementById('users-auth-step');
const usersListStep       = document.getElementById('users-list-step');
const usersEditStep       = document.getElementById('users-edit-step');
const usersAdminSecret    = document.getElementById('users-admin-secret');
const usersAuthBtn        = document.getElementById('users-auth-btn');
const usersAuthError      = document.getElementById('users-auth-error');
const usersList           = document.getElementById('users-list');
const editUsername        = document.getElementById('edit-username');
const editPassword        = document.getElementById('edit-password');
const editCountry         = document.getElementById('edit-country');
const usersEditMsg        = document.getElementById('users-edit-msg');
const usersAvatarInput    = document.getElementById('users-avatar-input');
const usersEditAvatarWrap = document.getElementById('users-edit-avatar-wrap');

// Poblar select de países en el formulario de edición
if (editCountry) {
  [...new Set(Object.values(ALL_TEAMS_BY_GROUP).flat())].forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = `${flag(c)} ${c}`;
    editCountry.appendChild(o);
  });
}

function showUsersStep(step) {
  [usersAuthStep, usersListStep, usersEditStep].forEach(el => el?.classList.add('hidden'));
  step?.classList.remove('hidden');
}

document.getElementById('open-edit-users-btn')?.addEventListener('click', () => {
  adminModal?.classList.add('hidden');
  usersModal?.classList.remove('hidden');
  if (isJoseAdmin) {
    const headers = {};
    api('/api/admin/users', { headers })
      .then(({ users }) => {
        renderUsersList(users);
        showUsersStep(usersListStep);
      })
      .catch((e) => {
        if (usersAuthError) usersAuthError.textContent = e.message;
      });
    return;
  }

  showUsersStep(usersAuthStep);
  if (usersAdminSecret) { usersAdminSecret.value = ''; usersAdminSecret.focus(); }
  if (usersAuthError) usersAuthError.textContent = '';
});

document.getElementById('users-modal-close')?.addEventListener('click', () => {
  usersModal?.classList.add('hidden');
});
usersModal?.addEventListener('click', (e) => {
  if (e.target === usersModal) usersModal.classList.add('hidden');
});

usersAuthBtn?.addEventListener('click', async () => {
  const secret = usersAdminSecret?.value.trim();
  if (secret !== ADMIN_SECRET_USERS) {
    if (usersAuthError) usersAuthError.textContent = 'Clave incorrecta';
    return;
  }
  try {
    const { users } = await api('/api/admin/users', {
      headers: { 'x-admin-secret': ADMIN_SECRET_USERS }
    });
    renderUsersList(users);
    showUsersStep(usersListStep);
  } catch (e) {
    if (usersAuthError) usersAuthError.textContent = e.message;
  }
});

function renderUsersList(users) {
  usersList.innerHTML = '';
  users.forEach(u => {
    const item = document.createElement('div');
    item.className = 'user-list-item';
    item.innerHTML = `
      ${avatarHtml(u.username, 'avatar avatar-sm', u.avatar)}
      <div class="uli-info">
        <div class="uli-name">${u.username}</div>
        <div class="uli-country">${u.country ? `${flag(u.country)} ${u.country}` : 'Sin país'}</div>
      </div>
      <span class="uli-arrow">›</span>`;
    item.addEventListener('click', () => openEditUser(u));
    usersList.appendChild(item);
  });
}

function openEditUser(u) {
  editingUserId = u.id;
  currentAvatarBase64 = u.avatar || null;
  if (editUsername) editUsername.value = u.username;
  if (editPassword) editPassword.value = '';
  if (editCountry)  editCountry.value  = u.country || '';
  renderEditAvatar(u.username, currentAvatarBase64);
  if (usersEditMsg) usersEditMsg.textContent = '';
  showUsersStep(usersEditStep);
}

function renderEditAvatar(name, photoUrl) {
  if (!usersEditAvatarWrap) return;
  usersEditAvatarWrap.innerHTML = avatarHtml(name, 'avatar avatar-lg', photoUrl);
}

usersAvatarInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    currentAvatarBase64 = ev.target.result;
    renderEditAvatar(editUsername?.value || '', currentAvatarBase64);
  };
  reader.readAsDataURL(file);
});

document.getElementById('users-back-btn')?.addEventListener('click', async () => {
  try {
    const { users } = await api('/api/admin/users', {
      headers: { 'x-admin-secret': ADMIN_SECRET_USERS }
    });
    renderUsersList(users);
  } catch {}
  showUsersStep(usersListStep);
});

document.getElementById('users-save-btn')?.addEventListener('click', async () => {
  if (!editingUserId) return;
  const body = {
    username: editUsername?.value.trim(),
    country:  editCountry?.value || '',
    avatar:   currentAvatarBase64
  };
  const pwd = editPassword?.value.trim();
  if (pwd) body.password = pwd;

  try {
    await api(`/api/admin/users/${editingUserId}`, {
      method: 'PATCH',
      headers: { 'x-admin-secret': ADMIN_SECRET_USERS },
      body: JSON.stringify(body)
    });
    if (usersEditMsg) { usersEditMsg.textContent = 'Guardado ✅'; usersEditMsg.style.color = 'var(--success)'; }
    const { users } = await api('/api/admin/users', {
      headers: { 'x-admin-secret': ADMIN_SECRET_USERS }
    });
    renderUsersList(users);
    setTimeout(() => showUsersStep(usersListStep), 800);
  } catch (e) {
    if (usersEditMsg) { usersEditMsg.textContent = e.message; usersEditMsg.style.color = 'var(--danger)'; }
  }
});

refreshSession();
