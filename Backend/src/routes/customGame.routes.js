const express = require('express');
const { createGame, getGameById } = require('../controllers/customGame.controller');

const router = express.Router();

router.post('/', createGame);
router.get('/:gameId', getGameById);

module.exports = router;
