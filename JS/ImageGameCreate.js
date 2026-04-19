function addQuestion(){

  let colors = ["red","blue","yellow","green"];
  let count = document.querySelectorAll(".question").length;

  let div = document.createElement("div");
  div.className = "question " + colors[count % 4];

 div.innerHTML = `
  <input placeholder="اكتب الإجابة">

  <input type="file" hidden>
  <button onclick="uploadImage(this)">ارفع صورة</button>

  <span>+</span>

  <input type="file" hidden>
  <button onclick="uploadImage(this)">ارفع صورة</button>
`;

  document.getElementById("questions").appendChild(div);
}
function uploadImage(btn){
  const input = btn.previousElementSibling;
  input.click();

  input.onchange = function(){
    if(input.files.length > 0){
      btn.innerText = input.files[0].name;
    }
  }
}

function saveGame(){
  const popup = document.getElementById("popup");
  const gameId = document.getElementById("gameId");

  const id = Math.random().toString(36).substring(2,8).toUpperCase();

  gameId.innerText = id;
  popup.classList.remove("hidden");
}

function closePopup(){
  document.getElementById("popup").classList.add("hidden");
}

function startGame(){
  const id = document.getElementById("gameId").innerText;
  window.location.href = "ImageGameLanding.html?id=" + id;
}

function copyID(){
  const id = document.getElementById("gameId").innerText;
  navigator.clipboard.writeText(id);
}

