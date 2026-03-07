let selectedDifficulty = null;

const cards = document.querySelectorAll(".difficulty-card");
const startBtn = document.getElementById("startBtn");
const teamANameInput = document.getElementById("teamANameInput");
const teamBNameInput = document.getElementById("teamBNameInput");

function sanitizeName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function updateStartState() {
  const hasDifficulty = Boolean(selectedDifficulty);
  const hasTeamA = Boolean(sanitizeName(teamANameInput.value));
  const hasTeamB = Boolean(sanitizeName(teamBNameInput.value));
  startBtn.disabled = !(hasDifficulty && hasTeamA && hasTeamB);
}

const savedA = localStorage.getItem('imageGameTeamNameA');
const savedB = localStorage.getItem('imageGameTeamNameB');
if (savedA) teamANameInput.value = savedA;
if (savedB) teamBNameInput.value = savedB;

teamANameInput.addEventListener('input', updateStartState);
teamBNameInput.addEventListener('input', updateStartState);

cards.forEach(card => {
  card.addEventListener("click", () => {
    cards.forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedDifficulty = card.dataset.difficulty;
    updateStartState();
  });
});

startBtn.addEventListener("click", () => {
  if (!selectedDifficulty) return;

  const teamAName = sanitizeName(teamANameInput.value);
  const teamBName = sanitizeName(teamBNameInput.value);
  if (!teamAName || !teamBName) return;

  localStorage.setItem("difficulty", selectedDifficulty);
  localStorage.setItem('imageGameTeamNameA', teamAName);
  localStorage.setItem('imageGameTeamNameB', teamBName);
  window.location.href = "imageGame.html";
});

updateStartState();