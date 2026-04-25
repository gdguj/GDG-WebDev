const express = require('express');
const { createGame, getGameById, getMyGames } = require('../controllers/customGame.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', createGame);
router.get('/mine', requireAuth, getMyGames);
router.get('/:gameId', getGameById);

module.exports = router;
