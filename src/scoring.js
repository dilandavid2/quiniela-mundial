function getOutcome(homeGoals, awayGoals) {
  if (homeGoals === awayGoals) return 'draw';
  return homeGoals > awayGoals ? 'home' : 'away';
}

// ── Puntos por marcador de partido ───────────────────────────────────────────
function isKnockoutPhase(phase) {
  return ['r32', 'r16', 'qf', 'sf', 'third', 'final'].includes(phase);
}

function calculatePoints(prediction, result, match = {}) {
  if (!prediction || !result) {
    return { points: 0, reason: 'Sin resultado o sin pronóstico' };
  }

  const knockout = isKnockoutPhase(match.phase);
  const exactScore =
    prediction.homeGoals === result.homeGoals &&
    prediction.awayGoals === result.awayGoals;

  const predictedOutcome = getOutcome(prediction.homeGoals, prediction.awayGoals);
  const realOutcome = getOutcome(result.homeGoals, result.awayGoals);

  const predictionWinner = prediction.winner || null;
  const resultWinner = result.winner || null;
  const winnerCorrect = knockout && resultWinner && predictionWinner === resultWinner;

  if (knockout && realOutcome === 'draw') {
    if (exactScore && winnerCorrect) {
      return { points: 7, reason: 'Marcador exacto + clasificado correcto' };
    }

    if (exactScore && resultWinner && predictionWinner && !winnerCorrect) {
      return { points: 5, reason: 'Empate exacto, pero clasificado incorrecto' };
    }

    if (predictedOutcome === 'draw' && winnerCorrect) {
      return { points: 4, reason: 'Empate correcto + clasificado correcto' };
    }

    if (predictedOutcome === 'draw') {
      return { points: 3, reason: 'Empate correcto' };
    }
  }

  if (exactScore) {
    return { points: 7, reason: 'Marcador exacto' };
  }

  let points = 0;
  const reasons = [];

  if (predictedOutcome === realOutcome) {
    points += 3;
    reasons.push('Resultado correcto');
  }

  if (knockout && winnerCorrect && predictedOutcome !== realOutcome) {
    points += 1;
    reasons.push('Clasificado correcto');
  }

  if (prediction.homeGoals === result.homeGoals || prediction.awayGoals === result.awayGoals) {
    points += 1;
    reasons.push('Goles de un equipo exactos');
  }

  if (points === 0) return { points: 0, reason: 'Sin aciertos' };
  return { points, reason: reasons.join(' + ') };
}

// ── Puntos por clasificación a cada fase ─────────────────────────────────────
// r32=16vos · r16=8vos · qf=cuartos · sf=semis · final · champion
const ROUND_POINTS = { r32: 2, r16: 4, qf: 6, sf: 8, final: 10, champion: 15 };
const ROUND_LABELS = {
  r32: '16avos',
  r16: 'Octavos',
  qf: 'Cuartos',
  sf: 'Semifinal',
  final: 'Final',
  champion: 'Campeón'
};

function calculateClassificationPoints(userPreds, advancement) {
  let total = 0;
  const breakdown = [];

  for (const round of ['r32', 'r16', 'qf', 'sf', 'final']) {
    const adv = advancement[round];
    if (!adv || !adv.locked || !adv.teams.length) continue;

    const pred = userPreds.find((p) => p.round === round);
    if (!pred || !pred.teams.length) continue;

    const correct = pred.teams.filter((t) => adv.teams.includes(t)).length;
    const pts = correct * ROUND_POINTS[round];
    total += pts;
    if (correct > 0) breakdown.push({ round, label: ROUND_LABELS[round], correct, pts });
  }

  const champAdv = advancement.champion;
  if (champAdv && champAdv.locked && champAdv.team) {
    const pred = userPreds.find((p) => p.round === 'champion');
    if (pred && pred.teams[0] === champAdv.team) {
      total += 15;
      breakdown.push({ round: 'champion', label: 'Campeón', correct: 1, pts: 15 });
    }
  }

  return { total, breakdown };
}

module.exports = { calculatePoints, calculateClassificationPoints, ROUND_POINTS, ROUND_LABELS, isKnockoutPhase };
