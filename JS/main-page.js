(function () {
  const gameRoutes = {
    letter_cells: "LetterCellGame-Instructions.html",
    image_guessing: "imageGame-Instructions.html",
    survey_game: "survey-Instructions.html",
  };

  const authToken =
    localStorage.getItem("gdgAuthToken") ||
    sessionStorage.getItem("gdgAuthToken");
  const isAuthenticated = Boolean(authToken);

  function setJoinMessage(text, kind) {
    const message = document.getElementById("mainJoinCodeMessage");
    if (!message) return;
    message.textContent = text;
    message.className = kind === "error" ? "text-sm text-red-600" : "text-sm text-green-700";
  }

  function redirectToAuth(targetPath) {
    const authUrl = new URL("auth.html", window.location.href);
    if (targetPath) {
      authUrl.searchParams.set("redirect", targetPath);
    }
    window.location.href = authUrl.toString();
  }

  function ensureAuthenticated(targetPath) {
    if (isAuthenticated) {
      return true;
    }
    redirectToAuth(targetPath || "main page.html#games");
    return false;
  }

  function goToMultiplayerJoin() {
    if (!ensureAuthenticated("multiplayer-join.html")) {
      return;
    }
    window.location.href = "multiplayer-join.html";
  }

  function wireProtectedLink(anchor) {
    if (!anchor) return;
    const target = anchor.getAttribute("href") || "main page.html#games";
    anchor.addEventListener("click", function (event) {
      if (isAuthenticated) return;
      event.preventDefault();
      redirectToAuth(target);
    });
  }

  function wireProtectedCards() {
    const gameCards = document.querySelectorAll("#games .flip-card");
    gameCards.forEach(function (card) {
      const inlineTarget = card.getAttribute("onclick") || "";
      const match = inlineTarget.match(/window\.location\.href='([^']+)'/);
      const target = match && match[1] ? match[1] : "main page.html#games";

      card.removeAttribute("onclick");
      card.addEventListener("click", function (event) {
        event.preventDefault();
        if (!ensureAuthenticated(target)) {
          return;
        }
        window.location.href = target;
      });
    });

    const gameLinks = document.querySelectorAll("#games a[href]");
    gameLinks.forEach(wireProtectedLink);
  }

  function showOpenSections() {
    const playMethodsSection = document.getElementById("play-methods");
    if (playMethodsSection) playMethodsSection.classList.remove("hidden");
  }

  showOpenSections();
  wireProtectedCards();

  const communityBtn = document.getElementById("mainCommunityBtn");
  const joinBtn = document.getElementById("mainJoinCodeBtn");
  const joinInput = document.getElementById("mainJoinCodeInput");

  if (communityBtn) {
    communityBtn.addEventListener("click", function () {
      if (!ensureAuthenticated("multiplayer-home.html")) {
        return;
      }
      window.location.href = "multiplayer-home.html";
    });
  }

  if (joinBtn) {
    joinBtn.addEventListener("click", goToMultiplayerJoin);
  }

  if (joinInput) {
    joinInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        goToMultiplayerJoin();
      }
    });
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
    
    // Hide login button when already signed in
    const loginBtn = document.getElementById("nav-login-btn");
    if (loginBtn) loginBtn.classList.add("hidden");
  } catch (e) {}
})();
