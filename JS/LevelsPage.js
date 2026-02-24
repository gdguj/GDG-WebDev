let selectedDifficulty = null;

const cards = document.querySelectorAll(".difficulty-card");
const startBtn = document.getElementById("startBtn");

cards.forEach(card => {
  card.addEventListener("click", () => {
    cards.forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedDifficulty = card.dataset.difficulty;
    startBtn.disabled = false;
  });
});

startBtn.addEventListener("click", () => {
  if(!selectedDifficulty) return;
  localStorage.setItem("difficulty", selectedDifficulty);
  window.location.href = "image-game.html";
});