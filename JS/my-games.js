(function myGamesPage() {
  const gamesGrid = document.getElementById("gamesGrid");
  const pageMessage = document.getElementById("pageMessage");
  const typeFilter = document.getElementById("typeFilter");

  if (!gamesGrid || !pageMessage || !typeFilter) {
    return;
  }

  const authToken = localStorage.getItem("gdgAuthToken") || sessionStorage.getItem("gdgAuthToken");
  const gameTypeLabel = {
    letter_cells: "لعبة الحروف",
    image_guessing: "لعبة الصور",
    survey_game: "Family Feud",
  };

  if (!authToken) {
    window.location.href = "auth.html?redirect=" + encodeURIComponent("my-games.html");
    return;
  }

  typeFilter.addEventListener("change", () => {
    loadMyGames();
  });

  loadMyGames();

  async function loadMyGames() {
    pageMessage.textContent = "جاري تحميل ألعابك...";
    pageMessage.className = "page-message";
    gamesGrid.innerHTML = "";

    const selectedType = String(typeFilter.value || "all").trim();
    const query = selectedType !== "all" ? "?gameType=" + encodeURIComponent(selectedType) : "";

    try {
      const response = await fetch("/api/custom-games/mine" + query, {
        headers: {
          Authorization: "Bearer " + authToken,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "تعذر جلب الألعاب.");
      }

      const games = Array.isArray(result.games) ? result.games : [];
      renderGames(games);
    } catch (error) {
      pageMessage.textContent = error.message || "حدث خطأ أثناء تحميل الألعاب.";
      pageMessage.className = "page-message error-text";
      gamesGrid.innerHTML = "";
    }
  }

  function renderGames(games) {
    if (!games.length) {
      pageMessage.textContent = "لا توجد ألعاب أنشأتها بعد. أنشئ لعبتك الأولى الآن.";
      gamesGrid.innerHTML = '<div class="empty-state">لا توجد نتائج حالياً.</div>';
      return;
    }

    pageMessage.textContent = "عدد ألعابك: " + games.length;
    gamesGrid.innerHTML = "";

    games.forEach((game) => {
      const card = document.createElement("article");
      card.className = "game-card game-card--" + String(game.gameType || "unknown").replace(/_/g, "-");

      const questionsCount = getQuestionsCount(game.data);
      const createdAt = formatArabicDate(game.createdAt);
      const typeName = gameTypeLabel[game.gameType] || game.gameType || "غير معروف";
      const description = String(game.description || "بدون وصف").trim() || "بدون وصف";

      card.innerHTML =
        '<div class="game-top">' +
          '<h3 class="game-type">' + escapeHtml(typeName) + '</h3>' +
          '<span class="badge">مخصص</span>' +
        '</div>' +
        '<p class="game-title">' + escapeHtml(String(game.title || "بدون عنوان")) + '</p>' +
        '<p class="game-description">' + escapeHtml(description) + '</p>' +
        '<div class="game-meta">' +
          '<div>عدد الأسئلة: ' + questionsCount + '</div>' +
          '<div>تاريخ الإنشاء: ' + escapeHtml(createdAt) + '</div>' +
        '</div>' +
        '<div class="game-actions">' +
          '<button class="btn-play" data-game-id="' + escapeHtml(String(game._id || "")) + '" data-game-type="' + escapeHtml(String(game.gameType || "")) + '">العب</button>' +
        '</div>';

      gamesGrid.appendChild(card);
      
      const playBtn = card.querySelector('.btn-play');
      if (playBtn) {
        playBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          const gameId = this.getAttribute('data-game-id');
          const gameType = this.getAttribute('data-game-type');
          // انتقل لغرفة اللعبة (لوبي) بدلاً من الدخول المباشر
          window.location.href = 'game-lobby.html?gameId=' + encodeURIComponent(gameId)
            + '&gameType=' + encodeURIComponent(gameType) + '&role=host';
        });
      }
    });
  }

  function generateJoinCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function showJoinCodeModal(gameId) {
    const joinCode = generateJoinCode();
    
    const modal = document.createElement('div');
    modal.className = 'join-code-modal';
    modal.innerHTML = 
      '<div class="modal-backdrop"></div>' +
      '<div class="modal-content">' +
        '<div class="modal-header">' +
          '<h2>كود الانضمام</h2>' +
          '<button class="modal-close">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<p>شارك هذا الكود مع الآخرين للانضمام للعبة:</p>' +
          '<div class="join-code-display">' +
            '<code>' + escapeHtml(joinCode) + '</code>' +
            '<button class="btn-copy">نسخ</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.modal-close');
    const backdrop = modal.querySelector('.modal-backdrop');
    const copyBtn = modal.querySelector('.btn-copy');
    
    const closeModal = function() {
      modal.remove();
    };
    
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    
    copyBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(joinCode).then(() => {
        copyBtn.textContent = 'تم النسخ!';
        setTimeout(() => {
          copyBtn.textContent = 'نسخ';
        }, 2000);
      });
    });
  }

  function getQuestionsCount(data) {
    if (!data || !Array.isArray(data.questions)) {
      return 0;
    }
    return data.questions.length;
  }

  function formatArabicDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "غير متاح";
    }
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
