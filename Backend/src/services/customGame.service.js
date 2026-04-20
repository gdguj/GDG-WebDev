const mongoose = require("mongoose");
const UserGame = require("../models/UserGame.model");

function parseObjectId(id, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`${fieldName} is invalid`);
  }
  return new mongoose.Types.ObjectId(id);
}

async function saveCustomGame(gamePayload) {
  const createdBy = {
    userId: parseObjectId(gamePayload.createdBy.userId, "createdBy.userId"),
    name: gamePayload.createdBy.name,
    email: gamePayload.createdBy.email,
  };

  const userGame = await UserGame.create({
    gameType: gamePayload.gameType,
    title: gamePayload.title,
    description: gamePayload.description,
    createdBy,
    data: gamePayload.data,
    isCustom: true,
  });

  return {
    gameId: userGame._id,
  };
}

async function findGameById(gameId) {
  const parsedId = parseObjectId(gameId, "gameId");
  return UserGame.findById(parsedId).lean();
}

module.exports = {
  saveCustomGame,
  findGameById,
};
