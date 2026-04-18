const mockValidIds = ["123", "456"];

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