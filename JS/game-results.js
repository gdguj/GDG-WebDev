const defaultResult = {
  winnerName: 'الفريق الأزرق',
  winnerScore: 0,
  winnerWords: 0,
  blue: { name: 'الفريق الأزرق', pts: 0, words: 0 },
  green: { name: 'الفريق الأخضر', pts: 0, words: 0 },
  winningRule: 'مسار متصل من جهة إلى الجهة المقابلة'
};

function loadLetterCellResult() {
  try {
    const raw = sessionStorage.getItem('letterCellGameResult');
    return raw ? { ...defaultResult, ...JSON.parse(raw) } : defaultResult;
  } catch (error) {
    console.error('Failed to load game result:', error);
    return defaultResult;
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

const result = loadLetterCellResult();

setText('results-heading-label', 'نتيجة المباراة');
setText('results-congrats-text', 'مبروووك!');
setText('winner-text-label', 'الفائز:');
setText('winner-name', result.winnerName);
setText('score-line-label', 'النقاط:');
setText('winner-score', result.winnerScore);
setText('score-line-suffix', result.winnerScore === 1 ? 'نقطة' : 'نقاط');
setText('stats-title-text', 'إحصائيات المباراة');
setText('stat-total-words', `الخلايا التي كسبها الفريق الفائز: ${result.winnerWords}`);
setText('stat-winning-rule', `شرط الفوز: ${result.winningRule}`);
setText('stat-blue-score', `${result.blue.name}: ${result.blue.pts} نقطة`);
setText('stat-green-score', `${result.green.name}: ${result.green.pts} نقطة`);
setText('results-blue-name', result.blue.name);
setText('results-blue-points', result.blue.pts);
setText('results-green-name', result.green.name);
setText('results-green-points', result.green.pts);
setText('play-again-btn', 'العب مرة أخرى');
setText('back-home-btn', 'العودة للرئيسية');

const playAgainButton = document.getElementById('play-again-btn');
if (playAgainButton) {
  playAgainButton.addEventListener('click', () => {
    sessionStorage.removeItem('letterCellGameResult');
    window.location.href = 'LetterCellGame.html';
  });
}

const backHomeButton = document.getElementById('back-home-btn');
if (backHomeButton) {
  backHomeButton.addEventListener('click', () => {
    window.location.href = 'main page.html';
  });
}
