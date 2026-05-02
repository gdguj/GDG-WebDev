const teamAInput  = document.getElementById('landingTeamA');
const teamBInput  = document.getElementById('landingTeamB');
const startButton = document.getElementById('imageGameStartBtn');
const levelsGrid  = document.getElementById('levelsGrid');
const levelsDots  = document.getElementById('levelsDots');
const prevBtn     = document.getElementById('levelsPrev');
const nextBtn     = document.getElementById('levelsNext');

const PAGE_SIZE = 6; // 3 columns × 2 rows
let allTemplates      = [];
let currentPage       = 0;
let selectedTemplateId = null;

/* ── أسماء محفوظة ── */
const savedA = localStorage.getItem('imageGameTeamNameA');
const savedB = localStorage.getItem('imageGameTeamNameB');
if (savedA) teamAInput.value = savedA;
if (savedB) teamBInput.value = savedB;

/* ── زر البداية ── */
function updateStartBtn() {
  const hasA     = sanitizeName(teamAInput.value).length > 0;
  const hasB     = sanitizeName(teamBInput.value).length > 0;
  const hasLevel = Boolean(selectedTemplateId);
  startButton.disabled = !(hasA && hasB && hasLevel);
}
teamAInput.addEventListener('input', updateStartBtn);
teamBInput.addEventListener('input', updateStartBtn);

function sanitizeName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

/* ── عرض صفحة المراحل ── */
function renderPage(page) {
  currentPage = page;
  const totalPages = Math.ceil(allTemplates.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const slice = allTemplates.slice(start, start + PAGE_SIZE);

  levelsGrid.innerHTML = '';
  slice.forEach((tpl, i) => {
    const globalIndex = start + i;
    const qCount = tpl.data && Array.isArray(tpl.data.questions) ? tpl.data.questions.length : 0;

    const card = document.createElement('div');
    card.className = 'level-card' + (tpl._id === selectedTemplateId ? ' selected' : '');
    card.dataset.id = tpl._id;
    card.innerHTML = `
      <div class="level-number">المرحلة ${globalIndex + 1}</div>
      <div class="level-title">${escapeHtml(tpl.title || 'بدون عنوان')}</div>
      <div class="level-desc">${escapeHtml(tpl.description || '')}</div>
      <div class="level-meta">🖼 ${qCount} سؤال</div>
    `;
    card.addEventListener('click', () => selectLevel(card, tpl._id));
    levelsGrid.appendChild(card);
  });

  /* نقاط التنقل */
  levelsDots.innerHTML = '';
  for (let p = 0; p < totalPages; p++) {
    const dot = document.createElement('span');
    dot.className = 'levels-dot' + (p === page ? ' active' : '');
    dot.addEventListener('click', () => renderPage(p));
    levelsDots.appendChild(dot);
  }

  prevBtn.disabled = page === 0;
  nextBtn.disabled = page >= totalPages - 1;
}

prevBtn.addEventListener('click', () => renderPage(currentPage - 1));
nextBtn.addEventListener('click', () => renderPage(currentPage + 1));

function selectLevel(card, id) {
  levelsGrid.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedTemplateId = id;
  updateStartBtn();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── جلب المراحل ── */
async function loadLevels() {
  try {
    const res    = await fetch('/api/games/templates?gameType=image_guessing');
    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.message || 'فشل جلب المراحل');

    allTemplates = Array.isArray(result.data) ? result.data : [];

    if (!allTemplates.length) {
      levelsGrid.innerHTML = '<div class="levels-error">لا توجد مراحل متاحة حالياً.</div>';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    /* استعادة المرحلة المحفوظة */
    const savedId = localStorage.getItem('imageGameTemplateId');
    if (savedId) {
      selectedTemplateId = savedId;
      const savedIndex = allTemplates.findIndex(t => t._id === savedId);
      if (savedIndex !== -1) {
        currentPage = Math.floor(savedIndex / PAGE_SIZE);
      }
    }

    renderPage(currentPage);
    updateStartBtn();

  } catch (err) {
    levelsGrid.innerHTML = `<div class="levels-error">تعذّر تحميل المراحل: ${escapeHtml(err.message)}</div>`;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  }
}

/* ── البداية ── */
function saveAndStart() {
  const teamAName = sanitizeName(teamAInput.value);
  const teamBName = sanitizeName(teamBInput.value);
  if (!teamAName || !teamBName) { window.alert('اكتب أسماء الفريقين أولاً.'); return; }
  if (!selectedTemplateId)      { window.alert('اختر مرحلة أولاً.');          return; }

  localStorage.setItem('imageGameTeamNameA',  teamAName);
  localStorage.setItem('imageGameTeamNameB',  teamBName);
  localStorage.setItem('imageGameTemplateId', selectedTemplateId);
  window.location.href = 'imageGame.html';
}

startButton.addEventListener('click', saveAndStart);
loadLevels();

startButton.addEventListener('click', saveAndStart);

loadLevels();
