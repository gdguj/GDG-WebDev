const express = require('express');
const { createGame, getGameById, getMyGames, getCommunityGames, deleteGame } = require('../controllers/customGame.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', requireAuth, createGame);
router.get('/community', getCommunityGames);
router.get('/mine', requireAuth, getMyGames);
router.delete('/:gameId', requireAuth, deleteGame);
router.get('/:gameId', getGameById);


module.exports = router;
