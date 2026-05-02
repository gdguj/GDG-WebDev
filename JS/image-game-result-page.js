function getResultData() {
  const raw = sessionStorage.getItem('imageGameResult');
  if (!raw) {
    return {
      winner: 'تعادل',
      winnerKey: 'tie',
      teamNameA: 'الفريق الأول',
      teamNameB: 'الفريق الثاني',
      score: 0,
      scoreA: 0,
      scoreB: 0,
      correct: 0,
      totalWords: 0,
      time: '-'
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const teamNameA = parsed.teamNameA || 'الفريق الأول';
    const teamNameB = parsed.teamNameB || 'الفريق الثاني';
    const inferredWinnerKey = parsed.winnerKey ||
      (parsed.winner === teamNameA || parsed.winner === 'Team A' || parsed.winner === 'الفريق الأول' ? 'a' :
      parsed.winner === teamNameB || parsed.winner === 'Team B' || parsed.winner === 'الفريق الثاني' ? 'b' : 'tie');

    return {
      winner: parsed.winner || 'تعادل',
      winnerKey: inferredWinnerKey,
      teamNameA,
      teamNameB,
      score: Number(parsed.winnerScore ?? 0),
      scoreA: Number(parsed.scoreA ?? 0),
      scoreB: Number(parsed.scoreB ?? 0),
      correct: Number(parsed.correct ?? 0),
      totalWords: Number(parsed.totalWords ?? 0),
      time: '-'
    };
  } catch (err) {
    return {
      winner: 'تعادل',
      winnerKey: 'tie',
      teamNameA: 'الفريق الأول',
      teamNameB: 'الفريق الثاني',
      score: 0,
      scoreA: 0,
      scoreB: 0,
      correct: 0,
      totalWords: 0,
      time: '-'
    };
  }
}

const result = getResultData();

const scoreElement = document.querySelector('.js-score');
const scoreAElement = document.querySelector('.js-score-a');
const scoreBElement = document.querySelector('.js-score-b');
const teamALabelElement = document.querySelector('.js-team-a-label');
const teamBLabelElement = document.querySelector('.js-team-b-label');
const correctElement = document.querySelector('.js-correct');
const timeElement = document.querySelector('.js-time');
const winnerElement = document.querySelector('.js-winner');
const resultMessageElement = document.querySelector('.js-result-message');

scoreElement.innerText = result.score;
scoreAElement.innerText = result.scoreA;
scoreBElement.innerText = result.scoreB;
teamALabelElement.innerText = result.teamNameA;
teamBLabelElement.innerText = result.teamNameB;
if (correctElement) correctElement.innerText = result.correct;
if (timeElement) timeElement.innerText = result.time;
winnerElement.innerText = result.winner;
setResultMessage();
launchConfettiBursts();

function setResultMessage() {
  let resultMessage="";

  if (result.winnerKey === 'tie') {
    resultMessage = 'تعادل!';
  }
  else if(result.correct===0){
    resultMessage="لا تستسلم!";
  }
  else if(result.correct===1){
    resultMessage="بداية جميلة!";
  }
  else if(result.correct < result.totalWords){
      resultMessage="أحسنتم!";
  }
  else{
    resultMessage="ممتاز جدًا!";
  }

  const colors=["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

  resultMessageElement.innerHTML="";
  for(let i=0;i<resultMessage.length;i++){
    const span=document.createElement("span");
    span.style.color=colors[i % colors.length];
    span.textContent=resultMessage[i];
    resultMessageElement.appendChild(span);
  }
}

function launchConfettiBursts() {
  const layer = document.querySelector('.js-confetti-layer');
  if (!layer) return;

  const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
  const burstOrigins = [
    { x: 20, y: 14 },
    { x: 50, y: 10 },
    { x: 80, y: 14 },
  ];

  const spawnBurst = (origin, delayBase) => {
    for (let i = 0; i < 42; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = `${origin.x}vw`;
      piece.style.top = `${origin.y}vh`;
      piece.style.background = colors[i % colors.length];

      const dx = (Math.random() * 420 - 210).toFixed(0);
      const dy = (Math.random() * 260 + 210).toFixed(0);
      const rot = (Math.random() * 900 - 450).toFixed(0);
      const duration = Math.floor(Math.random() * 700 + 1000);
      const delay = Math.floor(delayBase + Math.random() * 300);

      piece.style.setProperty('--dx', `${dx}px`);
      piece.style.setProperty('--dy', `${dy}px`);
      piece.style.setProperty('--rot', `${rot}deg`);
      piece.style.animationDuration = `${duration}ms`;
      piece.style.animationDelay = `${delay}ms`;

      piece.addEventListener('animationend', () => piece.remove(), { once: true });
      layer.appendChild(piece);
    }
  };

  burstOrigins.forEach((origin, idx) => spawnBurst(origin, idx * 120));
  setTimeout(() => burstOrigins.forEach((origin, idx) => spawnBurst(origin, 200 + idx * 120)), 550);
}


