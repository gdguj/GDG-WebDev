const mongoose = require("mongoose");
const UserGame = require("../models/UserGame.model");

function parseMongoId(id, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`${fieldName} is invalid`);
  }
  return new mongoose.Types.ObjectId(id);
}

async function saveCustomGame(gamePayload) {
  const rawUserId = String(gamePayload.createdBy.userId || "").trim();
  const userIdValue = mongoose.Types.ObjectId.isValid(rawUserId)
    ? new mongoose.Types.ObjectId(rawUserId)
    : null;

  const createdBy = {
    userId: userIdValue,
    accountId: rawUserId,
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
  const parsedId = parseMongoId(gameId, "gameId");
  return UserGame.findById(parsedId).lean();
}

async function findGamesByCreator(creator, options = {}) {
  const userId = String((creator && creator.id) || "").trim();
  const email = String((creator && creator.email) || "").trim().toLowerCase();
  const gameType = String(options.gameType || "").trim();

  const creatorMatches = [];

  if (userId) {
    creatorMatches.push({ "createdBy.accountId": userId });

    if (mongoose.Types.ObjectId.isValid(userId)) {
      creatorMatches.push({ "createdBy.userId": new mongoose.Types.ObjectId(userId) });
    }
  }

  if (email) {
    creatorMatches.push({ "createdBy.email": email });
  }

  if (!creatorMatches.length) {
    throw new Error("createdBy.accountId is invalid");
  }

  const query = {
    isCustom: true,
    $or: creatorMatches,
  };

  if (gameType) {
    query.gameType = gameType;
  }

  return UserGame.find(query)
    .sort({ createdAt: -1 })
    .select("_id gameType title description createdAt createdBy data")
    .lean();
}

async function findAllCommunityGames(options = {}) {
  const gameType = String(options.gameType || "").trim();

  const query = {};

  if (gameType) {
    query.gameType = gameType;
  }

  return UserGame.find(query)
    .sort({ createdAt: -1 })
    .select("_id gameType title description createdAt createdBy data")
    .lean();
}

module.exports = {
  saveCustomGame,
  findGameById,
  findGamesByCreator,
  findAllCommunityGames,
};
