const startButton = document.getElementById('surveyGameStartBtn');
const levelsGrid = document.getElementById('levelsGrid');
const levelsDots = document.getElementById('levelsDots');
const prevBtn = document.getElementById('levelsPrev');
const nextBtn = document.getElementById('levelsNext');

const PAGE_SIZE = 6;
let allTemplates = [];
let currentPage = 0;
let selectedTemplateId = null;

function updateStartButton() {
  startButton.disabled = !selectedTemplateId;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function selectLevel(card, id) {
  levelsGrid.querySelectorAll('.level-card').forEach((item) => item.classList.remove('selected'));
  card.classList.add('selected');
  selectedTemplateId = id;
  updateStartButton();
}

function renderPage(page) {
  currentPage = page;
  const totalPages = Math.ceil(allTemplates.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const slice = allTemplates.slice(start, start + PAGE_SIZE);

  levelsGrid.innerHTML = '';
  slice.forEach((template, index) => {
    const globalIndex = start + index;
    const questionCount = Array.isArray(template.data?.questions) ? template.data.questions.length : 0;
    const card = document.createElement('div');
    card.className = 'level-card' + (template._id === selectedTemplateId ? ' selected' : '');
    card.dataset.id = template._id;
    card.innerHTML = `
      <div class="level-number">المرحلة ${globalIndex + 1}</div>
      <div class="level-title">${escapeHtml(template.title || 'بدون عنوان')}</div>
      <div class="level-desc">${escapeHtml(template.description || '')}</div>
      <div class="level-meta">📋 ${questionCount} سؤال</div>
    `;
    card.addEventListener('click', () => selectLevel(card, template._id));
    levelsGrid.appendChild(card);
  });

  levelsDots.innerHTML = '';
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const dot = document.createElement('span');
    dot.className = 'levels-dot' + (pageIndex === page ? ' active' : '');
    dot.addEventListener('click', () => renderPage(pageIndex));
    levelsDots.appendChild(dot);
  }

  prevBtn.disabled = page === 0;
  nextBtn.disabled = page >= totalPages - 1;
}

async function loadLevels() {
  try {
    const response = await fetch('/api/games/templates?gameType=survey_game');
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'فشل جلب المراحل');
    }

    allTemplates = Array.isArray(result.data) ? result.data : [];
    if (!allTemplates.length) {
      levelsGrid.innerHTML = '<div class="levels-error">لا توجد مراحل متاحة حالياً.</div>';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const savedTemplateId = localStorage.getItem('surveyTemplateId');
    if (savedTemplateId) {
      selectedTemplateId = savedTemplateId;
      const savedIndex = allTemplates.findIndex((template) => template._id === savedTemplateId);
      if (savedIndex !== -1) {
        currentPage = Math.floor(savedIndex / PAGE_SIZE);
      }
    }

    renderPage(currentPage);
    updateStartButton();
  } catch (error) {
    levelsGrid.innerHTML = `<div class="levels-error">تعذّر تحميل المراحل: ${escapeHtml(error.message)}</div>`;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  }
}

function saveAndStart() {
  if (!selectedTemplateId) {
    window.alert('اختر مرحلة أولاً.');
    return;
  }

  localStorage.setItem('surveyTemplateId', selectedTemplateId);
  window.location.href = 'wheelPage.html?next=survey-game.html';
}

prevBtn.addEventListener('click', () => renderPage(currentPage - 1));
nextBtn.addEventListener('click', () => renderPage(currentPage + 1));
startButton.addEventListener('click', saveAndStart);

loadLevels();