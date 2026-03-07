function getResultData() {
  const raw = sessionStorage.getItem('imageGameResult');
  if (!raw) {
    return {
      winner: 'Tie',
      winnerKey: 'tie',
      teamNameA: 'Team A',
      teamNameB: 'Team B',
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
    const teamNameA = parsed.teamNameA || 'Team A';
    const teamNameB = parsed.teamNameB || 'Team B';
    const inferredWinnerKey = parsed.winnerKey ||
      (parsed.winner === teamNameA || parsed.winner === 'Team A' ? 'a' :
      parsed.winner === teamNameB || parsed.winner === 'Team B' ? 'b' : 'tie');

    return {
      winner: parsed.winner || 'Tie',
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
      winner: 'Tie',
      winnerKey: 'tie',
      teamNameA: 'Team A',
      teamNameB: 'Team B',
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
correctElement.innerText = result.correct;
timeElement.innerText = result.time;
winnerElement.innerText = result.winner;
setResultMessage();

function setResultMessage() {
  let resultMessage="";

  if (result.winnerKey === 'tie') {
    resultMessage = 'IT IS A TIE!';
  }
  else if(result.correct===0){
    resultMessage="DON'T GIVE UP!"
  }
  else if(result.correct===1){
    resultMessage="NICE START!";
  }
  else if(result.correct < result.totalWords){
      resultMessage="GOOD JOB!";
  }
  else{
    resultMessage="OUTSTANDING!";
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


