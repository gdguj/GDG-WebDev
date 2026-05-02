(function multiplayerPlatform() {
  const body = document.body;
  const page = String(body.dataset.page || "").trim();

  const state = {
    userId: getOrCreateUserId(),
    playerName: localStorage.getItem("mpPlayerName") || "",
    session: readStoredSession(),
    socket: null,
    timerInterval: null,
    activeLetterIndex: null,
  };

  const el = {
    message: document.getElementById("mpMessage"),
  };

  if (!page) {
    return;
  }

  if (typeof window.io === "function") {
    state.socket = window.io();
  }

  if (page === "home") {
    initHomePage();
  }

  if (page === "join") {
    initJoinPage();
  }

  if (page === "waiting") {
    initWaitingPage();
  }

  if (page === "game") {
    initGamePage();
  }

  if (page === "result") {
    initResultPage();
  }

  if (page === "leaderboard") {
    initLeaderboardPage();
  }

  function getOrCreateUserId() {
    const existing = localStorage.getItem("mpUserId");
    if (existing && /^[a-f0-9]{24}$/i.test(existing)) {
      return existing;
    }

    const chars = "abcdef0123456789";
    let value = "";
    for (let i = 0; i < 24; i += 1) {
      value += chars[Math.floor(Math.random() * chars.length)];
    }
    localStorage.setItem("mpUserId", value);
    return value;
  }

  function readStoredSession() {
    try {
      const raw = localStorage.getItem("mpCurrentSession");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function storeSession(session) {
    state.session = session;
    localStorage.setItem("mpCurrentSession", JSON.stringify(session));
  }

  function setMessage(text, isError) {
    if (!el.message) {
      return;
    }
    el.message.textContent = text || "";
    el.message.style.color = isError ? "#d94a4a" : "#1e9b62";
  }

  async function api(path, options) {
    const response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "فشل تنفيذ الطلب");
    }
    return payload.data;
  }

  function formatStatus(status) {
    if (status === "waiting") return "انتظار";
    if (status === "in-progress") return "قيد التقدم";
    if (status === "finished") return "منتهية";
    return status || "غير معروف";
  }

  function subscribeToSessionRooms(session) {
    if (!state.socket || !session) {
      return;
    }

    state.socket.emit("session:subscribe", {
      joinCode: session.joinCode,
      sessionId: session._id,
    });
  }

  function attachRealtime(handler) {
    if (!state.socket) {
      return;
    }

    state.socket.on("session:created", handler);
    state.socket.on("session:updated", handler);
    state.socket.on("session:started", handler);
    state.socket.on("session:finished", handler);
  }

  async function refreshSession(sessionId) {
    const session = await api("/api/session/" + encodeURIComponent(sessionId));
    storeSession(session);
    return session;
  }

  function statusClass(status) {
    if (status === "finished") return "status-pill status-finished";
    if (status === "in-progress") return "status-pill status-progress";
    return "status-pill status-waiting";
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function getSignedInUserName() {
    const raw = localStorage.getItem("gdgCurrentUser") || sessionStorage.getItem("gdgCurrentUser");

    if (raw) {
      try {
        const user = JSON.parse(raw);
        const name = String((user && user.name) || "").trim();
        if (name) {
          state.playerName = name;
          localStorage.setItem("mpPlayerName", name);
          return name;
        }
      } catch (error) {
      }
    }

    const fallbackName = String(state.playerName || "").trim();
    if (fallbackName) {
      return fallbackName;
    }

    throw new Error("تعذر تحديد اسم المستخدم. يرجى تسجيل الدخول مرة أخرى.");
  }

  function getSignedInUserProfile() {
    const raw = localStorage.getItem("gdgCurrentUser") || sessionStorage.getItem("gdgCurrentUser");
    if (!raw) {
      throw new Error("تعذر تحديد بيانات المستخدم. يرجى تسجيل الدخول مرة أخرى.");
    }

    try {
      const user = JSON.parse(raw);
      const name = String((user && user.name) || "").trim();
      const email = String((user && user.email) || "").trim().toLowerCase();
      if (!name || !email) {
        throw new Error("تعذر تحديد بيانات المستخدم. يرجى تسجيل الدخول مرة أخرى.");
      }
      return { name, email };
    } catch (error) {
      throw new Error("تعذر تحديد بيانات المستخدم. يرجى تسجيل الدخول مرة أخرى.");
    }
  }

  function initHomePage() {
    const createCustomTopBtn = document.getElementById("createCustomTop");
    const jumpJoinBtn = document.getElementById("jumpJoin");
    const jumpCommunityBtn = document.getElementById("jumpCommunity");

    if (createCustomTopBtn) {
      createCustomTopBtn.addEventListener("click", () => {
        window.location.href = "custom-game-selector.html";
      });
    }

    if (jumpJoinBtn) {
      jumpJoinBtn.addEventListener("click", () => {
        window.location.href = "multiplayer-join.html";
      });
    }

    if (jumpCommunityBtn) {
      jumpCommunityBtn.addEventListener("click", () => {
        window.location.href = "community-games-page.html";
      });
    }

  }

  function initJoinPage() {
    const codeInput = document.getElementById("joinCode");
    const joinBtn = document.getElementById("joinBtn");

    if (!joinBtn) return;

    joinBtn.addEventListener("click", async () => {
      try {
        setMessage("", false);
        const joinCode = String(codeInput.value || "").trim().toUpperCase();

        if (!joinCode) {
          throw new Error("كود الانضمام مطلوب.");
        }

        // --- التعديل هنا: نستخدم الـ API اللي سويناه اليوم ---
        // نرسل طلب للباك اند عشان نتحقق من الكود ونعرف نوع اللعبة
        const response = await fetch(`/api/lobby/verify/${joinCode}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "الجلسة غير موجودة.");
        }

        // تخزين البيانات عشان اللعبة تقرأها
        storeSession(result); 

        // التوجيه لغرفة اللوبي (اختيار الفريق) بدلاً من الدخول المباشر للعبة
        window.location.href = `game-lobby.html?code=${encodeURIComponent(joinCode)}&role=player`;

      } catch (error) {
        setMessage(error.message, true);
      }
    });
  }

  async function initWaitingPage() {
    const sessionCode = document.getElementById("sessionCode");
    const status = document.getElementById("sessionStatus");
    const playersRows = document.getElementById("playersRows");
    const readyBtn = document.getElementById("readyBtn");
    const startBtn = document.getElementById("startBtn");
    const copyCodeBtn = document.getElementById("copyCodeBtn");
    const shareCodeBtn = document.getElementById("shareCodeBtn");
    const hostIndicator = document.getElementById("hostIndicator");
    const hostOnlyHint = document.getElementById("hostOnlyHint");

    const sessionId = new URLSearchParams(window.location.search).get("sessionId") || (state.session && state.session._id);
    const params = new URLSearchParams(window.location.search);

    if (!sessionId) {
      setMessage("لا توجد جلسة محددة.", true);
      return;
    }

    const render = (session) => {
      sessionCode.textContent = session.joinCode;
      status.className = statusClass(session.status);
      status.textContent = formatStatus(session.status);
      hostIndicator.textContent = session.createdBy && session.createdBy.name ? session.createdBy.name : "-";
      playersRows.innerHTML = "";

      const isHost = String((session.createdBy && session.createdBy.userId) || "") === String(state.userId);
      startBtn.disabled = !isHost;
      startBtn.style.opacity = isHost ? "1" : "0.55";
      hostOnlyHint.textContent = isHost
        ? "أنت المضيف. يمكنك بدء اللعبة بعد جاهزية جميع اللاعبين."
        : "يمكن للمضيف فقط بدء اللعبة بعد جاهزية جميع اللاعبين.";

      session.players.forEach((player) => {
        const row = document.createElement("div");
        row.className = "player-row";
        row.innerHTML =
          '<span>' + escapeHtml(player.name) + '</span>' +
          '<span class="small">' + (player.isReady ? "جاهز" : "غير جاهز") + '</span>';
        playersRows.appendChild(row);
      });

      if (session.status === "in-progress") {
        window.location.href = "multiplayer-game.html?sessionId=" + encodeURIComponent(session._id);
      }

      if (session.status === "finished") {
        window.location.href = "multiplayer-result.html?sessionId=" + encodeURIComponent(session._id);
      }
    };

    const session = await refreshSession(sessionId);
    render(session);
    subscribeToSessionRooms(session);

    if (params.get("created") === "1") {
      setMessage("تم إنشاء الجلسة بنجاح. شارك الكود مع اللاعبين.", false);
    }

    if (params.get("joined") === "1") {
      setMessage("تم الانضمام للجلسة بنجاح.", false);
    }

    if (copyCodeBtn) {
      copyCodeBtn.addEventListener("click", async () => {
        try {
          const code = String((state.session && state.session.joinCode) || "");
          if (!code) return;
          await navigator.clipboard.writeText(code);
          setMessage("تم نسخ كود الانضمام.", false);
        } catch (error) {
          setMessage("تعذر نسخ الكود على هذا المتصفح.", true);
        }
      });
    }

    if (shareCodeBtn) {
      shareCodeBtn.addEventListener("click", async () => {
        const current = state.session;
        if (!current) {
          return;
        }

        const shareText = "انضم إلى جلستي في منصة الألعاب الجماعية باستخدام الكود: " + current.joinCode;
        try {
          if (navigator.share) {
            await navigator.share({ title: "دعوة للعبة", text: shareText });
            setMessage("تم فتح خيارات المشاركة.", false);
            return;
          }

          await navigator.clipboard.writeText(shareText);
          setMessage("تم نسخ رسالة المشاركة.", false);
        } catch (error) {
          setMessage("تعذر مشاركة الكود حالياً.", true);
        }
      });
    }

    attachRealtime((updated) => {
      if (String(updated._id) !== String(sessionId)) {
        return;
      }
      storeSession(updated);
      render(updated);
    });

    readyBtn.addEventListener("click", async () => {
      try {
        const current = state.session || session;
        const me = current.players.find((player) => String(player.userId) === String(state.userId));
        const targetReady = !(me && me.isReady);

        const updated = await api("/api/session/ready", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            userId: state.userId,
            isReady: targetReady,
          }),
        });
        storeSession(updated);
        render(updated);
      } catch (error) {
        setMessage(error.message, true);
      }
    });

    startBtn.addEventListener("click", async () => {
      try {
        const updated = await api("/api/session/start", {
          method: "POST",
          body: JSON.stringify({ sessionId, userId: state.userId }),
        });
        storeSession(updated);
        render(updated);
      } catch (error) {
        setMessage(error.message, true);
      }
    });
  }

  async function initGamePage() {
    const status = document.getElementById("gameStatus");
    const scoreRows = document.getElementById("scoreRows");
    const questionText = document.getElementById("questionText");
    const hintText = document.getElementById("hintText");
    const answerInput = document.getElementById("answerInput");
    const submitBtn = document.getElementById("submitAnswerBtn");
    const nextBtn = document.getElementById("nextQuestionBtn");
    const finishBtn = document.getElementById("finishGameBtn");
    const timerNode = document.getElementById("timer");
    const visualArea = document.getElementById("visualArea");
    const surveyMatches = document.getElementById("surveyMatches");

    const sessionId = new URLSearchParams(window.location.search).get("sessionId") || (state.session && state.session._id);
    if (!sessionId) {
      setMessage("لا توجد جلسة محددة.", true);
      return;
    }

    const renderScoreboard = (session) => {
      scoreRows.innerHTML = "";
      session.players
        .slice()
        .sort((a, b) => b.score - a.score)
        .forEach((player) => {
          const row = document.createElement("div");
          row.className = "score-row";
          row.innerHTML =
            '<span>' + escapeHtml(player.name) + '</span>' +
            '<strong>' + Number(player.score || 0) + '</strong>';
          scoreRows.appendChild(row);
        });
    };

    const renderQuestion = (session) => {
      status.className = statusClass(session.status);
      status.textContent = formatStatus(session.status);

      if (session.status === "finished") {
        window.location.href = "multiplayer-result.html?sessionId=" + encodeURIComponent(session._id);
        return;
      }

      const questions = (((session.gameSnapshot || {}).data || {}).questions) || [];
      const index = state.activeLetterIndex !== null
        ? Number(state.activeLetterIndex)
        : Number((session.currentState || {}).currentQuestionIndex || 0);
      const q = questions[index];
      visualArea.innerHTML = "";
      if (surveyMatches) {
        surveyMatches.innerHTML = "";
      }

      if (!q) {
        questionText.textContent = "لا توجد أسئلة إضافية.";
        hintText.textContent = "";
        return;
      }

      if (session.gameType === "image_guessing") {
        questionText.textContent = "خمن العبارة من الصور";
        hintText.textContent = q.hint ? "تلميح: " + q.hint : "";

        const pair = document.createElement("div");
        pair.className = "img-pair";
        if (q.imageOne) {
          const imgOne = document.createElement("img");
          imgOne.src = q.imageOne;
          pair.appendChild(imgOne);
        }
        if (q.imageTwo) {
          const imgTwo = document.createElement("img");
          imgTwo.src = q.imageTwo;
          pair.appendChild(imgTwo);
        }
        visualArea.appendChild(pair);
      }

      if (session.gameType === "letter_cells") {
        const grid = document.createElement("div");
        grid.className = "letter-grid";
        questions.forEach((item, cellIndex) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "letter-cell" + (cellIndex === index ? " active" : "");
          button.textContent = String(item.letter || "?").toUpperCase();
          button.addEventListener("click", () => {
            state.activeLetterIndex = cellIndex;
            renderQuestion(session);
          });
          grid.appendChild(button);
        });
        visualArea.appendChild(grid);

        questionText.textContent = (q.letter ? "[" + q.letter + "] " : "") + (q.question || "سؤال");
        hintText.textContent = "أجب على خلية الحرف لتحصل على نقاط.";
      }

      if (session.gameType === "survey_game") {
        questionText.textContent = q.question || "سؤال الاستبيان";
        const revealedAnswers = ((session.currentState || {}).revealedAnswers || []);
        const revealed = revealedAnswers.length;
        const total = Array.isArray(q.answers) ? q.answers.length : 0;
        hintText.textContent = "الإجابات المكشوفة: " + revealed + " / " + total;

        if (surveyMatches) {
          const answerMap = new Map((q.answers || []).map((item) => [normalizeText(item.text), item]));
          if (!revealedAnswers.length) {
            const empty = document.createElement("div");
            empty.className = "small";
            empty.textContent = "لا توجد إجابات مكشوفة بعد.";
            surveyMatches.appendChild(empty);
          } else {
            revealedAnswers.forEach((key) => {
              const matched = answerMap.get(normalizeText(key));
              const row = document.createElement("div");
              row.className = "survey-answer";
              row.innerHTML =
                '<span>' + escapeHtml((matched && matched.text) || key) + '</span>' +
                '<strong>' + Number((matched && matched.points) || 0) + ' نقطة</strong>';
              surveyMatches.appendChild(row);
            });
          }
        }
      }

      updateTimer(session);
    };

    const updateTimer = (session) => {
      clearInterval(state.timerInterval);
      const endsAt = session.currentState && session.currentState.questionEndsAt;
      if (!endsAt) {
        timerNode.textContent = "-";
        return;
      }

      const end = new Date(endsAt).getTime();
      const tick = () => {
        const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        timerNode.textContent = String(left);
      };

      tick();
      state.timerInterval = setInterval(tick, 500);
    };

    const render = (session) => {
      renderScoreboard(session);
      renderQuestion(session);
    };

    const initial = await refreshSession(sessionId);
    render(initial);
    subscribeToSessionRooms(initial);

    attachRealtime((updated) => {
      if (String(updated._id) !== String(sessionId)) {
        return;
      }
      storeSession(updated);
      render(updated);
    });

    submitBtn.addEventListener("click", async () => {
      try {
        const current = state.session || initial;
        const currentIndex = Number(current.currentState.currentQuestionIndex || 0);
        const questions = (((current.gameSnapshot || {}).data || {}).questions) || [];
        const question = questions[currentIndex] || {};

        const payload = {
          sessionId,
          userId: state.userId,
          answer: String(answerInput.value || "").trim(),
          currentQuestionIndex:
            current.gameType === "letter_cells" && state.activeLetterIndex !== null
              ? Number(state.activeLetterIndex)
              : currentIndex,
        };

        if (current.gameType === "letter_cells") {
          payload.letter = question.letter || "";
        }

        const result = await api("/api/game/answer", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        storeSession(result.session);
        state.activeLetterIndex = null;
        render(result.session);
        setMessage(result.isCorrect ? "إجابة صحيحة!" : "الإجابة غير صحيحة حتى الآن.", !result.isCorrect);
      } catch (error) {
        setMessage(error.message, true);
      }
    });

    nextBtn.addEventListener("click", async () => {
      try {
        const current = state.session || initial;
        const currentIndex = Number(current.currentState.currentQuestionIndex || 0);
        const result = await api("/api/game/answer", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            userId: state.userId,
            answer: "",
            currentQuestionIndex:
              current.gameType === "letter_cells" && state.activeLetterIndex !== null
                ? Number(state.activeLetterIndex)
                : currentIndex,
            advanceQuestion: true,
          }),
        });

        storeSession(result.session);
        state.activeLetterIndex = null;
        render(result.session);
      } catch (error) {
        setMessage(error.message, true);
      }
    });

    finishBtn.addEventListener("click", async () => {
      try {
        await api("/api/session/finish", {
          method: "POST",
          body: JSON.stringify({ sessionId }),
        });
        window.location.href = "multiplayer-result.html?sessionId=" + encodeURIComponent(sessionId);
      } catch (error) {
        setMessage(error.message, true);
      }
    });
  }

  async function initResultPage() {
    const winner = document.getElementById("winnerName");
    const status = document.getElementById("resultStatus");
    const scoreRows = document.getElementById("resultScores");
    const playAgainBtn = document.getElementById("playAgainBtn");
    const backHomeBtn = document.getElementById("backHomeBtn");

    const sessionId = new URLSearchParams(window.location.search).get("sessionId") || (state.session && state.session._id);
    if (!sessionId) {
      setMessage("لا توجد جلسة محددة.", true);
      return;
    }

    const data = await api("/api/session/" + encodeURIComponent(sessionId));
    if (data.status !== "finished") {
      await api("/api/session/finish", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
    }

    const session = await refreshSession(sessionId);
    status.className = statusClass(session.status);
    status.textContent = formatStatus(session.status);
    winner.textContent = (session.winner && session.winner.name) || "لا يوجد فائز";

    scoreRows.innerHTML = "";
    session.players
      .slice()
      .sort((a, b) => b.score - a.score)
      .forEach((player) => {
        const row = document.createElement("div");
        row.className = "score-row";
        row.innerHTML =
          '<span>' + escapeHtml(player.name) + '</span>' +
          '<strong>' + Number(player.score || 0) + '</strong>';
        scoreRows.appendChild(row);
      });

    if (playAgainBtn) {
      playAgainBtn.addEventListener("click", async () => {
        try {
          const source =
            session.gameSnapshot && session.gameSnapshot.source === "userGames"
              ? "user"
              : "template";
          const profile = getSignedInUserProfile();

          const newSession = await api("/api/session/create", {
            method: "POST",
            body: JSON.stringify({
              gameId: session.gameId,
              gameSource: source,
              createdBy: {
                userId: state.userId,
                name: profile.name,
                email: profile.email,
              },
              settings: {
                maxPlayers: session.settings && session.settings.maxPlayers ? session.settings.maxPlayers : 8,
                timePerQuestion:
                  session.settings && session.settings.timePerQuestion ? session.settings.timePerQuestion : 30,
                joinCodeLength: 6,
              },
            }),
          });

          storeSession(newSession);
          window.location.href =
            "multiplayer-waiting.html?sessionId=" + encodeURIComponent(newSession._id) + "&created=1";
        } catch (error) {
          setMessage(error.message, true);
        }
      });
    }

    if (backHomeBtn) {
      backHomeBtn.addEventListener("click", () => {
        window.location.href = "multiplayer-home.html";
      });
    }
  }

  async function initLeaderboardPage() {
    const rows = document.getElementById("leaderboardRows");
    const typeFilter = document.getElementById("leaderboardType");
    const topName = document.getElementById("leaderboardTopName");
    const topScore = document.getElementById("leaderboardTopScore");
    const topCard = document.getElementById("leaderboardTopCard");

    const gameLabels = {
      image_guessing: "لعبة الصور",
      letter_cells: "خلية الحروف",
      survey_game: "فاميلي فيود",
    };

    function gameLabelForType(type) {
      const key = String(type || "").trim();
      return gameLabels[key] || "كل الألعاب";
    }

    function makeHandle(entry, rank) {
      const email = String(entry && entry.email ? entry.email : "").trim();
      if (email.includes("@")) {
        return "@" + email.split("@")[0];
      }
      return "@player_" + String(rank).padStart(2, "0");
    }

    function updateTopCard(board) {
      if (!topName || !topScore || !topCard) return;

      if (!Array.isArray(board) || board.length === 0) {
        topName.textContent = "—";
        topScore.textContent = "0";
        topCard.classList.add("is-empty");
        return;
      }

      const topEntry = board[0];
      topName.textContent = topEntry.name || "لاعب";
      topScore.textContent = new Intl.NumberFormat("en-US").format(Number(topEntry.totalScore || 0));
      topCard.classList.remove("is-empty");
    }

    function makeRow(entry, index) {
      const rank = String(index + 1).padStart(2, "0");
      const name = escapeHtml(entry.name || "لاعب");
      const score = new Intl.NumberFormat("en-US").format(Number(entry.totalScore || 0));
      const gameType = gameLabelForType(entry.gameType);
      const avatar = name.charAt(0);
      const handle = escapeHtml(makeHandle(entry, index + 1));

      return (
        '<div class="score-row" data-rank="' + rank + '">' +
          '<div class="leaderboard-rank-badge">' + rank + '</div>' +
          '<div class="leaderboard-player-cell">' +
            '<div class="leaderboard-avatar" aria-hidden="true">' + avatar + '</div>' +
            '<div class="leaderboard-player-text">' +
              '<strong class="leaderboard-player-name">' + name + '</strong>' +
              '<span class="leaderboard-player-handle">' + handle + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="leaderboard-game-pill">' + gameType + '</div>' +
          '<strong class="leaderboard-score-value">' + score + '</strong>' +
        '</div>'
      );
    }

    async function load() {
      try {
        const type = String(typeFilter.value || "").trim();
        const query = type
          ? "?gameType=" + encodeURIComponent(type) + "&limit=10"
          : "?limit=10";
        const board = await api("/api/leaderboard" + query);

        setMessage("", false);
        rows.innerHTML = "";

        if (!board.length) {
          rows.innerHTML = '<div class="small">لا توجد نتائج بعد.</div>';
          updateTopCard([]);
          return;
        }

        rows.innerHTML = board.slice(0, 10).map(makeRow).join("");
        updateTopCard(board);
      } catch (error) {
        setMessage(error.message, true);
        rows.innerHTML = '<div class="small">تعذر تحميل البيانات حالياً.</div>';
        updateTopCard([]);
      }
    }

    typeFilter.addEventListener("change", load);
    load();
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
