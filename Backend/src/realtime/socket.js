const { Server } = require("socket.io");

let ioInstance = null;

function initSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH"],
    },
  });

  ioInstance.on("connection", (socket) => {
    socket.on("session:subscribe", ({ joinCode, sessionId }) => {
      if (joinCode) {
        socket.join(`joinCode:${String(joinCode).trim().toUpperCase()}`);
      }
      if (sessionId) {
        socket.join(`session:${String(sessionId).trim()}`);
      }
    });

    socket.on("session:unsubscribe", ({ joinCode, sessionId }) => {
      if (joinCode) {
        socket.leave(`joinCode:${String(joinCode).trim().toUpperCase()}`);
      }
      if (sessionId) {
        socket.leave(`session:${String(sessionId).trim()}`);
      }
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

function emitSessionEvent(eventName, session) {
  if (!ioInstance || !session) {
    return;
  }

  const sessionPayload = typeof session.toObject === "function" ? session.toObject() : session;
  const joinCode = String(sessionPayload.joinCode || "").toUpperCase();
  const sessionId = String(sessionPayload._id || "");

  ioInstance.to(`joinCode:${joinCode}`).emit(eventName, sessionPayload);
  ioInstance.to(`session:${sessionId}`).emit(eventName, sessionPayload);
}

module.exports = {
  initSocket,
  getIO,
  emitSessionEvent,
};
