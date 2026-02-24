const playBtn = document.getElementById("playBtn");
const homeBtn = document.getElementById("homeBtn");

playBtn.addEventListener("click", () => {
  window.location.href = "GamePage.html";
});

homeBtn.addEventListener("click", () => {
  window.location.href = "../main page.html";
});