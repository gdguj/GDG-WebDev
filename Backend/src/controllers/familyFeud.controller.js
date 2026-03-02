const mongoose = require("mongoose");
const GameSession = require("../models/GameSession");
const Team = require("../models/Team");

/**
 * POST /family-feud/session
 * body: { team1Name, team2Name }
 * Creates:
 *  - GameSession(game="familyFeud", status="waiting")
 *  - 2 Team docs linked by sessionId
 *  - stores team ids in session.teams
 */
exports.createSession = async (req, res) => {
  try {
    const { team1Name, team2Name } = req.body || {};

    if (!team1Name?.trim() || !team2Name?.trim()) {
      return res.status(400).json({
        error: "team1Name and team2Name are required",
      });
    }

    const session = await GameSession.create({
      game: "familyFeud",
      status: "waiting",
      winner: null,
      finishedAt: null,
    });

    const team1 = await Team.create({
      name: team1Name.trim(),
      score: 0,
      sessionId: session._id,
    });

    const team2 = await Team.create({
      name: team2Name.trim(),
      score: 0,
      sessionId: session._id,
    });

    session.teams = [team1._id, team2._id];
    await session.save();

    return res.status(201).json({
      sessionId: session._id,
      game: session.game,
      status: session.status,
      teams: [
        { _id: team1._id, name: team1.name, score: team1.score },
        { _id: team2._id, name: team2.name, score: team2.score },
      ],
      createdAt: session.createdAt,
      finishedAt: session.finishedAt,
      winner: session.winner,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /family-feud/session/:id
 * Returns session + populated teams
 */
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const session = await GameSession.findById(id).populate("teams").populate("winner");
    if (!session) return res.status(404).json({ error: "Session not found" });

    return res.json({
      _id: session._id,
      game: session.game,
      status: session.status,
      createdAt: session.createdAt,
      finishedAt: session.finishedAt,
      winner: session.winner
        ? { _id: session.winner._id, name: session.winner.name, score: session.winner.score }
        : null,
      teams: (session.teams || []).map((t) => ({
        _id: t._id,
        name: t.name,
        score: t.score,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * POST /family-feud/session/:id/finish
 * body: { winnerTeamId }
 * Updates:
 *  - status="finished"
 *  - winner=winnerTeamId
 *  - finishedAt=now
 */
exports.finishGame = async (req, res) => {
  try {
    const { id } = req.params;
    const { winnerTeamId } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid session id" });
    }
    if (!mongoose.isValidObjectId(winnerTeamId)) {
      return res.status(400).json({ error: "Invalid winnerTeamId" });
    }

    const session = await GameSession.findById(id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Prevent finishing twice
    if (session.status === "finished") {
      return res.status(409).json({ error: "Session already finished" });
    }

    // Ensure winner belongs to this session
    const winnerBelongs = (session.teams || []).some(
      (tid) => String(tid) === String(winnerTeamId)
    );
    if (!winnerBelongs) {
      return res.status(400).json({ error: "winnerTeamId is not part of this session" });
    }

    session.status = "finished";
    session.winner = winnerTeamId;
    session.finishedAt = new Date();
    await session.save();

    return res.json({
      message: "Game finished",
      sessionId: session._id,
      status: session.status,
      winner: session.winner,
      finishedAt: session.finishedAt,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};