const mockValidIds = ["123", "456"];

const gameRoutes = {
  letter_cells: "LetterCellGame-Instructions.html",
  image_guessing: "imageGame-Instructions.html",
  survey_game: "survey-Instructions.html",
};

function getSelectedGameFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const selected = String(params.get("game") || "").trim();
  if (gameRoutes[selected]) {
    return selected;
  }
  return "";
}

const selectedGame = getSelectedGameFromQuery();

function checkGame() {
  const id = document.getElementById("gameId").value.trim();
  const card = document.getElementById("resultCard");
  const message = document.getElementById("cardMessage");

  if (id === "") return;


  card.classList.remove("hidden");

  card.classList.remove("show");

  setTimeout(() => {
    card.classList.add("show");

    if (mockValidIds.includes(id)) {
      card.classList.remove("error");
      card.classList.add("success");
      message.textContent = "جاهز للدخول الى اللعبة";
    } else {
      card.classList.remove("success");
      card.classList.add("error");
      message.textContent = "لا توجد لعبة بهذا الرمز";
    }
  }, 50);
}

// Enter key
const input = document.getElementById("gameId");

input.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    checkGame();
  }
});

const createBtn = document.querySelector(".create-btn");
if (createBtn) {
  createBtn.addEventListener("click", function () {
    const query = selectedGame ? "?game=" + encodeURIComponent(selectedGame) : "";
    window.location.href = "custom-game-selector.html" + query;
  });
}

const defaultBtn = document.querySelector(".default-btn");
if (defaultBtn) {
  defaultBtn.addEventListener("click", function () {
    const target = selectedGame ? gameRoutes[selectedGame] : "main page.html#games";
    window.location.href = target;
  });
}

const communityBtn = document.querySelector(".customized-btn");
if (communityBtn) {
  communityBtn.addEventListener("click", function () {
    const query = selectedGame ? "?game=" + encodeURIComponent(selectedGame) : "";
    window.location.href = "community-games-page.html" + query;
  });
}

const myGamesBtn = document.querySelector(".my-games-btn");
if (myGamesBtn) {
  myGamesBtn.addEventListener("click", function () {
    window.location.href = "my-games.html";
  });
}