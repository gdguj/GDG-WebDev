const mongoose = require("mongoose");

const gameLobbySchema = new mongoose.Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserGame",
    required: true,
  },
  joinCode: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: '2h' }, // ينحذف الكود بعد ساعتين
  },
});

module.exports = mongoose.model("GameLobby", gameLobbySchema);