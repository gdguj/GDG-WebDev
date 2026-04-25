(function () {
  const gameRoutes = {
    letter_cells: "LetterCellGame-Instructions.html",
    image_guessing: "imageGame-Instructions.html",
    survey_game: "survey-Instructions.html",
  };

  function setJoinMessage(text, kind) {
    const message = document.getElementById("mainJoinCodeMessage");
    if (!message) return;
    message.textContent = text;
    message.className = kind === "error" ? "text-sm text-red-600" : "text-sm text-green-700";
  }

  async function openByCode() {
    const input = document.getElementById("mainJoinCodeInput");
    if (!input) return;

    const code = String(input.value || "").trim();
    if (!code) {
      setJoinMessage("أدخل رمز اللعبة أولاً.", "error");
      return;
    }

    setJoinMessage("جاري التحقق من الرمز...", "success");

    try {
      const response = await fetch("/api/custom-games/" + encodeURIComponent(code));
      const result = await response.json();

      if (!response.ok || !result.success || !result.game) {
        throw new Error("لا توجد لعبة بهذا الرمز.");
      }

      const gameType = String(result.game.gameType || "").trim();
      const route = gameRoutes[gameType];

      if (!route) {
        throw new Error("نوع اللعبة غير مدعوم.");
      }

      const target = new URL(route, window.location.href);
      target.searchParams.set("customGameId", String(result.game._id || code));
      window.location.href = target.toString();
    } catch (error) {
      setJoinMessage(error.message || "تعذر فتح اللعبة بهذا الرمز.", "error");
    }
  }

  const raw =
    localStorage.getItem("gdgCurrentUser") ||
    sessionStorage.getItem("gdgCurrentUser");
  if (!raw) return;
  try {
    const user = JSON.parse(raw);
    if (!user || !user.name) return;
    const greeting = document.getElementById("nav-greeting");
    const logoutBtn = document.getElementById("nav-logout-btn");
    const createGamesSection = document.getElementById("create-games");
    const playMethodsSection = document.getElementById("play-methods");
    const communityBtn = document.getElementById("mainCommunityBtn");
    const joinBtn = document.getElementById("mainJoinCodeBtn");
    const joinInput = document.getElementById("mainJoinCodeInput");
    
    if (greeting) {
      greeting.textContent = "مرحباً، " + user.name;
      greeting.classList.remove("hidden");
    }
    
    if (logoutBtn) {
      logoutBtn.classList.remove("hidden");
      logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("gdgAuthToken");
        localStorage.removeItem("gdgCurrentUser");
        sessionStorage.removeItem("gdgAuthToken");
        sessionStorage.removeItem("gdgCurrentUser");
        window.location.reload();
      });
    }
    
    if (createGamesSection) {
      createGamesSection.classList.remove("hidden");
    }

    if (playMethodsSection) {
      playMethodsSection.classList.remove("hidden");
    }

    if (communityBtn) {
      communityBtn.addEventListener("click", function () {
        window.location.href = "community-games-page.html";
      });
    }

    if (joinBtn) {
      joinBtn.addEventListener("click", openByCode);
    }

    if (joinInput) {
      joinInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          openByCode();
        }
      });
    }
    
    // Hide login button when already signed in
    const loginBtn = document.getElementById("nav-login-btn");
    if (loginBtn) loginBtn.classList.add("hidden");
  } catch (e) {}
})();
