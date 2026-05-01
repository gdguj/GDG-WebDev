const Session = require("../models/Session.model");

async function createSession(gameId) {
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const newSession = await Session.create({
    sessionId: `lobby_${joinCode}`,
    status: "lobby",
    gameId,
    joinCode,
    expiresAt,
  });

  return newSession;
}

async function getSessionByCode(joinCode) {
  return Session.findOne({
    joinCode: joinCode.toUpperCase(),
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).populate("gameId");
}

module.exports = { createSession, getSessionByCode };