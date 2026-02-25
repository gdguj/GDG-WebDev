const result={  //mock result
  score:12 ,
  correct:3,
  time:1.5,
  totalWords:5
}


const scoreElement=document.querySelector('.js-score');
const correctElement=document.querySelector('.js-correct');
const timeElement=document.querySelector('.js-time');
const resultMessageElement=document.querySelector('.js-result-message');

scoreElement.innerText=result.score;
correctElement.innerText=result.correct;
timeElement.innerText=result.time;
setResultMessage();

//message denpends on the score
function setResultMessage(){
  let resultMessage="";

  if(result.correct===0){
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


