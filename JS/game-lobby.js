(function gameLobby() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role') || 'player'; // 'host' أو 'player'
  const gameId = params.get('gameId');
  const gameType = params.get('gameType');
  const joinCode = (params.get('code') || '').toUpperCase();

  // الـ sections
  const setupSection = document.getElementById('setupSection');
  const lobbySection = document.getElementById('lobbySection');
  const joinSection = document.getElementById('joinSection');
  const waitSection = document.getElementById('waitSection');
  const lobbyMsg = document.getElementById('lobbyMsg');

  function showMsg(text, isError) {
    if (!lobbyMsg) return;
    lobbyMsg.textContent = text || '';
    lobbyMsg.style.color = isError ? '#e74c3c' : '#2cb35d';
  }

  function getGameUrl(type, id, nameA, nameB, code, team) {
    const urls = {
      image_guessing: 'imageGame.html',
      letter_cells: 'LetterCellGame.html',
      survey_game: 'survey-game.html',
    };
    const base = urls[type] || 'main page.html';
    let url = `${base}?id=${encodeURIComponent(id)}&teamA=${encodeURIComponent(nameA)}&teamB=${encodeURIComponent(nameB)}`;
    if (code) url += `&joinCode=${encodeURIComponent(code)}`;
    if (team) url += `&team=${encodeURIComponent(team)}`;
    return url;
  }

  // ════════════════════════════════
  // HOST MODE
  // ════════════════════════════════
  if (role === 'host') {
    document.getElementById('lobbyTitle').textContent = 'إنشاء غرفة اللعبة';
    document.getElementById('lobbySubtitle').textContent = 'سمّ الفريقين ثم شارك الكود مع أصدقائك';
    setupSection.style.display = 'block';

    let currentCode = null;
    let pollTimer = null;

    const createBtn = document.getElementById('createLobbyBtn');
    const inputA = document.getElementById('inputTeamA');
    const inputB = document.getElementById('inputTeamB');

    createBtn.addEventListener('click', async () => {
      const nameA = inputA.value.trim() || 'أ';
      const nameB = inputB.value.trim() || 'ب';

      if (!gameId) {
        showMsg('لم يتم تحديد اللعبة. ارجع لصفحة ألعابي.', true);
        return;
      }

      createBtn.disabled = true;
      createBtn.textContent = 'جاري الإنشاء...';

      try {
        const authToken = localStorage.getItem('gdgAuthToken') || sessionStorage.getItem('gdgAuthToken');
        const userRaw = localStorage.getItem('gdgCurrentUser') || sessionStorage.getItem('gdgCurrentUser');
        const user = userRaw ? JSON.parse(userRaw) : {};
        const hostName = (user && user.name) ? user.name : 'المضيف';

        const res = await fetch('/api/lobby/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (authToken || ''),
          },
          body: JSON.stringify({ gameId, teamNameA: nameA, teamNameB: nameB, hostName }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'تعذر إنشاء الغرفة');

        currentCode = data.joinCode;
        setupSection.style.display = 'none';
        lobbySection.style.display = 'block';
        document.getElementById('codeDisplay').textContent = currentCode;

        // --- عرض اختيار الفريق للمضيف أيضاً ---
        showHostTeamChoice(nameA, nameB);

        // بدء polling كل 3 ثوانٍ
        pollLobby(nameA, nameB);
        pollTimer = setInterval(() => pollLobby(nameA, nameB), 3000);

        // لما المضيف يغلق/يخرج من الصفحة → ألغِ اللوبي
        window.addEventListener('beforeunload', cancelLobbyOnExit);

      } catch (err) {
        showMsg(err.message, true);
        createBtn.disabled = false;
        createBtn.textContent = 'إنشاء غرفة ومشاركة الكود';
      }
    });

    document.getElementById('copyCodeBtn').addEventListener('click', () => {
      if (!currentCode) return;
      navigator.clipboard.writeText(currentCode).then(() => {
        document.getElementById('copyCodeBtn').textContent = 'تم النسخ ✓';
        setTimeout(() => { document.getElementById('copyCodeBtn').textContent = 'نسخ الكود'; }, 2000);
      });
    });

    document.getElementById('startGameBtn').addEventListener('click', async () => {
      if (!currentCode) return;

      // المضيف لازم يكون اختار فريق
      const hostTeam = document.querySelector('.host-team-choice.selected');
      if (!hostTeam) {
        showMsg('اختر فريقك أنت أولاً قبل بدء اللعبة', true);
        return;
      }

      clearInterval(pollTimer);
      document.getElementById('startGameBtn').disabled = true;
      document.getElementById('startGameBtn').textContent = 'جاري البدء...';

      try {
        const res = await fetch('/api/lobby/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: currentCode }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'تعذر بدء اللعبة');

        const nameA = data.teamNameA || inputA.value.trim() || 'أ';
        const nameB = data.teamNameB || inputB.value.trim() || 'ب';
        // اللعبة بدأت → أزل listener الإلغاء (المضيف ذهب عن قصد)
        window.removeEventListener('beforeunload', cancelLobbyOnExit);
        window.location.href = getGameUrl(
          data.gameType,
          data.gameId,
          nameA,
          nameB,
          currentCode,
          hostTeam.getAttribute('data-team')
        );
      } catch (err) {
        showMsg(err.message, true);
        document.getElementById('startGameBtn').disabled = false;
        document.getElementById('startGameBtn').textContent = 'ابدأ اللعبة';
      }
    });

    async function pollLobby(nameA, nameB) {
      try {
        const res = await fetch('/api/lobby/info/' + currentCode);
        const data = await res.json();
        if (!data.success) return;

        if (data.status === 'started') {
          clearInterval(pollTimer);
          const selectedHostTeam = document.querySelector('.host-team-choice.selected');
          const hostTeamCode = selectedHostTeam ? selectedHostTeam.getAttribute('data-team') : '';
          window.location.href = getGameUrl(data.gameType, data.gameId, data.teamNameA, data.teamNameB, currentCode, hostTeamCode);
          return;
        }

        renderHostPlayers(data.players, data.teamNameA, data.teamNameB, nameA, nameB);
      } catch (_) {}
    }

    // دالة عرض اختيار الفريق للمضيف
    function showHostTeamChoice(nameA, nameB) {
      // إنشاء قسم اختيار الفريق للمضيف
      const hostChoiceDiv = document.createElement('div');
      hostChoiceDiv.id = 'hostTeamChoice';
      hostChoiceDiv.style.cssText = 'margin-top:20px; border-top:2px solid #eee; padding-top:18px;';
      hostChoiceDiv.innerHTML =
        '<p style="font-weight:700;color:#333;margin-bottom:10px;">اختر فريقك أنت:</p>' +
        '<div style="display:flex;gap:14px;">' +
          '<button class="host-team-choice team-choice-btn a" data-team="A" style="flex:1;padding:14px;border-radius:14px;border:3px solid #0078BF;background:#f8f9fa;color:#0078BF;font-family:Cairo,sans-serif;font-size:1rem;font-weight:700;cursor:pointer;">' +
            escapeHtml(nameA) +
          '</button>' +
          '<button class="host-team-choice team-choice-btn b" data-team="B" style="flex:1;padding:14px;border-radius:14px;border:3px solid #e74c3c;background:#f8f9fa;color:#e74c3c;font-family:Cairo,sans-serif;font-size:1rem;font-weight:700;cursor:pointer;">' +
            escapeHtml(nameB) +
          '</button>' +
        '</div>';

      document.getElementById('lobbySection').insertBefore(
        hostChoiceDiv,
        document.getElementById('lobbyStatusMsg')
      );

      // جلب اسم المضيف
      const userRaw = localStorage.getItem('gdgCurrentUser') || sessionStorage.getItem('gdgCurrentUser');
      let hostPlayerName = 'المضيف';
      if (userRaw) {
        try { const u = JSON.parse(userRaw); if (u && u.name) hostPlayerName = u.name; } catch (_) {}
      }

      hostChoiceDiv.querySelectorAll('.host-team-choice').forEach(btn => {
        btn.addEventListener('click', async function() {
          const team = this.getAttribute('data-team');
          hostChoiceDiv.querySelectorAll('.host-team-choice').forEach(b => {
            b.style.background = '#f8f9fa';
            b.style.color = b.getAttribute('data-team') === 'A' ? '#0078BF' : '#e74c3c';
            b.classList.remove('selected');
          });
          this.style.background = team === 'A' ? '#0078BF' : '#e74c3c';
          this.style.color = '#fff';
          this.classList.add('selected');

          // انضمام المضيف للفريق
          try {
            await fetch('/api/lobby/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: currentCode, playerName: hostPlayerName, team }),
            });
          } catch (_) {}
        });
      });
    }

    function renderHostPlayers(players, nameA, nameB) {
      const playersA = (players || []).filter(p => p.team === 'A');
      const playersB = (players || []).filter(p => p.team === 'B');

      document.getElementById('teamAHeader').innerHTML =
        `${escapeHtml(nameA)} <span class="count-badge">(${playersA.length}/4)</span>`;
      document.getElementById('teamBHeader').innerHTML =
        `${escapeHtml(nameB)} <span class="count-badge">(${playersB.length}/4)</span>`;

      const aEl = document.getElementById('teamAPlayers');
      const bEl = document.getElementById('teamBPlayers');

      if (playersA.length) {
        aEl.innerHTML = playersA.map(p => `<div class="player-chip">${escapeHtml(p.name)}</div>`).join('');
      } else {
        aEl.innerHTML = '<span class="empty-team">لا أحد بعد</span>';
      }

      if (playersB.length) {
        bEl.innerHTML = playersB.map(p => `<div class="player-chip">${escapeHtml(p.name)}</div>`).join('');
      } else {
        bEl.innerHTML = '<span class="empty-team">لا أحد بعد</span>';
      }

      const total = players ? players.length : 0;
      document.getElementById('lobbyStatusMsg').textContent =
        total ? `${total} لاعب انضم حتى الآن` : 'في انتظار انضمام اللاعبين...';
    }

    // إلغاء اللوبي عند خروج المضيف (يُستدعى من beforeunload)
    function cancelLobbyOnExit() {
      if (!currentCode) return;
      // navigator.sendBeacon مضمون يوصل حتى لو الصفحة بتغلق
      navigator.sendBeacon('/api/lobby/cancel', JSON.stringify({ code: currentCode }));
    }
  }

  // ════════════════════════════════
  // PLAYER MODE
  // ════════════════════════════════
  if (role === 'player') {
    document.getElementById('lobbyTitle').textContent = 'انضم للعبة';
    document.getElementById('lobbySubtitle').textContent = 'اختر فريقك وانتظر المضيف ليبدأ';

    if (!joinCode) {
      showMsg('لم يتم تحديد كود الانضمام.', true);
      return;
    }

    let selectedTeam = null;
    let lobbyData = null;
    let pollTimer = null;

    const choiceA = document.getElementById('choiceA');
    const choiceB = document.getElementById('choiceB');
    const joinBtn = document.getElementById('joinTeamBtn');
    const nameInput = document.getElementById('playerNameInput');

    // جلب اسم اللاعب من الـ auth
    const userRaw = localStorage.getItem('gdgCurrentUser') || sessionStorage.getItem('gdgCurrentUser');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        if (user && user.name) nameInput.value = user.name;
      } catch (_) {}
    }

    // تحميل معلومات اللوبي
    async function loadLobbyInfo() {
      try {
        const res = await fetch('/api/lobby/info/' + joinCode);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'الكود غير صحيح');

        if (data.status === 'started') {
          // اللعبة بدأت، انتقل مباشرة
          window.location.href = getGameUrl(data.gameType, data.gameId, data.teamNameA, data.teamNameB);
          return;
        }

        lobbyData = data;
        joinSection.style.display = 'block';
        document.getElementById('choiceAName').textContent = data.teamNameA || 'أ';
        document.getElementById('choiceBName').textContent = data.teamNameB || 'ب';
        updateTeamCounts(data.players);
      } catch (err) {
        showMsg(err.message, true);
      }
    }

    function updateTeamCounts(players) {
      const countA = (players || []).filter(p => p.team === 'A').length;
      const countB = (players || []).filter(p => p.team === 'B').length;
      document.getElementById('choiceACount').textContent = `${countA} / 4 لاعبين`;
      document.getElementById('choiceBCount').textContent = `${countB} / 4 لاعبين`;
    }

    choiceA.addEventListener('click', () => {
      selectedTeam = 'A';
      choiceA.classList.add('selected');
      choiceB.classList.remove('selected');
      joinBtn.disabled = !nameInput.value.trim();
    });

    choiceB.addEventListener('click', () => {
      selectedTeam = 'B';
      choiceB.classList.add('selected');
      choiceA.classList.remove('selected');
      joinBtn.disabled = !nameInput.value.trim();
    });

    nameInput.addEventListener('input', () => {
      joinBtn.disabled = !selectedTeam || !nameInput.value.trim();
    });

    joinBtn.addEventListener('click', async () => {
      const playerName = nameInput.value.trim();
      if (!playerName || !selectedTeam) return;

      joinBtn.disabled = true;
      joinBtn.textContent = 'جاري الانضمام...';

      try {
        const res = await fetch('/api/lobby/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: joinCode, playerName, team: selectedTeam }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'تعذر الانضمام');

        // انتقل لشاشة الانتظار
        joinSection.style.display = 'none';
        waitSection.style.display = 'block';
        const badge = document.getElementById('waitTeamBadge');
        badge.className = 'wait-team-badge ' + selectedTeam;
        const teamName = selectedTeam === 'A'
          ? (lobbyData && lobbyData.teamNameA) || 'أ'
          : (lobbyData && lobbyData.teamNameB) || 'ب';
        badge.textContent = 'الفريق: ' + teamName;

        // polling لمعرفة متى يبدأ المضيف
        pollTimer = setInterval(() => checkStarted(), 3000);

      } catch (err) {
        showMsg(err.message, true);
        joinBtn.disabled = false;
        joinBtn.textContent = 'انضم للفريق';
      }
    });

    async function checkStarted() {
      try {
        const res = await fetch('/api/lobby/info/' + joinCode);
        const data = await res.json();
        if (!data.success) return;
        if (data.status === 'started') {
          clearInterval(pollTimer);
          window.location.href = getGameUrl(data.gameType, data.gameId, data.teamNameA, data.teamNameB, joinCode, selectedTeam);
        }
      } catch (_) {}
    }

    loadLobbyInfo();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
