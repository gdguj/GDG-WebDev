let colors = ["blue","green","yellow","red"];
let i = 0;

function addLetter(){
  let l = letter.value;

  if(!l) return;

  let box = document.createElement("div");
  box.className = "cell " + colors[i % 4];
  box.innerText = l;

  grid.appendChild(box);

  i++;

  letter.value="";
  question.value="";
  answer.value="";
}

function saveGame(){
  gameId.innerText = generateID();
  popup.classList.remove("hidden");

  // تغيير الكاركتر
  document.getElementById("character").src = "../Images/handsup.png";
  document.getElementById("character").style.transform = "translateY(-10px)";
}

function generateID(){
  let chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id="";
  for(let i=0;i<6;i++){
    id+=chars[Math.floor(Math.random()*chars.length)];
  }
  return id;
}

function copyID(){
  navigator.clipboard.writeText(gameId.innerText);
}

function closePopup(){
  popup.classList.add("hidden");

  // يرجع الكاركتر
  document.getElementById("character").src = "../Images/waiting.png";
}


function startGame(){
  const id = document.getElementById("gameId").textContent;
  window.location.href = `TeamSetUP.html?id=${id}`;
}