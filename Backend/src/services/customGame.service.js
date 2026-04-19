const CustomGame = require('../models/CustomGame');

/**
 * Generate a short, unique Game ID.
 * Returns a 6-character uppercase alphanumeric string.
 */
async function generateUniqueGameId() {
  const maxAttempts = 10;
  let attempt = 0;
  let gameId;

  while (attempt < maxAttempts) {
    gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existing = await CustomGame.findOne({ gameId }).lean();
    if (!existing) {
      return gameId;
    }
    attempt += 1;
  }

  throw new Error('Unable to generate a unique Game ID. Please try again.');
}

/**
 * Save a new custom game to MongoDB.
 * Generates and returns the Game ID.
 */
async function saveCustomGame(gamePayload) {
  const gameId = await generateUniqueGameId();

  const customGame = new CustomGame({
    ...gamePayload,
    gameId
  });

  const savedGame = await customGame.save();

  return {
    gameId: savedGame.gameId
  };
}

/**
 * Lookup a custom game by Game ID.
 */
async function findGameById(gameId) {
  const normalizedGameId = String(gameId).trim().toUpperCase();
  return CustomGame.findOne({ gameId: normalizedGameId }).lean();
}

module.exports = {
  generateUniqueGameId,
  saveCustomGame,
  findGameById
};
