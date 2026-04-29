document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');
    const startLobbyBtn = document.getElementById('startLobbyBtn');
    const lobbyModal = document.getElementById('lobbyModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // 1. جلب بيانات اللعبة
    async function loadGameDetails() {
        if (!gameId) return;
        try {
            const response = await fetch(`/api/custom-games/${gameId}`);
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('gameTitle').textContent = result.game.title;
                const list = document.getElementById('questionsList');
                const questions = result.game.data.questions || [];
                
                list.innerHTML = questions.map((q, i) => `
                    <div class="question-item">
                        <strong>سؤال ${i + 1}:</strong> 
                        <p>${q.question || q.text || 'محتوى السؤال هنا...'}</p>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error("خطأ في التحميل:", err);
        }
    }

    // 2. إنشاء اللوبي
    startLobbyBtn.onclick = async () => {
        try {
            const response = await fetch('/api/lobby/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: gameId })
            });
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('displayCode').textContent = data.joinCode;
                lobbyModal.style.display = 'block';
            }
        } catch (err) {
            alert("فشل إنشاء الغرفة، تأكد من اتصال السيرفر");
        }
    };

    closeModalBtn.onclick = () => lobbyModal.style.display = 'none';

    loadGameDetails();
});