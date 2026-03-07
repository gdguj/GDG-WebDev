const teamAInput = document.getElementById('landingTeamA');
const teamBInput = document.getElementById('landingTeamB');
const startButton = document.getElementById('imageGameStartBtn');

function sanitizeName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function saveAndStart() {
  const teamAName = sanitizeName(teamAInput.value);
  const teamBName = sanitizeName(teamBInput.value);

  if (!teamAName || !teamBName) {
    window.alert('Please write both team names first.');
    return;
  }

  localStorage.setItem('imageGameTeamNameA', teamAName);
  localStorage.setItem('imageGameTeamNameB', teamBName);
  window.location.href = 'imageGame.html';
}

const savedA = localStorage.getItem('imageGameTeamNameA');
const savedB = localStorage.getItem('imageGameTeamNameB');
if (savedA) teamAInput.value = savedA;
if (savedB) teamBInput.value = savedB;

startButton.addEventListener('click', saveAndStart);
