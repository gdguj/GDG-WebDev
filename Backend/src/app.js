const express = require("express");
const cors = require("cors");

const familyFeudRoutes = require("./routes/familyFeud.routes");
const customGameRoutes = require("./routes/customGame.routes");
const wordGridRoutes = require("./routes/wordGrid.routes");
const gameSessionRoutes = require("./routes/gameSession.routes");
const authRoutes = require("./routes/auth.routes");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

// Disable caching on API responses to avoid 304 Not Modified issues
app.use('/api', (req, res, next) => {
	res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	res.set('Pragma', 'no-cache');
	res.set('Expires', '0');
	res.set('Surrogate-Control', 'no-store');
	next();
});

app.use("/api/family-feud", familyFeudRoutes);
app.use("/api/custom-games", customGameRoutes);
app.use("/api", wordGridRoutes);
app.use("/api", gameSessionRoutes);
app.use("/api/multiplayer", gameSessionRoutes);
app.use("/", gameSessionRoutes);
app.use("/api/auth", authRoutes);

// Error middleware
app.use(errorMiddleware);

module.exports = app;