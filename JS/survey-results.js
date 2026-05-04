function renderNoData() {
  const winnerName = document.getElementById("winnerName");
  const roundsList = document.getElementById("roundsList");

  winnerName.textContent = "لا توجد بيانات نتيجة";
  roundsList.innerHTML = '<div class="round-item">ابدأ لعبة جديدة لعرض النتائج هنا.</div>';
}

function parseResult() {
  const raw = sessionStorage.getItem("familyFeudFinalResult");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function renderRoundCard(round) {
  const stealText = round.stealAttempted
    ? (round.stealSuccessful
      ? `${round.stealByTeamLabel} سرق النقاط من ${round.stolenFromTeamLabel}`
      : `${round.stealByTeamLabel} حاول السرقة من ${round.stolenFromTeamLabel} لكنه فشل`)
    : "لا يوجد سرقة في هذه الجولة";

  const stealClass = round.stealAttempted
    ? (round.stealSuccessful ? "steal-ok" : "steal-fail")
    : "";

  return `
    <article class="round-item">
      <div class="round-head">
        <span>الجولة ${round.round}</span>
        <span>${round.winnerTeamLabel} +${round.pointsAwarded}</span>
      </div>
      <div class="round-reason">نهاية الجولة: ${round.endReason}</div>
      <div class="round-reason">السؤال: ${round.question || "-"}</div>
      <span class="steal-tag ${stealClass}">${stealText}</span>
    </article>
  `;
}

function renderResults(data) {
  const winnerName = document.getElementById("winnerName");
  const scoreA = document.getElementById("scoreA");
  const scoreB = document.getElementById("scoreB");
  const roundsPlayed = document.getElementById("roundsPlayed");
  const roundsList = document.getElementById("roundsList");

  winnerName.textContent = data.winnerLabel || "-";
  scoreA.textContent = data.scoreTeam1 ?? 0;
  scoreB.textContent = data.scoreTeam2 ?? 0;
  roundsPlayed.textContent = data.roundsPlayed ?? 0;

  const rounds = Array.isArray(data.rounds) ? data.rounds : [];
  if (rounds.length === 0) {
    roundsList.innerHTML = '<div class="round-item">لا توجد تفاصيل جولات محفوظة.</div>';
    return;
  }

  roundsList.innerHTML = rounds.map(renderRoundCard).join("");
}

const resultData = parseResult();
if (!resultData) {
  renderNoData();
} else {
  renderResults(resultData);
}
