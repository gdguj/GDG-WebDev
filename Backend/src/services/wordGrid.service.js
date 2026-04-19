const Session = require("../models/Session.model");
const GameTemplate = require("../models/GameTemplate.model");
const { nanoid } = require("nanoid");

exports.submitAnswer = async (sessionId, team, answer, letter, playerName) => {
    try {
        // 1. البحث عن الجلسة
        const session = await Session.findOne({ sessionId });
        if (!session) throw new Error("الجلسة غير موجودة!");

        // 2. البحث عن الخلية بناءً على الحرف
        const cell = session.cells.find(c => c.letter === letter);
        if (!cell) throw new Error("الخلية غير موجودة!");

        // 3. التحقق من المحاولات السابقة
        if (cell.attempts && cell.attempts.includes(playerName)) {
            throw new Error("already_attempted");
        }
        
        // 4. تسجيل المحاولة
        if (!cell.attempts) cell.attempts = [];
        cell.attempts.push(playerName);

        // 5. جلب القالب من GameTemplate
        const template = await GameTemplate.findOne({ gameType: "letter_cells" }); 

        if (!template) {
           console.log("صدمة: حتى بالبحث المباشر القالب مو موجود!");
            throw new Error("القالب غير موجود في الداتابيس!");}
        
        // 6. البحث عن السؤال الصحيح من القالب
        const originalQuestion = template.data.questions.find(q => q.letter === letter);
        if (!originalQuestion) throw new Error("السؤال غير موجود!");

        // 7. التحقق من الإجابة (المقارنة مع الإجابة من GameTemplate)
        const isCorrect = answer.trim().toLowerCase() === originalQuestion.answer.trim().toLowerCase();

        if (isCorrect) {
            cell.status = "correct";
            cell.claimedBy = team;
            
            // تحديث النقاط
            if (!session.teams[team].score) session.teams[team].score = 0;
            session.teams[team].score += 4;
            
            if (!session.teams[team].words) session.teams[team].words = 0;
            session.teams[team].words += 1;
        }

        // 8. حفظ الجلسة المحدثة
        await session.save();

        return { 
            correct: isCorrect, 
            points: session.teams[team].score,
            playerName: playerName,
            letter: letter
        };
    } catch (error) {
        throw error;
    }
};
exports.createSession = async (gameType, greenName, blueName) => {
    try {
        const template = await GameTemplate.findOne({ gameType: gameType });
        if (!template) throw new Error(`لم يتم العثور على اللعبة: ${gameType}`);

        const myQuestions = template.data.questions; // هذي أسئلتك الـ 3 (أو أي عدد عندك)
        const totalCells = 25; // حجم الشبكة الثابت
        const cells = [];

        for (let i = 0; i < totalCells; i++) {
            if (i < myQuestions.length) {
               
                const q = myQuestions[i];
                cells.push({
                    id: `cell_${i}`,
                    letter: q.letter,      
                    questionText: q.question, 
                    answer: q.answer,
                    status: "empty",
                    attempts: []
                });
            } else {
                cells.push({
                    id: `cell_${i}`,
                    letter: "", 
                    questionText: "",
                    status: "hidden", 
                    attempts: []
                });
            }
        }

        const session = await Session.create({
            sessionId: nanoid(8),
            gameType: gameType,
            status: "active",
            nowPlaying: "green",
            turnEndsAt: new Date(Date.now() + 60 * 1000),
            teams: {
                green: { name: greenName || "Green Team", score: 0 },
                blue: { name: blueName || "Blue Team", score: 0 }
            },
            cells: cells
        });

        return session;
    } catch (error) {
        throw error;
    }
};