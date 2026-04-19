let questions = [];
let currentAnswers = [];

window.onload = () => {
  for(let i=0;i<4;i++) addAnswer();
};

// إضافة إجابة
function addAnswer(){
  const container = document.getElementById("answers");

  const div = document.createElement("div");
  div.className = "answer";

  div.innerHTML = `
    <input placeholder="الإجابة">
    <input type="number" placeholder="النقاط">
  `;

  container.appendChild(div);
}

// إضافة سؤال
function addQuestion(){
  const q = document.getElementById("question").value;
  const answers = document.querySelectorAll(".answer");

  let total = 0;
  let data = [];

  answers.forEach(a=>{
    const text = a.children[0].value;
    const points = parseInt(a.children[1].value) || 0;

    total += points;

    data.push({text,points});
  });

  if(total !== 100){
    alert("مجموع النقاط لازم = 100");
    return;
  }

  questions.push({q,data});

  // تصفير
  document.getElementById("question").value = "";
  document.getElementById("answers").innerHTML = "";

  for(let i=0;i<4;i++) addAnswer();

  document.getElementById("qNum").innerText = questions.length + 1;
}

// حفظ اللعبة
function saveGame(){
  if(questions.length === 0){
    alert("ضيف سؤال أول");
    return;
  }

  const id = Math.random().toString(36).substring(2,8).toUpperCase();

  document.getElementById("gameId").innerText = id;
  document.getElementById("popup").classList.remove("hidden");
}

// نسخ
function copyID(){
  const id = document.getElementById("gameId").innerText;
  navigator.clipboard.writeText(id);
}

// إغلاق
function closePopup(){
  document.getElementById("popup").classList.add("hidden");
}

// بدء اللعب
function startGame(){
  const id = document.getElementById("gameId").innerText;
  window.location.href = "FamilyFeud-SurveyLanding.html?id=" + id;
}


function addAnswer(){
  const container = document.getElementById("answers");

  const count = container.children.length + 1;

  const div = document.createElement("div");
  div.className = "answer";

  div.innerHTML = `
    <input placeholder="ادخل إجابة">
    <input type="number" placeholder="النقاط">
  `;

  container.appendChild(div);
}


