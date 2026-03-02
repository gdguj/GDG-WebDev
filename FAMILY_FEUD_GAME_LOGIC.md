# Family Feud Game Logic - Complete Documentation

## Overview

This document describes the complete Family Feud game logic implementation, including game rules, API endpoints, and how questions are managed.

---

## Game Rules (Implemented)

### Basic Setup
- **Two Teams**: Team 1 (الفريق أ) and Team 2 (الفريق ب)
- **One Question per Round**: Exactly 10 answers, each with point values (1-100)
- **Duration**: 45 seconds per team's turn

### Game Flow

#### Round Start
1. **Team 1 starts answering** the question
2. Team 1 can make up to **3 wrong attempts**
3. For each correct answer, Team 1 earns the points associated with that answer

> ⏱️ When the third wrong attempt occurs, the timer is reset to 45 seconds for the stealing team.

#### When Team 1 Gets 3 Wrong Answers
1. Team 1's turn ends immediately
2. **Steal Mode activates**: Team 2 now has ONE attempt to answer from the SAME question
3. Team 2 has the remaining 45 seconds (or whatever's left on timer)

#### Team 2 Steal Attempt  
- If Team 2 guesses **ANY correct answer**: They **steal ALL remaining unrevealed answers' points**
- If Team 2 guesses **wrong**: The original Team 1 keeps the points  they earned
- The round ends and the next question is generated

#### Round Ends When
1. All 10 answers are revealed
2. Team 2 steals (after getting one answer right during steal mode)
3. Time runs out during Team 2's steal attempt

#### Timer Behavior
- **45 seconds per question** (for both teams combined).
- When time expires:
  - If **not** in steal mode: the current team gains a strike; if this was the third strike, steal mode activates and the timer is reset to 45 s for the opposing team.
  - If **in** steal mode: the steal attempt is considered a failure, the round ends immediately and the original team keeps all its points.
- Once a round ends (whether through regular answers, a successful or failed steal, or even a network error), the timer stops completely – it won’t count down again until the players click the **بدء جولة جديدة** button.
- Network/parsing errors during a steal are treated as a steal failure as well, ensuring Team B cannot continue guessing after an error.

---

## API Endpoints

### 1. **POST /api/ai/family-feud/start-round**
Starts a completely new round with a fresh question from Gemini API.

**Response:**
```json
{
  "success": true,
  "round": {
    "question": "اسم السؤال",
    "answers": [
      { "answer": "الإجابة 1", "points": 98, "revealed": false },
      { "answer": "الإجابة 2", "points": 92, "revealed": false },
      ...
    ],
    "currentTeam": "team1",
    "wrongAttempts": 0,
    "roundScore": 0,
    "isStealMode": false,
    "originalTeam": null
  },
  "fallback": false
}
```

### 2. **GET /api/ai/family-feud/round-state**
Gets the current round state (useful after refreshing the page).

**Response:**
```json
{
  "question": "...",
  "answers": [...],
  "currentTeam": "team1",
  "wrongAttempts": 0,
  "roundScore": 25,
  "isStealMode": false,
  "originalTeam": null
}
```

### 3. **POST /api/ai/family-feud/submit-answer**
Submit an answer and update the game state automatically. The JSON response may include additional fields:
- `stealFailed`: true if a stealing team answered wrong (round ends immediately).
- `originalTeam`: id of the team that initiated the round (used when stealFailed to award points).


**Request Body:**
```json
{
  "answer": "الإجابة المدخلة من المستخدم"
}
```

**Response (Correct Answer):**
```json
{
  "success": true,
  "correct": true,
  "answer": "الإجابة الصحيحة",
  "points": 98,
  "roundScore": 98,
  "roundState": { ... }
}
```

**Response (Wrong Answer):**
```json
{
  "success": true,
  "correct": false,
  "message": "إجابة خاطئة (1/3)",
  "wrongAttempts": 1,
  "stealModeActivated": false,
  "currentTeam": "team1",
  "roundState": { ... }
}
```

### 4. **PUT /api/ai/family-feud/update-team**
Manually switch teams (usually not needed - used for debugging).

---

## Question Storage & Management

### File Structure
Questions are stored as JSON files in the backend root directory:

1. **family_feud_cs_ar.json** - Legacy question storage (fallback from API)
2. **family_feud_current_round.json** - Current round's question (latest from Gemini)
3. **family_feud_round_state.json** - Current game state (answers, points, turns, etc.)

Fallback questions are simple general items and no longer include the question word itself; validation now rejects answers that duplicate the question text, and the ai call will always attempt to generate a fresh new question (previous round state is no longer reused).

### Question Format
```json
{
  "question": "اسم السؤال باللغة العربية",
  "answers": [
    {
      "answer": "الإجابة الأولى",
      "points": 98
    },
    {
      "answer": "الإجابة الثانية",
      "points": 92
    },
    ...
  ]
}
```

### Rules for Questions
- ✅ Must be in **Arabic only**
- ✅ **Exactly 10 answers** per question are now required by the validation logic.
- ✅ Points must be **integers from 1 to 100**
- ✅ Points should reflect popularity (highest first, typically)

---

## Frontend State Management

### Game State Object (survey-game.js)
```javascript
let gameState = {
  question: "...",              // Current question text
  answers: [                    // Array of 5–8 answer objects
    {
      answer: "...",
      points: 98,
      revealed: false           // Toggle when answer is guessed
    }
  ],
  currentTeam: "team1",         // "team1" or "team2"
  wrongAttempts: 0,             // 0-3 (for Team 1) or 0-1 (for Team 2 in steal)
  roundScore: 0,                // Points accumulated in current round
  isStealMode: false,           // true when Team 2 is attempting to steal
  originalTeam: null            // Which team had wrong attempts
};

let teamScores = {
  team1: 0,                     // Total score for Team 1
  team2: 0                      // Total score for Team 2
};
```

### Key Functions

#### `startNewRound()`
- Calls `POST /api/ai/family-feud/start-round`
- Resets all round-specific state
- Generates a brand new question
- **Called automatically** when page loads or round ends

#### `submitAnswer()`
- Gets user input
- Calls `POST /api/ai/family-feud/submit-answer`
- Updates local state based on server response
- Updates UI accordingly

#### `handleCorrectAnswer(result)`
- Updates `roundScore`
- Marks answer as `revealed`
- If all answers revealed → end round
- If steal happened → steal all remaining points

#### `handleWrongAnswer(result)`
- Increments `wrongAttempts`
- If `wrongAttempts >= 3` → activate steal mode
- Switch to Team 2

#### `handleStealSuccess()`
- Awards all remaining points to Team 2
- Adds to `teamScores.team2`
- Starts a new round

---

## Important: NOT Generating New Questions Mid-Round

**KEY RULE**: The question stays the SAME throughout the entire round, even when:
- Team 1 gets 3 wrong answers
- Steal mode activates
- Team 2 is attempting to steal

A **NEW question is only generated when**:
1. Page first loads
2. Round ends (either all answers revealed or a steal happens) **and** the user clicks the new‑round button
3. User explicitly requests a new round via the button

This is enforced by:
- ❌ `submitAnswer()` does NOT fetch a new question
- ❌ `handleWrongAnswer()` does NOT fetch a new question
- ✅ Only `startNewRound()` calls the API to generate a new question

---

## Example Game Flow

### Question Size
The implementation requires **10 answers** for each question. (Legacy data sometimes used 10, so the change restores the original rule.)

### Round Display
The frontend shows the current round number above the question, updating each round.

#### Game Length
The current implementation plays **2 rounds** only. After two rounds the game ends and the team with the higher score is declared winner. This limit is controlled by `maxRounds` in the frontend.

### Scenario: Team 1 Wrong, Team 2 Steals

1. **Page Load**: `startNewRound()` → Question: "اذكر لغة برمجة"
2. **Team 1 Answers**:
   - Submits "Python" → ✅ Correct, earns 98 points
   - Submits "Java" → ✅ Correct, earns 92 points
   - Submits "Ruby" → ❌ Wrong (1/3)
   - Submits "C++" → ❌ Wrong (2/3)
   - Submits "TypeScript" → ❌ Wrong (3/3)
3. **Steal Mode Activated**:
   - Team 1's accumulated points: 98 + 92 = 190
   - Team 2 now has ONE attempt to answer
4. **Team 2 Steals**:
   - Submits "JavaScript" → ✅ Correct!
   - Team 2 steals ALL remaining points: 190 + all unrevealed answers
   - Round ends, new question generated

### Scenario: All Answers Revealed

1. **Page Load**: `startNewRound()` → New question
2. **Team 1 Answers**:
   - Gets 5 answers right without 3 strikes
3. **Team 1 Continues** (no steal mode):
   - Gets remaining 5 answers
4. **All 10 answers revealed** → Round ends
5. Team 1 keeps all 290 points
6. New question generated

---

## Debugging & Status Checking

### Check Current Round State (via Browser Console)
```javascript
// Get current game state
console.log(gameState);
console.log(teamScores);

// Manually fetch latest state from server
fetch('http://localhost:5000/api/ai/family-feud/round-state')
  .then(r => r.json())
  .then(data => console.log(data));
```

### Server Logs
The backend logs Gemini API calls and file operations:
```
✅ تم توليد سؤال جديد من Gemini
⚠️ استخدام بيانات افتراضية (Fallback)
✅ تم استخدام السؤال المحفوظ السابق
```

---

## Configuration & Customization

### Question Requirements
- Questions should be **general** and **not tied to a specific academic subject**.
- Answers ought to be **true, clear, and obvious** to survey participants. Normalization ignores common orthographic variants such as final "ة" vs. "ه".
- Exactly **10 answers** are required; duplicates are not allowed.
- Answers must **not repeat the question itself** (validation rejects any answer equal to the normalized question text).

### Change Question Topic
Edit `Backend/src/services/gemini.service.js`:
```javascript
const PROMPT = `
Generate a Family Feud style question about TOPIC_NAME
(covering topics like ...)
...
`;
```

### Change Points Range
Edit `Backend/src/utils/validateJSON.js`:
```javascript
if (!Number.isInteger(a.points) || a.points < 1 || a.points > 100) {
  // Change the 1 and 100 values
}
```

### Change Timer Duration
Edit `JS/survey-game.js`:
```javascript
let timeLeft = 45;  // Change this to desired seconds
```

---

## Troubleshooting

### "Error in loading question"
1. Check if Gemini API key is set in `.env`
2. Check if `family_feud_current_round.json` exists
3. Check browser console for specific error message

### Same question appears twice
- This is expected! the backend reuses questions if Gemini fails
- Delete `family_feud_current_round.json` to force a new question

### Team scores not updating
- Check if "Team 1 keeps points from before steal" is intended behavior
- Currently: Team 1 does NOT keep their points; steal gives Team 2 ALL unrevealed points

### Answer matching issues
- The system normalizes Arabic text (removes diacritics, ال prefix, etc.)
- If "الذكاء الاصطناعي" doesn't match "ذكاء اصطناعي", check normalization logic

---

## Files Modified

1. ✅ `Backend/src/models/GameSession.js` - Added familyFeudRound state tracking
2. ✅ `Backend/src/controllers/ai.controller.js` - Added new game logic endpoints
3. ✅ `Backend/src/routes/ai.routes.js` - Mapped new endpoints
4. ✅ `JS/survey-game.js` - Complete rewrite with proper game logic

## Files Created
- `FAMILY_FEUD_GAME_LOGIC.md` (this file)

---

## Next Steps

### To Test the Game:
1. Start backend: `npm start` in `Backend/` directory
2. Open `http://localhost:5000/survey-game.html`
3. Play the game and watch the server logs

### To Add More Features:
- [ ] Persistent database (MongoDB) for scores
- [ ] Round / game number tracking
- [ ] Team names customization
- [ ] Multiple game sessions
- [ ] Export results to JSON

---

**Last Updated**: March 3, 2026
**Status**: ✅ Core game logic complete and tested
