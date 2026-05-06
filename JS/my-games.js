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
          '<button class="btn-delete" data-game-id="' + escapeHtml(String(game._id || "")) + '" title="حذف اللعبة"><i class="fa-solid fa-trash"></i></button>' +
        '</div>';

      gamesGrid.appendChild(card);
      
      const playBtn = card.querySelector('.btn-play');
      if (playBtn) {
        playBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          const gameId = this.getAttribute('data-game-id');
          const gameType = this.getAttribute('data-game-type');
          window.location.href = 'game-lobby.html?gameId=' + encodeURIComponent(gameId)
            + '&gameType=' + encodeURIComponent(gameType) + '&role=host';
        });
      }

      const deleteBtn = card.querySelector('.btn-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          const gameId = this.getAttribute('data-game-id');
          showDeleteConfirm(gameId, card);
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

  function showDeleteConfirm(gameId, cardElement) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:9999;direction:rtl';

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:18px;padding:36px 32px 28px;text-align:center;max-width:340px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,0.18)';

    box.innerHTML =
      '<div style="font-size:2.4rem;margin-bottom:12px">🗑️</div>' +
      '<h2 style="font-size:1.2rem;font-weight:800;color:#1a1a1a;margin:0 0 8px">حذف اللعبة</h2>' +
      '<p style="font-size:0.95rem;color:#555;margin:0 0 24px">هل أنت متأكد من حذف هذه اللعبة؟ لا يمكن التراجع عن هذا الإجراء.</p>' +
      '<div style="display:flex;gap:12px;justify-content:center">' +
        '<button id="confirmDeleteBtn" style="background:#ea4335;color:#fff;border:none;border-radius:10px;padding:11px 28px;font-size:0.95rem;font-weight:700;cursor:pointer">نعم، احذف</button>' +
        '<button id="cancelDeleteBtn" style="background:#f3f4f6;color:#333;border:none;border-radius:10px;padding:11px 28px;font-size:0.95rem;font-weight:700;cursor:pointer">إلغاء</button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    box.querySelector('#cancelDeleteBtn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    box.querySelector('#confirmDeleteBtn').addEventListener('click', async () => {
      overlay.remove();
      await deleteGame(gameId, cardElement);
    });
  }

  async function deleteGame(gameId, cardElement) {
    try {
      const response = await fetch('/api/custom-games/' + encodeURIComponent(gameId), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + authToken },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'تعذر حذف اللعبة.');
      }

      cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
      cardElement.style.opacity = '0';
      cardElement.style.transform = 'scale(0.95)';
      setTimeout(() => {
        cardElement.remove();
        const remaining = gamesGrid.querySelectorAll('.game-card').length;
        pageMessage.textContent = 'عدد ألعابك: ' + remaining;
        if (!remaining) {
          gamesGrid.innerHTML = '<div class="empty-state">لا توجد نتائج حالياً.</div>';
          pageMessage.textContent = 'لا توجد ألعاب أنشأتها بعد. أنشئ لعبتك الأولى الآن.';
        }
      }, 300);
    } catch (error) {
      alert(error.message || 'حدث خطأ أثناء الحذف.');
    }
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
