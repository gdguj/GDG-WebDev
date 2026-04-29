const Session = require("../models/GameLobby");

async function createSession(gameId) {
  // توليد كود من 6 خانات (أرقام وحروف)
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const newSession = await Session.create({
    gameId: gameId,
    joinCode: joinCode
  });
  
  return newSession;
}

async function getSessionByCode(joinCode) {
  return Session.findOne({ joinCode: joinCode.toUpperCase() }).populate("gameId");
}

module.exports = { createSession, getSessionByCode };