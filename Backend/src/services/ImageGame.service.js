const Team = require("../models/Team");

const submitAnswer = async (sessionId, teamId, answer) => {
  const game = await ImageGame.findOne({ sessionId });
  const round = game.rounds[game.currentRound];

  if (answer.toLowerCase() === round.answer.toLowerCase()) {
    round.claimedBy = teamId;
    round.status = "correct";

    await Team.findByIdAndUpdate(teamId, {
      $inc: { score: 1 }
    });

  } else {
    round.status = "skipped";
  }

  game.currentRound += 1;

  if (game.currentRound >= game.rounds.length) {
    game.status = "finished";
    await GameSession.findByIdAndUpdate(sessionId, {
      status: "finished",
      finishedAt: new Date()
    });
  }

  return await game.save();
};